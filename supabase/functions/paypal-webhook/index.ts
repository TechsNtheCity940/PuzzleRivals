import { corsHeaders } from "../_shared/cors.ts";
import { recordPurchaseActivity } from "../_shared/activity.ts";
import {
  applyProductGrant,
  getActiveProduct,
} from "../_shared/store.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  getPayPalWebhookId,
  verifyPayPalWebhookSignature,
} from "../_shared/paypal.ts";

type PayPalEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
  summary?: string;
  create_time?: string;
};

type PurchaseRow = {
  id: string;
  user_id: string;
  paypal_order_id: string | null;
  status: "created" | "approved" | "captured" | "failed" | "refunded";
  amount: number;
  currency: string;
  captured_at: string | null;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function readHeader(req: Request, name: string) {
  return req.headers.get(name) ?? req.headers.get(name.toLowerCase()) ?? "";
}

function extractOrderId(event: PayPalEvent) {
  return (
    event.resource?.supplementary_data?.related_ids?.order_id ??
    event.resource?.id ??
    null
  );
}

async function insertWebhookEvent(
  admin: ReturnType<typeof createAdminClient>,
  event: PayPalEvent,
) {
  const eventId = event.id;
  const eventType = event.event_type;

  if (!eventId || !eventType) {
    throw new Error("PayPal webhook payload is missing id or event_type.");
  }

  const { data: existing, error: lookupError } = await admin
    .from("paypal_webhook_events")
    .select("id, processed_at")
    .eq("paypal_event_id", eventId)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing?.processed_at) {
    return { duplicate: true, rowId: existing.id as string };
  }

  if (existing?.id) {
    return { duplicate: false, rowId: existing.id as string };
  }

  const { data, error } = await admin
    .from("paypal_webhook_events")
    .insert({
      paypal_event_id: eventId,
      event_type: eventType,
      payload: event,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { duplicate: false, rowId: String(data.id) };
}

async function markWebhookProcessed(
  admin: ReturnType<typeof createAdminClient>,
  rowId: string,
) {
  const { error } = await admin
    .from("paypal_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", rowId);

  if (error) throw error;
}

async function loadPurchaseByOrderId(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
) {
  const { data, error } = await admin
    .from("purchases")
    .select("id, user_id, paypal_order_id, status, amount, currency, captured_at")
    .eq("paypal_order_id", orderId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PurchaseRow | null;
}

async function applyCapturedPurchase(
  admin: ReturnType<typeof createAdminClient>,
  purchase: PurchaseRow,
  occurredAt?: string,
) {
  if (purchase.status === "captured") {
    return;
  }

  const { data: purchaseItem, error: itemError } = await admin
    .from("purchase_items")
    .select("product_id")
    .eq("purchase_id", purchase.id)
    .single();

  if (itemError) throw itemError;

  const product = await getActiveProduct(admin, String(purchaseItem.product_id));
  await applyProductGrant(admin, purchase.user_id, product, "paypal_webhook");

  const capturedAt = occurredAt ?? new Date().toISOString();
  const { error: updateError } = await admin
    .from("purchases")
    .update({
      status: "captured",
      captured_at: capturedAt,
    })
    .eq("id", purchase.id);

  if (updateError) throw updateError;

  await recordPurchaseActivity(admin, {
    userId: purchase.user_id,
    purchaseId: purchase.id,
    product,
    status: "captured",
    currency: String(purchase.currency ?? "USD"),
    amount: purchase.amount,
    occurredAt: capturedAt,
  });
}

async function markPurchaseStatus(
  admin: ReturnType<typeof createAdminClient>,
  purchase: PurchaseRow,
  status: PurchaseRow["status"],
  occurredAt?: string,
) {
  const next: Record<string, unknown> = { status };
  if (status === "captured") {
    next.captured_at = occurredAt ?? new Date().toISOString();
  }

  const { error } = await admin
    .from("purchases")
    .update(next)
    .eq("id", purchase.id);

  if (error) throw error;
}

async function handleEvent(
  admin: ReturnType<typeof createAdminClient>,
  event: PayPalEvent,
) {
  const eventType = event.event_type ?? "unknown";
  const orderId = extractOrderId(event);

  if (!orderId) {
    return { ok: true, ignored: true, reason: "no-order-id", eventType };
  }

  const purchase = await loadPurchaseByOrderId(admin, orderId);
  if (!purchase) {
    return { ok: true, ignored: true, reason: "purchase-not-found", eventType, orderId };
  }

  if (eventType === "CHECKOUT.ORDER.APPROVED") {
    if (purchase.status === "created") {
      await markPurchaseStatus(admin, purchase, "approved", event.create_time);
    }
    return { ok: true, eventType, orderId, purchaseId: purchase.id };
  }

  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    await applyCapturedPurchase(admin, purchase, event.create_time);
    return { ok: true, eventType, orderId, purchaseId: purchase.id };
  }

  if (eventType === "PAYMENT.CAPTURE.PENDING") {
    if (purchase.status === "created") {
      await markPurchaseStatus(admin, purchase, "approved", event.create_time);
    }
    return { ok: true, eventType, orderId, purchaseId: purchase.id };
  }

  if (
    eventType === "PAYMENT.CAPTURE.DENIED" ||
    eventType === "CHECKOUT.PAYMENT-APPROVAL.REVERSED"
  ) {
    if (purchase.status !== "captured") {
      await markPurchaseStatus(admin, purchase, "failed", event.create_time);
    }
    return { ok: true, eventType, orderId, purchaseId: purchase.id };
  }

  return { ok: true, ignored: true, reason: "unhandled-event", eventType, orderId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ message: "Method not allowed." }, 405);
  }

  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody) as PayPalEvent;

    const authAlgo = readHeader(req, "PAYPAL-AUTH-ALGO");
    const certUrl = readHeader(req, "PAYPAL-CERT-URL");
    const transmissionId = readHeader(req, "PAYPAL-TRANSMISSION-ID");
    const transmissionSig = readHeader(req, "PAYPAL-TRANSMISSION-SIG");
    const transmissionTime = readHeader(req, "PAYPAL-TRANSMISSION-TIME");

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      return json({ message: "Missing PayPal verification headers." }, 400);
    }

    const verified = await verifyPayPalWebhookSignature({
      authAlgo,
      certUrl,
      transmissionId,
      transmissionSig,
      transmissionTime,
      webhookId: getPayPalWebhookId(),
      webhookEvent: event as Record<string, unknown>,
    });

    if (!verified) {
      return json({ message: "PayPal webhook signature verification failed." }, 400);
    }

    const admin = createAdminClient();
    const inserted = await insertWebhookEvent(admin, event);
    if (inserted.duplicate) {
      return json({ ok: true, duplicate: true });
    }

    const result = await handleEvent(admin, event);
    await markWebhookProcessed(admin, inserted.rowId);

    return json(result);
  } catch (error) {
    return json(
      { message: error instanceof Error ? error.message : "Failed to process PayPal webhook." },
      400,
    );
  }
});
