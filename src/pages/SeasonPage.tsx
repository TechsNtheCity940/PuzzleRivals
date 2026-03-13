import { useEffect, useMemo, useState } from "react";
import { Gift, Lock, Star } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { CURRENT_SEASON } from "@/lib/seed-data";
import { capturePayPalCheckout, createPayPalCheckout, fetchStorefront } from "@/lib/storefront";
import { useAuth } from "@/providers/AuthProvider";

const TIER_XP = 500;
const BATTLE_PASS_PRODUCT_ID = "s_6";

function clearCheckoutParams(params: URLSearchParams, setParams: ReturnType<typeof useSearchParams>[1]) {
  const next = new URLSearchParams(params);
  next.delete("checkout");
  next.delete("purchase");
  next.delete("product");
  setParams(next, { replace: true });
}

export default function SeasonPage() {
  const [hasSeasonPass, setHasSeasonPass] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [params, setParams] = useSearchParams();
  const { user, canSave, refreshUser } = useAuth();

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const snapshot = await fetchStorefront(user);
        if (active) {
          setHasSeasonPass(Boolean(snapshot.wallet?.hasSeasonPass));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load season pass.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const checkoutState = params.get("checkout");
    const purchaseId = params.get("purchase");

    if (checkoutState === "cancelled") {
      toast.message("Battle pass checkout cancelled.");
      clearCheckoutParams(params, setParams);
      return;
    }
    if (checkoutState !== "paypal" || !purchaseId) return;

    let active = true;
    async function capture() {
      setIsPurchasing(true);
      try {
        await capturePayPalCheckout(purchaseId);
        await refreshUser();
        const snapshot = await fetchStorefront(user);
        if (active) setHasSeasonPass(Boolean(snapshot.wallet?.hasSeasonPass));
        toast.success("Battle pass unlocked.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to capture battle pass purchase.");
      } finally {
        if (active) {
          setIsPurchasing(false);
          clearCheckoutParams(params, setParams);
        }
      }
    }
    void capture();
    return () => {
      active = false;
    };
  }, [params, refreshUser, setParams, user]);

  const currentTier = useMemo(() => {
    const xp = user?.xp ?? 0;
    return Math.max(1, Math.min(CURRENT_SEASON.maxTier, Math.floor(xp / TIER_XP) + 1));
  }, [user?.xp]);
  const progressWithinTier = useMemo(() => {
    const xp = user?.xp ?? 0;
    return Math.round(((xp % TIER_XP) / TIER_XP) * 100);
  }, [user?.xp]);
  const focusedTracks = useMemo(() => {
    const start = Math.max(0, currentTier - 2);
    return CURRENT_SEASON.tracks.slice(start, start + 5).map((track) => ({
      ...track,
      isUnlocked: track.tier <= currentTier,
    }));
  }, [currentTier]);

  async function unlockPremiumTrack() {
    if (!canSave) {
      toast.error("Sign in before buying the battle pass.");
      return;
    }
    setIsPurchasing(true);
    try {
      const response = await createPayPalCheckout(BATTLE_PASS_PRODUCT_ID, "/season");
      window.location.assign(response.approvalUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout.");
      setIsPurchasing(false);
    }
  }

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Season Progression"
          title={`Season ${CURRENT_SEASON.seasonNumber}`}
          subtitle={CURRENT_SEASON.name}
          right={
            <div className="command-panel-soft px-4 py-3 text-center">
              <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">
                {hasSeasonPass ? "Premium" : "Free Track"}
              </p>
              <p className="text-sm font-black">
                Tier {currentTier}/{CURRENT_SEASON.maxTier}
              </p>
            </div>
          }
        />

        <section className="command-panel grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 overflow-hidden p-3">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="command-panel-soft p-3">
              <div className="mb-3 flex items-center gap-2">
                <img src="/brand/puzzle-rivals-logo.png" alt="Puzzle Rivals" className="h-8 w-8 rounded-full object-cover" draggable={false} />
                <div>
                  <p className="hud-label text-primary">Battle Pass</p>
                  <p className="text-base font-black">{hasSeasonPass ? "Premium unlocked" : "Upgrade available"}</p>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-prestige"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(progressWithinTier, 6)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{progressWithinTier}% toward next tier.</p>
            </div>

            {!hasSeasonPass ? (
              <Button
                variant="prestige"
                size="xl"
                className="min-w-[168px] self-stretch"
                disabled={isLoading || isPurchasing}
                onClick={() => void unlockPremiumTrack()}
              >
                <Star size={14} />
                {isPurchasing ? "Opening..." : "Unlock"}
              </Button>
            ) : (
              <div className="command-panel-soft flex min-w-[168px] items-center justify-center px-4 text-center text-sm font-semibold text-primary">
                Premium rewards active
              </div>
            )}
          </div>

          <div className="grid min-h-0 grid-cols-[0.95fr_1.05fr] gap-3">
            <div className="command-panel-soft grid min-h-0 grid-rows-[repeat(3,minmax(0,1fr))] gap-3 p-3">
              <div className="compact-metric">
                <span className="hud-label">XP Bank</span>
                <span className="text-lg font-black">{user?.xp ?? 0}</span>
              </div>
              <div className="compact-metric">
                <span className="hud-label">Next Tier</span>
                <span className="text-lg font-black text-primary">{TIER_XP - ((user?.xp ?? 0) % TIER_XP)} XP</span>
              </div>
              <div className="compact-metric">
                <span className="hud-label">Track State</span>
                <span className="text-sm font-black">{hasSeasonPass ? "Premium" : "Free"}</span>
              </div>
            </div>

            <div className="grid min-h-0 gap-3">
              {focusedTracks.map((track) => (
                <PuzzleTileButton
                  key={track.tier}
                  icon={track.isUnlocked ? Gift : Lock}
                  title={`Tier ${track.tier}`}
                  description={track.freeReward?.label ?? "No free reward"}
                  active={track.tier === currentTier}
                  right={
                    <div className="text-right">
                      <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Premium</p>
                      <p className={`text-xs font-black ${hasSeasonPass ? "text-primary" : "text-muted-foreground"}`}>
                        {track.premiumReward?.label ?? "-"}
                      </p>
                    </div>
                  }
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
