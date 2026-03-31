import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Crown, ShoppingBag } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import IdentityLoadoutCard from "@/components/cosmetics/IdentityLoadoutCard";
import CosmeticPreview from "@/components/cosmetics/CosmeticPreview";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { isRenderableCosmeticCategory } from "@/lib/cosmetics";
import { STORE_TABS } from "@/lib/economy";
import {
  loadStoreContent,
  type GameContentResolution,
  type GameContentSource,
} from "@/lib/game-content";
import {
  capturePayPalCheckout,
  createPayPalCheckout,
  equipStoreItem,
  purchaseStoreItem,
  type StorefrontItem,
  type StorefrontSnapshot,
} from "@/lib/storefront";
import type { ItemCategory, VipMembership } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

type Tab = "all" | ItemCategory;

function formatPrice(item: StorefrontItem, wallet?: StorefrontSnapshot["wallet"]) {
  if (item.isComplimentary) return wallet?.vipAccess ? "VIP Complimentary" : "Complimentary Access";
  if (item.priceUsd) return `$${item.priceUsd.toFixed(2)}`;
  if (item.priceGems) return `${item.priceGems} Gems`;
  if (item.priceCoins) return `${item.priceCoins.toLocaleString()} Coins`;
  return "Unavailable";
}

function isEquipable(item: StorefrontItem) {
  return (
    item.kind === "theme" ||
    item.kind === "frame" ||
    item.kind === "player_card" ||
    item.kind === "banner" ||
    item.kind === "emblem" ||
    item.kind === "title"
  );
}

function clearCheckoutParams(params: URLSearchParams, setParams: ReturnType<typeof useSearchParams>[1]) {
  const next = new URLSearchParams(params);
  next.delete("checkout");
  next.delete("purchase");
  next.delete("product");
  setParams(next, { replace: true });
}

function romanNumeral(n: number): string {
  return ["", "I", "II", "III", "IV", "V", "VI"][n] || String(n);
}

function sourceLabel(source: GameContentSource) {
  return source === "supabase" ? "Live" : "Local Preview";
}

function describeStoreResolution(resolution: GameContentResolution) {
  if (resolution === "empty") {
    return "Live store data is connected, but no catalog items are published right now.";
  }
  if (resolution === "unavailable") {
    return "Live commerce data is currently unavailable.";
  }
  return "Local preview store data is loaded because Supabase commerce is disabled.";
}

export default function StorePage() {
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(0);
  const [snapshot, setSnapshot] = useState<StorefrontSnapshot>({ items: [], vipProduct: null, vipMembership: null, wallet: null, source: "seed" });
  const [vipMembership, setVipMembership] = useState<VipMembership | null>(null);
  const [storefrontSource, setStorefrontSource] = useState<GameContentSource>("seed");
  const [storefrontResolution, setStorefrontResolution] = useState<GameContentResolution>("fallback");
  const [vipResolution, setVipResolution] = useState<GameContentResolution>("fallback");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const { user, canSave, hasSession, refreshUser, signOut } = useAuth();
  const accountNeedsSync = hasSession && !user;

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const next = await loadStoreContent(user);
        if (active) {
          setSnapshot(next.storefront);
          setVipMembership(next.vipMembership);
          setStorefrontSource(next.sources.storefront);
          setStorefrontResolution(next.resolutions.storefront);
          setVipResolution(next.resolutions.vipMembership);
        }
      } catch (error) {
        if (active) {
          const message = error instanceof Error ? error.message : "Failed to load store.";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    setPage(0);
  }, [tab]);

  useEffect(() => {
    const checkoutState = params.get("checkout");
    const purchaseId = params.get("purchase");

    if (checkoutState === "cancelled") {
      toast.message("PayPal checkout cancelled.");
      clearCheckoutParams(params, setParams);
      return;
    }

    if (checkoutState !== "paypal" || !purchaseId) {
      return;
    }

    let active = true;
    async function capture() {
      setBusyProductId(params.get("product") ?? "paypal");
      try {
        await capturePayPalCheckout(purchaseId);
        await refreshUser();
        const next = await loadStoreContent(user);
        if (active) {
          setSnapshot(next.storefront);
          setVipMembership(next.vipMembership);
          setStorefrontSource(next.sources.storefront);
          setStorefrontResolution(next.resolutions.storefront);
          setVipResolution(next.resolutions.vipMembership);
        }
        toast.success("Purchase completed.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to capture PayPal order.");
      } finally {
        if (active) {
          setBusyProductId(null);
          clearCheckoutParams(params, setParams);
        }
      }
    }

    void capture();
    return () => {
      active = false;
    };
  }, [params, refreshUser, setParams, user]);

  const items = useMemo(
    () => (tab === "all" ? snapshot.items : snapshot.items.filter((item) => item.category === tab)),
    [snapshot.items, tab],
  );
  const pageCount = Math.max(1, Math.ceil(items.length / 6));
  const visibleItems = items.slice(page * 6, page * 6 + 6);
  const vip = snapshot.vipProduct;
  const vipButtonLabel = snapshot.wallet?.isPrivileged
    ? snapshot.wallet?.vipAccess
      ? "VIP Access"
      : "Owner Access"
    : snapshot.wallet?.isVip
      ? "Extend VIP"
      : "Subscribe";

  async function refreshSnapshot() {
    const next = await loadStoreContent(user);
    setSnapshot(next.storefront);
    setVipMembership(next.vipMembership);
    setStorefrontSource(next.sources.storefront);
    setStorefrontResolution(next.resolutions.storefront);
    setVipResolution(next.resolutions.vipMembership);
  }

  async function handleItemAction(item: StorefrontItem) {
    if (accountNeedsSync) {
      toast.error("Profile sync is required before purchases or equips.");
      return;
    }

    if (!canSave) {
      toast.error("Sign in before making purchases.");
      return;
    }

    setBusyProductId(item.id);
    try {
      if (item.isOwned && !isEquipable(item)) {
        toast.message(`${item.name} is already available on this account.`);
        return;
      }

      if (item.isOwned && isEquipable(item)) {
        await equipStoreItem(item.id);
        await refreshUser();
        await refreshSnapshot();
        toast.success(`${item.name} equipped.`);
        return;
      }

      if (item.priceUsd) {
        const response = await createPayPalCheckout(item.id, "/store");
        window.location.assign(response.approvalUrl);
        return;
      }

      await purchaseStoreItem(item.id);
      await refreshUser();
      await refreshSnapshot();
      toast.success(`${item.name} added to your account.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Purchase failed.");
    } finally {
      setBusyProductId(null);
    }
  }

  const subtitle = accountNeedsSync
    ? "You are signed in, but the live wallet/profile payload is unavailable. Sign out and back in before using commerce."
    : canSave
      ? storefrontResolution === "live"
        ? `${sourceLabel(storefrontSource)} purchases and account-bound items.`
        : describeStoreResolution(storefrontResolution)
      : storefrontResolution === "fallback"
        ? "Browsing the local preview store as guest. Purchases require sign-in."
        : "Browse as guest. Purchases require sign-in.";

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Customization Market"
          title="Store"
          subtitle={subtitle}
          right={
            accountNeedsSync ? (
              <div className="spotlight-panel flex min-w-[260px] flex-col gap-3">
                <div>
                  <p className="section-kicker">Commerce Status</p>
                  <p className="mt-2 text-lg font-black">Profile sync required</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The session is active, but the account wallet is unavailable. Sign out to retry cleanly.
                  </p>
                </div>
                <Button onClick={() => void signOut()} variant="outline" size="sm" className="w-full">
                  Sign Out To Retry
                </Button>
              </div>
            ) : (
              <div className="spotlight-panel">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="hud-label">Coins</p>
                    <p className="mt-2 text-2xl font-black text-coin">{snapshot.wallet?.coins?.toLocaleString() ?? 0}</p>
                  </div>
                  <div>
                    <p className="hud-label">Gems</p>
                    <p className="mt-2 text-2xl font-black text-primary">{snapshot.wallet?.gems ?? 0}</p>
                  </div>
                  <div>
                    <p className="hud-label">Shards</p>
                    <p className="mt-2 text-2xl font-black text-gradient-prestige">{snapshot.wallet?.puzzleShards ?? 0}</p>
                  </div>
                  <div>
                    <p className="hud-label">Pass XP</p>
                    <p className="mt-2 text-2xl font-black text-xp">{snapshot.wallet?.passXp ?? 0}</p>
                  </div>
                </div>
              </div>
            )
          }
        />

        <section className="hero-panel">
          <div className="hero-grid">
            <div className="command-panel-soft store-hero p-5">
              <div className="section-header">
                <div>
                  <p className="section-kicker">VIP Membership</p>
                  <h2 className="section-title">{vip?.name ?? "VIP Membership"}</h2>
                </div>
                <Crown size={18} className="text-primary" />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {vip
                  ? formatPrice(vip, snapshot.wallet)
                  : vipMembership
                    ? `$${vipMembership.priceUsd.toFixed(2)}/month`
                    : vipResolution === "empty"
                      ? "VIP offer not published yet"
                      : vipResolution === "unavailable"
                        ? "Live VIP offer is currently unavailable"
                        : "Unavailable"} - {snapshot.wallet?.hintBalance ?? 0} hints banked
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rich-stat">
                  <p className="hud-label">Status</p>
                  <p className="text-lg font-black text-primary">{snapshot.wallet?.isVip ? "VIP Live" : "Free Track"}</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Owned</p>
                  <p className="stat-value">{snapshot.items.filter((item) => item.isOwned).length}</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Premium</p>
                  <p className="text-lg font-black text-gradient-prestige">Unlock cosmetics</p>
                </div>
              </div>
            </div>
            <div className="spotlight-panel store-callout flex flex-col justify-between gap-4">
              <div className="section-stack">
                <div>
                  <p className="section-kicker">Featured Drop</p>
                  <h2 className="section-title">Season 1: Neon Rivals cosmetics are live</h2>
                </div>
                <div className="store-preview-strip">
                  <CosmeticPreview
                    kind="theme"
                    productId={snapshot.wallet?.themeId ?? snapshot.items.find((item) => item.category === "theme")?.id ?? null}
                  />
                  <CosmeticPreview
                    kind="frame"
                    productId={snapshot.wallet?.frameId ?? snapshot.items.find((item) => item.category === "frame")?.id ?? null}
                  />
                  <CosmeticPreview
                    kind="player_card"
                    productId={snapshot.wallet?.playerCardId ?? snapshot.items.find((item) => item.category === "player_card")?.id ?? null}
                  />
                </div>
                <IdentityLoadoutCard
                  username={user?.username ?? "Guest Player"}
                  subtitle={snapshot.wallet?.isVip ? "VIP identity live" : "Preview the Neon Rivals loadout"}
                  avatarId={user?.avatarId}
                  frameId={snapshot.wallet?.frameId ?? user?.frameId}
                  playerCardId={snapshot.wallet?.playerCardId ?? user?.playerCardId}
                  bannerId={snapshot.wallet?.bannerId ?? user?.bannerId}
                  emblemId={snapshot.wallet?.emblemId ?? user?.emblemId}
                  titleId={snapshot.wallet?.titleId ?? user?.titleId}
                  className="store-loadout-preview"
                />
              </div>
              <Button
                variant="prestige"
                size="xl"
                className="w-full"
                disabled={!vip || busyProductId === vip?.id || Boolean(snapshot.wallet?.isPrivileged) || accountNeedsSync}
                onClick={() => vip && handleItemAction(vip)}
              >
                <Crown size={14} />
                {busyProductId === vip?.id ? "Working..." : vipButtonLabel}
              </Button>
            </div>
          </div>
        </section>

        <section className="section-panel">
          <div className="section-header">
            <div>
              <p className="section-kicker">Filter Deck</p>
              <h2 className="section-title">Browse without dead space</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {STORE_TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={`segment-chip ${tab === entry.id ? "segment-chip-active" : ""}`}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </section>

        <div className="page-grid">
          <section className="section-panel lg:col-span-2">
            <div className="section-header">
              <div>
                <p className="section-kicker">Inventory Feed</p>
                <h2 className="section-title">Items worth clicking into</h2>
              </div>
            </div>
            <div className="deck-grid">
              {loadError ? (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  {loadError}
                </div>
              ) : isLoading ? (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  Loading store inventory...
                </div>
              ) : visibleItems.length > 0 ? (
                visibleItems.map((item) => (
                  <PuzzleTileButton
                    key={item.id}
                    title={item.name}
                    description={item.description}
                    media={
                      isRenderableCosmeticCategory(item.kind) ? (
                        <CosmeticPreview kind={item.kind} productId={item.id} label={item.name} className="store-item-preview" />
                      ) : undefined
                    }
                    icon={ShoppingBag}
                    right={
                      item.isOwned ? (
                        <div className="text-right">
                          <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            {item.isEquipped ? "Loadout" : "Owned"}
                          </p>
                          <p className="mt-1 text-xs font-black text-primary">
                            {item.isEquipped ? "Equipped" : isEquipable(item) ? "Tap to equip" : "Collected"}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            {item.collection ? `${item.collection} - ` : ""}Tier {romanNumeral(item.rarity)}
                          </p>
                          <p className="mt-1 text-xs font-black text-primary">{formatPrice(item, snapshot.wallet)}</p>
                        </div>
                      )
                    }
                    className="h-full"
                    onClick={() => void handleItemAction(item)}
                    disabled={isLoading || busyProductId === item.id || accountNeedsSync || (item.isOwned && !isEquipable(item))}
                  />
                ))
              ) : (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  {describeStoreResolution(storefrontResolution)}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Showing {visibleItems.length ? page * 6 + 1 : 0}-{Math.min((page + 1) * 6, items.length)} of {items.length}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">
                  {page + 1}/{pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
