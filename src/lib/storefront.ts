import { STORE_ITEMS, VIP_MEMBERSHIP } from "@/lib/seed-data";
import { supabase, supabaseConfigErrorMessage } from "@/lib/supabase-client";
import type { ItemCategory, ItemRarity, StoreItem, UserProfile } from "@/lib/types";

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
  hint_balance: number;
  has_season_pass: boolean;
  is_vip: boolean;
  vip_expires_at: string | null;
  theme_id: string | null;
  frame_id: string | null;
};

export interface StorefrontWallet {
  coins: number;
  gems: number;
  hintBalance: number;
  hasSeasonPass: boolean;
  isVip: boolean;
  vipExpiresAt: string | null;
  themeId: string | null;
  frameId: string | null;
}

export interface StorefrontItem extends StoreItem {
  kind: string;
}

export interface StorefrontSnapshot {
  items: StorefrontItem[];
  vipProduct: StorefrontItem | null;
  wallet: StorefrontWallet | null;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asCategory(value: unknown): ItemCategory {
  if (
    value === "theme" ||
    value === "avatar" ||
    value === "frame" ||
    value === "bundle" ||
    value === "hint_pack" ||
    value === "battle_pass"
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
    hintBalance: profile.hintBalance ?? 0,
    hasSeasonPass: profile.hasSeasonPass ?? false,
    isVip: profile.isVip,
    vipExpiresAt: profile.vipExpiresAt ?? null,
    themeId: profile.themeId ?? null,
    frameId: profile.frameId ?? null,
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
      (item.category === "battle_pass" && Boolean(profile?.hasSeasonPass)) ||
      Boolean(item.isOwned),
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
    wallet,
  };
}

function mapProduct(
  product: ProductRow,
  ownedIds: Set<string>,
  wallet: WalletRow | null,
): StorefrontItem {
  const metadata = product.metadata ?? {};
  const kind = product.kind;
  const category = asCategory(metadata.category);
  const owned =
    ownedIds.has(product.id) ||
    (kind === "battle_pass" && Boolean(wallet?.has_season_pass)) ||
    (kind === "vip" && Boolean(wallet?.is_vip));

  return {
    id: product.id,
    kind,
    name: asString(metadata.name, product.id),
    description: asString(metadata.description),
    category,
    rarity: Math.max(1, Math.min(4, asNumber(metadata.rarity, 1))) as ItemRarity,
    priceUsd: product.price_usd ?? undefined,
    priceCoins: product.price_coins ?? undefined,
    priceGems: product.price_gems ?? undefined,
    isOwned: owned,
    isFeatured: asBoolean(metadata.featured, false),
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
  if (!supabase || !profile || profile.isGuest) {
    return getFallbackSnapshot(profile);
  }

  const [{ data: products, error: productsError }, { data: inventory, error: inventoryError }, { data: wallet, error: walletError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, kind, price_usd, price_coins, price_gems, metadata")
        .eq("active", true)
        .order("id"),
      supabase
        .from("user_inventory")
        .select("product_id, is_equipped")
        .eq("user_id", profile.id),
      supabase
        .from("profiles")
        .select("coins, gems, hint_balance, has_season_pass, is_vip, vip_expires_at, theme_id, frame_id")
        .eq("id", profile.id)
        .single<WalletRow>(),
    ]);

  if (productsError) throw productsError;
  if (inventoryError) throw inventoryError;
  if (walletError) throw walletError;

  const ownedIds = new Set((inventory ?? []).map((entry) => entry.product_id));
  const items = ((products ?? []) as ProductRow[])
    .map((product) => mapProduct(product, ownedIds, wallet))
    .filter((product) => product.kind !== "vip");
  const vipProduct = ((products ?? []) as ProductRow[])
    .filter((product) => product.kind === "vip")
    .map((product) => mapProduct(product, ownedIds, wallet))[0] ?? null;

  return {
    items,
    vipProduct,
    wallet: wallet
      ? {
          coins: wallet.coins,
          gems: wallet.gems,
          hintBalance: wallet.hint_balance,
          hasSeasonPass: wallet.has_season_pass,
          isVip: wallet.is_vip,
          vipExpiresAt: wallet.vip_expires_at,
          themeId: wallet.theme_id,
          frameId: wallet.frame_id,
        }
      : null,
  };
}

export async function purchaseStoreItem(productId: string) {
  return invoke<{ ok: boolean }>("purchase-store-item", { productId });
}

export async function createPayPalCheckout(productId: string, returnPath: string) {
  return invoke<{ approvalUrl: string }>("create-paypal-order", { productId, returnPath });
}

export async function capturePayPalCheckout(purchaseId: string) {
  return invoke<{ ok: boolean }>("capture-paypal-order", { purchaseId });
}
