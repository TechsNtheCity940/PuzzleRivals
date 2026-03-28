import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { getActiveProduct, getProfileWallet, isPrivilegedStoreAccount } from "../_shared/store.ts";

const LOADOUT_COLUMN_BY_KIND: Record<string, string> = {
  theme: "theme_id",
  frame: "frame_id",
  player_card: "player_card_id",
  banner: "banner_id",
  emblem: "emblem_id",
  title: "title_id",
};

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
    const profileColumn = LOADOUT_COLUMN_BY_KIND[product.kind];

    if (!profileColumn) {
      throw new Error("That item cannot be equipped.");
    }

    if (!privileged && product.kind !== "theme" && product.kind !== "frame") {
      const { data: inventoryRow, error: inventoryError } = await admin
        .from("user_inventory")
        .select("product_id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (inventoryError) throw inventoryError;
      if (!inventoryRow) {
        throw new Error("You do not own that item yet.");
      }
    }

    const { error } = await admin.from("profiles").update({
      [profileColumn]: product.id,
    }).eq("id", user.id);

    if (error) throw error;

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Could not equip item." },
      { status: 400, headers: corsHeaders },
    );
  }
});
