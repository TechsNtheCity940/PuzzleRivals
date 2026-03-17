import { useEffect, useMemo, useState } from "react";
import { Gift, Lock, Star, TrendingUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { getPassTierProgress, loadQuestSnapshot } from "@/lib/economy";
import { CURRENT_SEASON } from "@/lib/seed-data";
import { capturePayPalCheckout, createPayPalCheckout, fetchStorefront } from "@/lib/storefront";
import type { QuestDefinition } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
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
  const [dailyQuests, setDailyQuests] = useState<QuestDefinition[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<QuestDefinition[]>([]);
  const [seasonalQuests, setSeasonalQuests] = useState<QuestDefinition[]>([]);
  const [params, setParams] = useSearchParams();
  const { user, canSave, refreshUser } = useAuth();

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const [snapshot, quests] = await Promise.all([
          fetchStorefront(user),
          loadQuestSnapshot(user),
        ]);
        if (active) {
          setHasSeasonPass(Boolean(snapshot.wallet?.hasSeasonPass));
          setDailyQuests(quests.daily);
          setWeeklyQuests(quests.weekly);
          setSeasonalQuests(quests.seasonal);
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

  const { currentTier, nextTierXp, progressWithinTier } = useMemo(
    () => getPassTierProgress(user?.passXp ?? 0, CURRENT_SEASON.maxTier),
    [user?.passXp],
  );
  const focusedTracks = useMemo(() => {
    const start = Math.max(0, currentTier - 2);
    return CURRENT_SEASON.tracks.slice(start, start + 6).map((track) => ({
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
            <div className="spotlight-panel">
              <p className="section-kicker">{hasSeasonPass ? "Premium Track" : "Free Track"}</p>
              <p className="mt-2 text-3xl font-black">Tier {currentTier}/{CURRENT_SEASON.maxTier}</p>
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
                  <h2 className="section-title">{hasSeasonPass ? "Premium unlocked" : "Upgrade available"}</h2>
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
                Pass XP, rank points, and quest cadence now drive the season lane instead of generic account XP alone.
              </p>
            </div>

            {!hasSeasonPass ? (
              <div className="spotlight-panel flex flex-col justify-between gap-4">
                <div>
                  <p className="section-kicker">Upgrade</p>
                  <p className="mt-2 text-3xl font-black">Unlock the premium track</p>
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
                <p className="stat-value">{hasSeasonPass ? "Premium" : "Free"}</p>
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
              {focusedTracks.map((track) => (
                <PuzzleTileButton
                  key={track.tier}
                  icon={track.isUnlocked ? Gift : Lock}
                  title={`Tier ${track.tier}`}
                  description={track.freeReward?.label ?? "No free reward"}
                  active={track.tier === currentTier}
                  right={
                    <div>
                      <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Premium</p>
                      <p className={`mt-1 text-xs font-black ${hasSeasonPass ? "text-primary" : "text-muted-foreground"}`}>
                        {track.premiumReward?.label ?? "-"}
                      </p>
                    </div>
                  }
                />
              ))}
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
              {[...dailyQuests, ...weeklyQuests].slice(0, 4).map((quest) => (
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
              ))}
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
              {seasonalQuests.map((quest) => (
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
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
