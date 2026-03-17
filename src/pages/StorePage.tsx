import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Crown, ShoppingBag } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { STORE_TABS } from "@/lib/economy";
import { useAuth } from "@/providers/AuthProvider";
import { VIP_MEMBERSHIP, romanNumeral } from "@/lib/seed-data";
import {
  capturePayPalCheckout,
  createPayPalCheckout,
  fetchStorefront,
  purchaseStoreItem,
  type StorefrontItem,
  type StorefrontSnapshot,
} from "@/lib/storefront";
import type { ItemCategory } from "@/lib/types";

type Tab = "all" | ItemCategory;

function formatPrice(item: StorefrontItem) {
  if (item.priceUsd) return `$${item.priceUsd.toFixed(2)}`;
  if (item.priceGems) return `${item.priceGems} Gems`;
  if (item.priceCoins) return `${item.priceCoins.toLocaleString()} Coins`;
  return "Unavailable";
}

function clearCheckoutParams(params: URLSearchParams, setParams: ReturnType<typeof useSearchParams>[1]) {
  const next = new URLSearchParams(params);
  next.delete("checkout");
  next.delete("purchase");
  next.delete("product");
  setParams(next, { replace: true });
}

export default function StorePage() {
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(0);
  const [snapshot, setSnapshot] = useState<StorefrontSnapshot>({ items: [], vipProduct: null, wallet: null });
  const [isLoading, setIsLoading] = useState(true);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const { user, canSave, refreshUser } = useAuth();

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const next = await fetchStorefront(user);
        if (active) {
          setSnapshot(next);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load store.");
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
        const next = await fetchStorefront(user);
        if (active) {
          setSnapshot(next);
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
  const vipButtonLabel = snapshot.wallet?.isVip ? "Extend VIP" : "Subscribe";

  async function handlePurchase(item: StorefrontItem) {
    if (!canSave) {
      toast.error("Sign in before making purchases.");
      return;
    }

    setBusyProductId(item.id);
    try {
      if (item.priceUsd) {
        const response = await createPayPalCheckout(item.id, "/store");
        window.location.assign(response.approvalUrl);
        return;
      }

      await purchaseStoreItem(item.id);
      await refreshUser();
      setSnapshot(await fetchStorefront(user));
      toast.success(`${item.name} added to your account.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Purchase failed.");
    } finally {
      setBusyProductId(null);
    }
  }

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Customization Market"
          title="Store"
          subtitle={canSave ? "Live purchases and account-bound items." : "Browse as guest. Purchases require sign-in."}
          right={
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
                {vip ? formatPrice(vip) : `$${VIP_MEMBERSHIP.priceUsd.toFixed(2)}/month`} - {snapshot.wallet?.hintBalance ?? 0} hints banked
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
                  <h2 className="section-title">Sharper boards, richer identity cards, cleaner sessions</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="segment-chip">Avatars</span>
                  <span className="segment-chip">Frames</span>
                  <span className="segment-chip">Themes</span>
                </div>
              </div>
              <Button
                variant="prestige"
                size="xl"
                className="w-full"
                disabled={!vip || busyProductId === vip?.id}
                onClick={() => vip && handlePurchase(vip)}
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
              {visibleItems.map((item) => (
                <PuzzleTileButton
                  key={item.id}
                  title={item.name}
                  description={item.description}
                  icon={ShoppingBag}
                  right={
                    item.isOwned ? (
                      <div className="rounded-full bg-primary/12 p-2 text-primary">
                        <Check size={14} />
                      </div>
                    ) : (
                      <div>
                        <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {item.collection ? `${item.collection} - ` : ""}Tier {romanNumeral(item.rarity)}
                        </p>
                        <p className="mt-1 text-xs font-black text-primary">{formatPrice(item)}</p>
                      </div>
                    )
                  }
                  className="h-full"
                  onClick={() => void handlePurchase(item)}
                  disabled={isLoading || busyProductId === item.id || item.isOwned}
                />
              ))}
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
