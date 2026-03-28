import { STORE_ITEMS, VIP_MEMBERSHIP } from "@/lib/seed-data";
import {
  isSupabaseSchemaSetupIssue,
  supabase,
  supabaseConfigErrorMessage,
} from "@/lib/supabase-client";
import type {
  ItemCategory,
  ItemRarity,
  StoreItem,
  UserProfile,
  VipMembership,
} from "@/lib/types";

type ProductRow = {
  id: string;
  kind: string;
  price_usd: number | null;
  price_coins: number | null;
  price_gems: number | null;
  metadata: Record<string, unknown> | null;
};

type InventoryRow = {
  product_id: string;
  is_equipped: boolean;
};

type WalletRow = {
  coins: number;
  gems: number;
  puzzle_shards: number;
  rank_points: number;
  pass_xp: number;
  hint_balance: number;
  has_season_pass: boolean;
  is_vip: boolean;
  vip_expires_at: string | null;
  theme_id: string | null;
  frame_id: string | null;
  player_card_id: string | null;
  banner_id: string | null;
  emblem_id: string | null;
  title_id: string | null;
};

export type StorefrontSource = "supabase" | "seed";

export interface StorefrontWallet {
  coins: number;
  gems: number;
  puzzleShards: number;
  rankPoints: number;
  passXp: number;
  hintBalance: number;
  hasSeasonPass: boolean;
  isVip: boolean;
  vipExpiresAt: string | null;
  themeId: string | null;
  frameId: string | null;
  playerCardId: string | null;
  bannerId: string | null;
  emblemId: string | null;
  titleId: string | null;
}

export interface StorefrontItem extends StoreItem {
  kind: string;
}

export interface StorefrontSnapshot {
  items: StorefrontItem[];
  vipProduct: StorefrontItem | null;
  vipMembership: VipMembership | null;
  wallet: StorefrontWallet | null;
  source: StorefrontSource;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function asCategory(value: unknown): ItemCategory {
  if (
    value === "theme" ||
    value === "avatar" ||
    value === "frame" ||
    value === "player_card" ||
    value === "banner" ||
    value === "emblem" ||
    value === "title" ||
    value === "bundle" ||
    value === "hint_pack" ||
    value === "battle_pass" ||
    value === "badge"
  ) {
    return value;
  }
  return "bundle";
}

function toWallet(profile?: UserProfile | null): StorefrontWallet | null {
  if (!profile) return null;
  return {
    coins: profile.coins,
    gems: profile.gems,
    puzzleShards: profile.puzzleShards,
    rankPoints: profile.rankPoints,
    passXp: profile.passXp,
    hintBalance: profile.hintBalance ?? 0,
    hasSeasonPass: profile.hasSeasonPass ?? false,
    isVip: profile.isVip,
    vipExpiresAt: profile.vipExpiresAt ?? null,
    themeId: profile.themeId ?? null,
    frameId: profile.frameId ?? null,
    playerCardId: profile.playerCardId ?? null,
    bannerId: profile.bannerId ?? null,
    emblemId: profile.emblemId ?? null,
    titleId: profile.titleId ?? null,
  };
}

function mapWallet(wallet: WalletRow | null, profile?: UserProfile | null): StorefrontWallet | null {
  if (wallet) {
    return {
      coins: wallet.coins,
      gems: wallet.gems,
      puzzleShards: wallet.puzzle_shards,
      rankPoints: wallet.rank_points,
      passXp: wallet.pass_xp,
      hintBalance: wallet.hint_balance,
      hasSeasonPass: wallet.has_season_pass,
      isVip: wallet.is_vip,
      vipExpiresAt: wallet.vip_expires_at,
      themeId: wallet.theme_id,
      frameId: wallet.frame_id,
      playerCardId: wallet.player_card_id,
      bannerId: wallet.banner_id,
      emblemId: wallet.emblem_id,
      titleId: wallet.title_id,
    };
  }

  return toWallet(profile);
}

function buildFallbackVipMembership(profile?: UserProfile | null): VipMembership {
  return {
    isActive: Boolean(profile?.isVip),
    expiresAt: profile?.vipExpiresAt ?? undefined,
    perks: [...VIP_MEMBERSHIP.perks],
    priceUsd: VIP_MEMBERSHIP.priceUsd,
  };
}

function getFallbackSnapshot(profile?: UserProfile | null): StorefrontSnapshot {
  const wallet = toWallet(profile);
  const items: StorefrontItem[] = STORE_ITEMS.map((item) => ({
    ...item,
    kind: item.category,
    isOwned:
      item.id === profile?.themeId ||
      item.id === profile?.frameId ||
      item.id === profile?.playerCardId ||
      item.id === profile?.bannerId ||
      item.id === profile?.emblemId ||
      item.id === profile?.titleId ||
      (item.category === "battle_pass" && Boolean(profile?.hasSeasonPass)) ||
      Boolean(item.isOwned),
    isEquipped:
      item.id === profile?.themeId ||
      item.id === profile?.frameId ||
      item.id === profile?.playerCardId ||
      item.id === profile?.bannerId ||
      item.id === profile?.emblemId ||
      item.id === profile?.titleId,
  }));

  return {
    items,
    vipProduct: {
      id: "vip_monthly",
      kind: "vip",
      name: "VIP Membership",
      description: VIP_MEMBERSHIP.perks[0] ?? "Monthly VIP access",
      category: "bundle",
      rarity: 4,
      priceUsd: VIP_MEMBERSHIP.priceUsd,
      isOwned: Boolean(profile?.isVip),
      isFeatured: true,
    },
    vipMembership: buildFallbackVipMembership(profile),
    wallet,
    source: "seed",
  };
}

function mapProduct(
  product: ProductRow,
  ownedIds: Set<string>,
  wallet: StorefrontWallet | null,
): StorefrontItem {
  const metadata = asRecord(product.metadata);
  const kind = product.kind;
  const category = asCategory(metadata.category);
  const owned =
    ownedIds.has(product.id) ||
    (kind === "battle_pass" && Boolean(wallet?.hasSeasonPass)) ||
    (kind === "vip" && Boolean(wallet?.isVip));
  const equipped =
    product.id === wallet?.themeId ||
    product.id === wallet?.frameId ||
    product.id === wallet?.playerCardId ||
    product.id === wallet?.bannerId ||
    product.id === wallet?.emblemId ||
    product.id === wallet?.titleId;

  return {
    id: product.id,
    kind,
    name: asString(metadata.name, product.id),
    description: asString(metadata.description),
    category,
    rarity: Math.max(1, Math.min(6, asNumber(metadata.rarity, 1))) as ItemRarity,
    priceUsd: product.price_usd ?? undefined,
    priceCoins: product.price_coins ?? undefined,
    priceGems: product.price_gems ?? undefined,
    isOwned: owned,
    isEquipped: equipped,
    isFeatured: asBoolean(metadata.featured, false),
    collection: asString(metadata.collection) || undefined,
  };
}

function mapVipMembership(
  product: ProductRow | null,
  wallet: StorefrontWallet | null,
  profile?: UserProfile | null,
): VipMembership | null {
  if (!product) {
    return null;
  }

  const metadata = asRecord(product.metadata);
  const perks = asStringArray(metadata.perks);
  const fallbackDescription = asString(metadata.description);

  return {
    isActive: Boolean(wallet?.isVip ?? profile?.isVip),
    expiresAt: wallet?.vipExpiresAt ?? profile?.vipExpiresAt ?? undefined,
    perks: perks.length > 0 ? perks : fallbackDescription ? [fallbackDescription] : [...VIP_MEMBERSHIP.perks],
    priceUsd: product.price_usd ?? VIP_MEMBERSHIP.priceUsd,
  };
}

async function invoke<T>(functionName: string, body: Record<string, unknown>) {
  if (!supabase) {
    throw new Error(supabaseConfigErrorMessage);
  }

  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) {
    throw new Error(error.message);
  }

  return data as T;
}

export async function fetchStorefront(profile?: UserProfile | null): Promise<StorefrontSnapshot> {
  if (!supabase) {
    return getFallbackSnapshot(profile);
  }

  const shouldLoadProfileState = Boolean(profile && !profile.isGuest);

  const [{ data: products, error: productsError }, inventoryResult, walletResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, kind, price_usd, price_coins, price_gems, metadata")
      .eq("active", true)
      .order("id"),
    shouldLoadProfileState
      ? supabase
          .from("user_inventory")
          .select("product_id, is_equipped")
          .eq("user_id", profile!.id)
      : Promise.resolve({ data: [] as InventoryRow[], error: null }),
    shouldLoadProfileState
      ? supabase
          .from("profiles")
          .select("coins, gems, puzzle_shards, rank_points, pass_xp, hint_balance, has_season_pass, is_vip, vip_expires_at, theme_id, frame_id, player_card_id, banner_id, emblem_id, title_id")
          .eq("id", profile!.id)
          .single<WalletRow>()
      : Promise.resolve({ data: null as WalletRow | null, error: null }),
  ]);

  if (productsError) {
    if (isSupabaseSchemaSetupIssue(productsError)) {
      return getFallbackSnapshot(profile);
    }
    throw productsError;
  }

  const productRows = (products ?? []) as ProductRow[];
  if (productRows.length === 0) {
    return getFallbackSnapshot(profile);
  }

  if (inventoryResult.error) {
    if (isSupabaseSchemaSetupIssue(inventoryResult.error)) {
      return getFallbackSnapshot(profile);
    }
    throw inventoryResult.error;
  }

  if (walletResult.error) {
    if (isSupabaseSchemaSetupIssue(walletResult.error)) {
      return getFallbackSnapshot(profile);
    }
    throw walletResult.error;
  }

  const wallet = mapWallet((walletResult.data ?? null) as WalletRow | null, profile);
  const ownedIds = new Set(((inventoryResult.data ?? []) as InventoryRow[]).map((entry) => entry.product_id));
  const vipRow = productRows.find((product) => product.kind === "vip") ?? null;
  const items = productRows
    .filter((product) => product.kind !== "vip")
    .map((product) => mapProduct(product, ownedIds, wallet));

  return {
    items,
    vipProduct: vipRow ? mapProduct(vipRow, ownedIds, wallet) : null,
    vipMembership: mapVipMembership(vipRow, wallet, profile),
    wallet,
    source: "supabase",
  };
}

export async function purchaseStoreItem(productId: string) {
  return invoke<{ ok: boolean }>("purchase-store-item", { productId });
}

export async function equipStoreItem(productId: string) {
  return invoke<{ ok: boolean }>("equip-store-item", { productId });
}

export async function createPayPalCheckout(productId: string, returnPath: string) {
  return invoke<{ approvalUrl: string }>("create-paypal-order", { productId, returnPath });
}

export async function capturePayPalCheckout(purchaseId: string) {
  return invoke<{ ok: boolean }>("capture-paypal-order", { purchaseId });
}
