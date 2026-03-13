import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { capturePayPalOrder } from "../_shared/paypal.ts";
import { applyProductGrant, assertPurchasable, getActiveProduct } from "../_shared/store.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { purchaseId } = await req.json();

    if (!purchaseId || typeof purchaseId !== "string") {
      throw new Error("purchaseId is required.");
    }

    const admin = createAdminClient();
    const { data: purchase, error: purchaseError } = await admin
      .from("purchases")
      .select("id, user_id, paypal_order_id, status")
      .eq("id", purchaseId)
      .single();

    if (purchaseError) throw purchaseError;
    if (purchase.user_id !== user.id) {
      throw new Error("Unauthorized purchase access.");
    }

    const { data: purchaseItem, error: itemError } = await admin
      .from("purchase_items")
      .select("product_id")
      .eq("purchase_id", purchaseId)
      .single();

    if (itemError) throw itemError;

    const product = await getActiveProduct(admin, String(purchaseItem.product_id));

    if (purchase.status !== "captured") {
      await assertPurchasable(admin, user.id, product);

      if (!purchase.paypal_order_id) {
        throw new Error("PayPal order is missing.");
      }

      await capturePayPalOrder(purchase.paypal_order_id);
      await applyProductGrant(admin, user.id, product, "paypal");

      const { error: updateError } = await admin
        .from("purchases")
        .update({ status: "captured" })
        .eq("id", purchaseId);

      if (updateError) throw updateError;
    }

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to capture PayPal checkout." },
      { status: 400, headers: corsHeaders },
    );
  }
});
