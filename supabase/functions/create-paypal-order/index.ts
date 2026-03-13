import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { createPayPalOrder } from "../_shared/paypal.ts";
import { assertPurchasable, createPurchaseRecord, getActiveProduct } from "../_shared/store.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { productId, returnPath = "/store" } = await req.json();

    if (!productId || typeof productId !== "string") {
      throw new Error("productId is required.");
    }

    const origin = req.headers.get("origin") ?? "http://localhost:8080";
    const admin = createAdminClient();
    const product = await getActiveProduct(admin, productId);
    await assertPurchasable(admin, user.id, product);

    if (!product.price_usd) {
      throw new Error("This item is not available for PayPal checkout.");
    }

    const purchaseId = await createPurchaseRecord(admin, user.id, product, {
      status: "created",
      currency: "USD",
      unitAmount: product.price_usd,
    });

    const returnUrl = new URL(returnPath, origin);
    returnUrl.searchParams.set("checkout", "paypal");
    returnUrl.searchParams.set("purchase", purchaseId);
    returnUrl.searchParams.set("product", product.id);

    const cancelUrl = new URL(returnPath, origin);
    cancelUrl.searchParams.set("checkout", "cancelled");
    cancelUrl.searchParams.set("product", product.id);

    const order = await createPayPalOrder({
      name: String(product.metadata?.name ?? product.id),
      description: String(product.metadata?.description ?? "Puzzle Rivals purchase"),
      orderId: purchaseId,
      amountUsd: product.price_usd,
      returnUrl: returnUrl.toString(),
      cancelUrl: cancelUrl.toString(),
    }) as {
      id: string;
      links?: Array<{ rel: string; href: string }>;
    };

    const { error: purchaseError } = await admin
      .from("purchases")
      .update({
        paypal_order_id: order.id,
        status: "approved",
      })
      .eq("id", purchaseId);

    if (purchaseError) throw purchaseError;

    const approvalUrl = order.links?.find((entry) => entry.rel === "approve")?.href;
    if (!approvalUrl) {
      throw new Error("PayPal approval URL was not returned.");
    }

    return Response.json({ approvalUrl }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to start PayPal checkout." },
      { status: 400, headers: corsHeaders },
    );
  }
});
