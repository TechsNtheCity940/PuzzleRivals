import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { recordPurchaseActivity } from "../_shared/activity.ts";
import {
  applyProductGrant,
  assertPurchasable,
  createPurchaseRecord,
  getActiveProduct,
  getProfileWallet,
  isPrivilegedStoreAccount,
} from "../_shared/store.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { productId } = await req.json();

    if (!productId || typeof productId !== "string") {
      throw new Error("productId is required.");
    }

    const admin = createAdminClient();
    const product = await getActiveProduct(admin, productId);
    const profile = await getProfileWallet(admin, user.id);
    const privileged = await isPrivilegedStoreAccount(admin, user.id, profile);
    await assertPurchasable(admin, user.id, product, profile);

    if (!privileged && !product.price_coins && !product.price_gems) {
      throw new Error("This item must be purchased with PayPal.");
    }

    const nextCoins = profile.coins - (product.price_coins ?? 0);
    const nextGems = profile.gems - (product.price_gems ?? 0);

    if (!privileged && nextCoins < 0) {
      throw new Error("Not enough coins.");
    }

    if (!privileged && nextGems < 0) {
      throw new Error("Not enough gems.");
    }

    if (!privileged) {
      const { error: walletError } = await admin.from("profiles").update({
        coins: nextCoins,
        gems: nextGems,
      }).eq("id", user.id);

      if (walletError) throw walletError;
    }

    await applyProductGrant(admin, user.id, product, privileged ? "owner_comp" : "virtual");
    const currency = privileged ? "OWNER" : (product.price_gems ? "GEMS" : "COINS");
    const amount = privileged ? 0 : (product.price_gems ?? product.price_coins ?? 0);
    const purchaseId = await createPurchaseRecord(admin, user.id, product, {
      currency,
      unitAmount: amount,
    });
    await recordPurchaseActivity(admin, {
      userId: user.id,
      purchaseId,
      product,
      status: "captured",
      currency,
      amount,
    });

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Purchase failed." },
      { status: 400, headers: corsHeaders },
    );
  }
});
