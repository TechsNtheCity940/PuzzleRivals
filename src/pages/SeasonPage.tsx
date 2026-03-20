import { useEffect, useMemo, useState } from "react";
import { Gift, Lock, Star, TrendingUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { getPassTierProgress } from "@/lib/economy";
import { loadSeasonContent, type GameContentSource, type SeasonContentSnapshot } from "@/lib/game-content";
import { capturePayPalCheckout, createPayPalCheckout } from "@/lib/storefront";
import { useAuth } from "@/providers/AuthProvider";

const BATTLE_PASS_PRODUCT_ID = "s_6";

function clearCheckoutParams(params: URLSearchParams, setParams: ReturnType<typeof useSearchParams>[1]) {
  const next = new URLSearchParams(params);
  next.delete("checkout");
  next.delete("purchase");
  next.delete("product");
  setParams(next, { replace: true });
}

function sourceLabel(source: GameContentSource) {
  return source === "supabase" ? "Live" : "Demo";
}

export default function SeasonPage() {
  const [seasonContent, setSeasonContent] = useState<SeasonContentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const { user, canSave, refreshUser } = useAuth();

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const snapshot = await loadSeasonContent(user);
        if (active) {
          setSeasonContent(snapshot);
        }
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Failed to load season pass.");
          toast.error(error instanceof Error ? error.message : "Failed to load season pass.");
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
        const snapshot = await loadSeasonContent(user);
        if (active) {
          setSeasonContent(snapshot);
        }
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

  const season = seasonContent?.season;
  const { currentTier, nextTierXp, progressWithinTier } = useMemo(
    () => getPassTierProgress(user?.passXp ?? 0, season?.maxTier ?? 40),
    [season?.maxTier, user?.passXp],
  );
  const focusedTracks = useMemo(() => {
    if (!season) {
      return [];
    }

    const start = Math.max(0, currentTier - 2);
    return season.tracks.slice(start, start + 6).map((track) => ({
      ...track,
      isUnlocked: track.tier <= currentTier,
    }));
  }, [currentTier, season]);

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
          title={season ? `Season ${season.seasonNumber}` : "Season Progression"}
          subtitle={season ? `${season.name} · ${sourceLabel(seasonContent?.sources.quests ?? "seed")} quests` : "Loading season lane..."}
          right={
            <div className="spotlight-panel">
              <p className="section-kicker">
                {seasonContent?.hasSeasonPass ? "Premium Track" : isLoading ? "Syncing Track" : "Free Track"}
              </p>
              <p className="mt-2 text-3xl font-black">
                Tier {currentTier}/{season?.maxTier ?? 40}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {progressWithinTier}% toward the next unlock.
              </p>
            </div>
          }
        />

        <section className="hero-panel">
          <div className="hero-grid">
            <div className="command-panel-soft p-5">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Battle Pass</p>
                  <h2 className="section-title">
                    {seasonContent?.hasSeasonPass ? "Premium unlocked" : isLoading ? "Syncing rewards" : "Upgrade available"}
                  </h2>
                </div>
                <TrendingUp size={18} className="text-primary" />
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-prestige"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(progressWithinTier, 6)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {loadError ??
                  "Pass XP, rank points, and quest cadence now drive the season lane instead of generic account XP alone."}
              </p>
            </div>

            {!seasonContent?.hasSeasonPass ? (
              <div className="spotlight-panel flex flex-col justify-between gap-4">
                <div>
                  <p className="section-kicker">Upgrade</p>
                  <p className="mt-2 text-3xl font-black">Unlock the premium track</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Season rewards: {sourceLabel(seasonContent?.sources.season ?? "seed")} · Wallet: {sourceLabel(seasonContent?.sources.entitlements ?? "seed")}
                  </p>
                </div>
                <Button
                  variant="prestige"
                  size="xl"
                  className="w-full"
                  disabled={isLoading || isPurchasing}
                  onClick={() => void unlockPremiumTrack()}
                >
                  <Star size={14} />
                  {isPurchasing ? "Opening..." : "Unlock"}
                </Button>
              </div>
            ) : (
              <div className="spotlight-panel flex items-center justify-center text-center">
                <div>
                  <p className="section-kicker">Premium Active</p>
                  <p className="mt-2 text-3xl font-black text-primary">Rewards live</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="page-grid">
          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Season Snapshot</p>
                <h2 className="section-title">Track state at a glance</h2>
              </div>
            </div>
            <div className="metric-grid">
              <div className="rich-stat">
                <p className="hud-label">Pass XP</p>
                <p className="stat-value">{user?.passXp ?? 0}</p>
              </div>
              <div className="rich-stat">
                <p className="hud-label">Next Tier</p>
                <p className="stat-value text-primary">{nextTierXp} XP</p>
              </div>
              <div className="rich-stat">
                <p className="hud-label">Track State</p>
                <p className="stat-value">{seasonContent?.hasSeasonPass ? "Premium" : "Free"}</p>
              </div>
              <div className="rich-stat">
                <p className="hud-label">Rank Points</p>
                <p className="stat-value text-gradient-prestige">{user?.rankPoints ?? 0}</p>
              </div>
            </div>
          </section>

          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Focused Rewards</p>
                <h2 className="section-title">Current tier lane</h2>
              </div>
            </div>
            <div className="section-stack">
              {focusedTracks.length > 0 ? focusedTracks.map((track) => (
                <PuzzleTileButton
                  key={track.tier}
                  icon={track.isUnlocked ? Gift : Lock}
                  title={`Tier ${track.tier}`}
                  description={track.freeReward?.label ?? "No free reward"}
                  active={track.tier === currentTier}
                  right={
                    <div>
                      <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Premium</p>
                      <p className={`mt-1 text-xs font-black ${seasonContent?.hasSeasonPass ? "text-primary" : "text-muted-foreground"}`}>
                        {track.premiumReward?.label ?? "-"}
                      </p>
                    </div>
                  }
                />
              )) : (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  {isLoading ? "Loading season rewards..." : "No reward lane is available yet."}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="page-grid">
          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Daily + Weekly</p>
                <h2 className="section-title">Mission cadence</h2>
              </div>
            </div>
            <div className="section-stack">
              {(seasonContent ? [...seasonContent.quests.daily, ...seasonContent.quests.weekly].slice(0, 4) : []).length > 0 ? (
                [...(seasonContent?.quests.daily ?? []), ...(seasonContent?.quests.weekly ?? [])].slice(0, 4).map((quest) => (
                  <PuzzleTileButton
                    key={quest.id}
                    icon={Gift}
                    title={quest.title}
                    description={`${quest.description} ${quest.progress}/${quest.target}`}
                    right={
                      <div className="text-right">
                        <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{quest.track}</p>
                        <p className="mt-1 text-xs font-black text-primary">
                          +{quest.reward.passXp ?? 0} PX / +{quest.reward.coins ?? 0}C
                        </p>
                      </div>
                    }
                  />
                ))
              ) : (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  {isLoading ? "Loading mission cadence..." : "No daily or weekly quests are available right now."}
                </div>
              )}
            </div>
          </section>

          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Season Chase</p>
                <h2 className="section-title">Prestige objectives</h2>
              </div>
            </div>
            <div className="section-stack">
              {(seasonContent?.quests.seasonal ?? []).length > 0 ? (
                seasonContent?.quests.seasonal.map((quest) => (
                  <PuzzleTileButton
                    key={quest.id}
                    icon={Lock}
                    title={quest.title}
                    description={`${quest.description} ${quest.progress}/${quest.target}`}
                    right={
                      <div className="text-right">
                        <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Season</p>
                        <p className="mt-1 text-xs font-black text-primary">
                          {quest.reward.itemId ? "Prestige item" : `${quest.reward.gems ?? 0} Gems`}
                        </p>
                      </div>
                    }
                  />
                ))
              ) : (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  {isLoading ? "Loading prestige objectives..." : "No seasonal objectives are available right now."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
