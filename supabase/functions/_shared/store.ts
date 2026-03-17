import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type ProductRow = {
  id: string;
  kind: string;
  price_usd: number | null;
  price_coins: number | null;
  price_gems: number | null;
  metadata: Record<string, unknown> | null;
  active: boolean;
};

type ProfileWalletRow = {
  id: string;
  coins: number;
  gems: number;
  puzzle_shards: number;
  rank_points: number;
  pass_xp: number;
  is_vip: boolean;
  vip_expires_at: string | null;
  has_season_pass: boolean;
  theme_id: string | null;
  frame_id: string | null;
  hint_balance: number;
};

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function isNonConsumable(product: ProductRow) {
  return (
    product.kind === "theme" ||
    product.kind === "frame" ||
    product.kind === "avatar" ||
    product.kind === "player_card" ||
    product.kind === "banner" ||
    product.kind === "emblem" ||
    product.kind === "title" ||
    product.kind === "battle_pass"
  );
}

export async function getActiveProduct(admin: SupabaseClient, productId: string) {
  const { data, error } = await admin
    .from("products")
    .select("id, kind, price_usd, price_coins, price_gems, metadata, active")
    .eq("id", productId)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Product not found.");
  }

  return data as ProductRow;
}

export async function getProfileWallet(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, coins, gems, puzzle_shards, rank_points, pass_xp, is_vip, vip_expires_at, has_season_pass, theme_id, frame_id, hint_balance")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as ProfileWalletRow;
}

export async function assertPurchasable(admin: SupabaseClient, userId: string, product: ProductRow) {
  if (product.kind === "battle_pass") {
    const profile = await getProfileWallet(admin, userId);
    if (profile.has_season_pass) {
      throw new Error("Season pass already unlocked.");
    }
    return;
  }

  if (!isNonConsumable(product)) {
    return;
  }

  const { data, error } = await admin
    .from("user_inventory")
    .select("product_id")
    .eq("user_id", userId)
    .eq("product_id", product.id)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    throw new Error("Item already owned.");
  }
}

async function insertInventoryItem(
  admin: SupabaseClient,
  userId: string,
  productId: string,
  source: string,
) {
  await admin.from("user_inventory").upsert({
    user_id: userId,
    product_id: productId,
    source,
    is_equipped: false,
  });
}

export async function applyProductGrant(
  admin: SupabaseClient,
  userId: string,
  product: ProductRow,
  source: string,
) {
  const metadata = product.metadata ?? {};
  const profile = await getProfileWallet(admin, userId);

  let coins = profile.coins;
  let gems = profile.gems;
  let puzzleShards = profile.puzzle_shards;
  let rankPoints = profile.rank_points;
  let passXp = profile.pass_xp;
  let hintBalance = profile.hint_balance;
  let themeId = profile.theme_id;
  let frameId = profile.frame_id;
  let hasSeasonPass = profile.has_season_pass;
  let isVip = profile.is_vip;
  let vipExpiresAt = profile.vip_expires_at ? new Date(profile.vip_expires_at) : null;

  if (
    product.kind === "theme" ||
    product.kind === "frame" ||
    product.kind === "avatar" ||
    product.kind === "player_card" ||
    product.kind === "banner" ||
    product.kind === "emblem" ||
    product.kind === "title"
  ) {
    await insertInventoryItem(admin, userId, product.id, source);
    if (product.kind === "theme" && !themeId) themeId = product.id;
    if (product.kind === "frame" && !frameId) frameId = product.id;
  }

  if (product.kind === "hint_pack") {
    hintBalance += asNumber(metadata.hint_amount, 0);
  }

  if (product.kind === "bundle") {
    coins += asNumber(metadata.bundle_coins, 0);
    gems += asNumber(metadata.bundle_gems, 0);
    puzzleShards += asNumber(metadata.bundle_shards, 0);
    passXp += asNumber(metadata.bundle_pass_xp, 0);
    for (const itemId of asStringArray(metadata.included_item_ids)) {
      await insertInventoryItem(admin, userId, itemId, source);
    }
  }

  if (product.kind === "battle_pass") {
    hasSeasonPass = true;
  }

  if (product.kind === "vip") {
    const durationDays = asNumber(metadata.vip_duration_days, 30);
    const vipBonusGems = asNumber(metadata.vip_bonus_gems, 0);
    const baseDate = vipExpiresAt && vipExpiresAt.getTime() > Date.now() ? vipExpiresAt : new Date();
    baseDate.setUTCDate(baseDate.getUTCDate() + durationDays);
    vipExpiresAt = baseDate;
    isVip = true;
    gems += vipBonusGems;
  }

  const { error } = await admin.from("profiles").update({
    coins,
    gems,
    puzzle_shards: puzzleShards,
    rank_points: rankPoints,
    pass_xp: passXp,
    hint_balance: hintBalance,
    theme_id: themeId,
    frame_id: frameId,
    has_season_pass: hasSeasonPass,
    is_vip: isVip,
    vip_expires_at: vipExpiresAt ? vipExpiresAt.toISOString() : null,
  }).eq("id", userId);

  if (error) throw error;
}

export async function createPurchaseRecord(
  admin: SupabaseClient,
  userId: string,
  product: ProductRow,
  options?: {
    paypalOrderId?: string;
    status?: string;
    currency?: string;
    unitAmount?: number;
  },
) {
  const unitAmount = options?.unitAmount ??
    product.price_usd ??
    product.price_coins ??
    product.price_gems ??
    0;
  const currency =
    options?.currency ??
    (product.price_usd ? "USD" : product.price_gems ? "GEMS" : "COINS");
  const status = options?.status ?? "captured";

  const { data: purchase, error } = await admin.from("purchases").insert({
    user_id: userId,
    paypal_order_id: options?.paypalOrderId ?? null,
    status,
    amount: unitAmount,
    currency,
  }).select("id").single();

  if (error) throw error;

  const { error: itemError } = await admin.from("purchase_items").insert({
    purchase_id: purchase.id,
    product_id: product.id,
    quantity: 1,
    unit_amount: unitAmount,
  });

  if (itemError) throw itemError;

  return purchase.id as string;
}
