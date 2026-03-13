import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Crown, ExternalLink, ShoppingBag } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
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

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "theme", label: "Themes" },
  { id: "frame", label: "Frames" },
  { id: "avatar", label: "Avatars" },
  { id: "bundle", label: "Bundles" },
  { id: "hint_pack", label: "Hints" },
  { id: "battle_pass", label: "Pass" },
];

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
  const pageCount = Math.max(1, Math.ceil(items.length / 4));
  const visibleItems = items.slice(page * 4, page * 4 + 4);
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
            <div className="command-panel-soft grid grid-cols-2 gap-2 px-3 py-3">
              <div className="text-center">
                <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Coins</p>
                <p className="text-sm font-black text-coin">{snapshot.wallet?.coins?.toLocaleString() ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Gems</p>
                <p className="text-sm font-black text-primary">{snapshot.wallet?.gems ?? 0}</p>
              </div>
            </div>
          }
        />

        <section className="command-panel grid min-h-0 flex-1 grid-rows-[auto_auto_1fr] gap-3 overflow-hidden p-3">
          <div className="command-panel-soft grid grid-cols-[1fr_auto] gap-3 p-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <img src="/brand/puzzle-rivals-logo.png" alt="Puzzle Rivals" className="h-8 w-8 rounded-full object-cover" draggable={false} />
                <div>
                  <p className="hud-label text-primary">VIP Membership</p>
                  <p className="text-base font-black">{vip?.name ?? "VIP Membership"}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {vip ? formatPrice(vip) : `$${VIP_MEMBERSHIP.priceUsd.toFixed(2)}/month`} • {snapshot.wallet?.hintBalance ?? 0} hints banked
              </p>
            </div>
            <Button
              variant="prestige"
              size="lg"
              className="self-center"
              disabled={!vip || busyProductId === vip.id}
              onClick={() => vip && handlePurchase(vip)}
            >
              <Crown size={14} />
              {busyProductId === vip?.id ? "Working..." : vipButtonLabel}
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {TABS.map((entry) => (
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

          <div className="grid min-h-0 grid-rows-[1fr_auto] gap-3">
            <div className="grid min-h-0 grid-cols-2 gap-3">
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
                      <div className="text-right">
                        <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          Tier {romanNumeral(item.rarity)}
                        </p>
                        <p className="text-xs font-black text-primary">{formatPrice(item)}</p>
                      </div>
                    )
                  }
                  className="h-full"
                  onClick={() => void handlePurchase(item)}
                  disabled={isLoading || busyProductId === item.id || item.isOwned}
                />
              ))}
            </div>

            <div className="command-panel-soft flex items-center justify-between px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Showing {visibleItems.length ? page * 4 + 1 : 0}-{Math.min((page + 1) * 4, items.length)} of {items.length}
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
          </div>
        </section>
      </div>
    </div>
  );
}
