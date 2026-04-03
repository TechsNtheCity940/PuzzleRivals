import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Crown, Gift, Lock } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import CosmeticPreview from "@/components/cosmetics/CosmeticPreview";
import PageHeader from "@/components/layout/PageHeader";
import StockAvatar from "@/components/profile/StockAvatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { getPassTierProgress } from "@/lib/economy";
import {
  loadSeasonContent,
  type GameContentResolution,
  type SeasonContentSnapshot,
} from "@/lib/game-content";
import {
  findSeasonalCosmetic,
  NEON_RIVALS_SECOND_AVATAR_ID,
  NEON_RIVALS_SEASON_PASS_PRODUCT_ID,
  NEON_RIVALS_STRATEGIST_AVATAR_ID,
  NEON_RIVALS_TIER_SKIP_OFFERS,
} from "@/lib/season-content";
import { capturePayPalCheckout, createPayPalCheckout } from "@/lib/storefront";
import { FALLBACK_APP_RUNTIME_STATUS, loadAppRuntimeStatus } from "@/lib/app-status";
import type { SeasonReward } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

type PreviewKind = "theme" | "frame" | "player_card" | "banner" | "emblem" | "title";

function clearCheckoutParams(
  params: URLSearchParams,
  setParams: ReturnType<typeof useSearchParams>[1],
) {
  const next = new URLSearchParams(params);
  next.delete("checkout");
  next.delete("purchase");
  next.delete("product");
  setParams(next, { replace: true });
}

function previewKindForCategory(category: string): PreviewKind | null {
  if (
    category === "theme" ||
    category === "frame" ||
    category === "player_card" ||
    category === "banner" ||
    category === "emblem" ||
    category === "title"
  ) {
    return category;
  }
  if (category === "puzzle_theme") return "theme";
  return null;
}

function avatarIdForReward(itemId: string) {
  return itemId === "avatar_season1_neon_strategist"
    ? NEON_RIVALS_STRATEGIST_AVATAR_ID
    : NEON_RIVALS_SECOND_AVATAR_ID;
}

function describeSeasonResolution(resolution: GameContentResolution | undefined) {
  if (resolution === "fallback") return "Season pass data is unavailable here.";
  if (resolution === "unavailable") return "Season pass data is unavailable right now.";
  if (resolution === "empty") return "No active season pass is published right now.";
  return null;
}

function rewardMeta(reward?: SeasonReward) {
  if (!reward) {
    return {
      label: "No reward",
      detail: "",
      media: null as ReactNode,
    };
  }

  if (reward.itemId) {
    const cosmetic = findSeasonalCosmetic(reward.itemId);
    const previewKind = cosmetic ? previewKindForCategory(cosmetic.category) : null;

    if (cosmetic && previewKind) {
      return {
        label: reward.label,
        detail: cosmetic.category.replaceAll("_", " "),
        media: (
          <CosmeticPreview
            kind={previewKind}
            productId={cosmetic.id}
            label={reward.label}
            className="min-h-[96px]"
          />
        ),
      };
    }

    if (reward.itemId.startsWith("avatar_")) {
      return {
        label: reward.label,
        detail: "avatar",
        media: <StockAvatar avatarId={avatarIdForReward(reward.itemId)} size="md" className="mx-auto" />,
      };
    }
  }

  return {
    label: reward.label,
    detail: reward.type.replaceAll("_", " "),
    media: (
      <div className="flex min-h-[96px] items-center justify-center rounded-[20px] border border-white/10 bg-white/5 px-4 text-center text-sm font-black text-white">
        {reward.label}
      </div>
    ),
  };
}

function RewardLaneCard({
  label,
  reward,
  locked,
}: {
  label: string;
  reward?: SeasonReward;
  locked: boolean;
}) {
  const meta = rewardMeta(reward);

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-primary">
          {label}
        </p>
        {locked ? <Lock size={14} className="text-white/45" /> : <Gift size={14} className="text-primary" />}
      </div>
      {meta.media}
      <p className="mt-3 text-sm font-black text-white">{meta.label}</p>
      {meta.detail ? (
        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {meta.detail}
        </p>
      ) : null}
    </div>
  );
}

export default function SeasonPage() {
  const [seasonContent, setSeasonContent] = useState<SeasonContentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState(FALLBACK_APP_RUNTIME_STATUS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const { user, canSave, hasSession, refreshUser } = useAuth();
  const accountNeedsSync = hasSession && !user;

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
          const message = error instanceof Error ? error.message : "Failed to load season pass.";
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
    let active = true;
    void loadAppRuntimeStatus().then((status) => {
      if (active) {
        setRuntimeStatus(status);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const checkoutState = params.get("checkout");
    const purchaseId = params.get("purchase");

    if (checkoutState === "cancelled") {
      toast.message("Season pass checkout cancelled.");
      clearCheckoutParams(params, setParams);
      return;
    }

    if (checkoutState !== "paypal" || !purchaseId) {
      return;
    }

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
        toast.success("Season pass unlocked.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to capture season pass purchase.",
        );
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

  const season = seasonContent?.season ?? null;
  const commerceUnavailable = runtimeStatus.resolution === "live" && !runtimeStatus.commerceReady;
  const { currentTier, nextTierXp, progressWithinTier } = useMemo(
    () => getPassTierProgress(user?.passXp ?? 0, season?.maxTier ?? 40),
    [season?.maxTier, user?.passXp],
  );
  const activeTrack = useMemo(() => {
    if (!season) return null;
    return season.tracks.find((track) => track.tier === Math.min(currentTier + 1, season.maxTier)) ?? season.tracks[season.tracks.length - 1] ?? null;
  }, [currentTier, season]);

  async function startSeasonCheckout(productId: string, itemLabel: string, requiresSeasonPass = false) {
    if (accountNeedsSync) {
      toast.error("Profile sync is required before unlocking season rewards.");
      return;
    }
    if (!canSave) {
      toast.error("Sign in before buying season rewards.");
      return;
    }
    if (commerceUnavailable) {
      toast.error("Season pass checkout is paused right now.");
      return;
    }
    if (requiresSeasonPass && !seasonContent?.hasSeasonPass) {
      toast.error("Buy the season pass before using tier skips.");
      return;
    }

    setIsPurchasing(true);
    try {
      const response = await createPayPalCheckout(productId, "/season");
      window.location.assign(response.approvalUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to start checkout for ${itemLabel}.`,
      );
      setIsPurchasing(false);
    }
  }

  const subtitle = loadError
    ? loadError
    : accountNeedsSync
      ? "Your season pass data is unavailable for this signed-in account."
      : commerceUnavailable
        ? "Season rewards are live. Checkout is temporarily paused."
        : isLoading
          ? "Loading season pass..."
          : describeSeasonResolution(seasonContent?.resolutions.season) ?? "Track your rank and unlock season rewards.";

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Season Pass"
          title={season ? `Season ${season.seasonNumber}: ${season.name}` : "Season 1 Pass"}
          subtitle={subtitle}
          right={
            <div className="spotlight-panel min-w-[280px]">
              <p className="section-kicker">Current Rank</p>
              <p className="mt-2 text-3xl font-black">Rank {currentTier}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {progressWithinTier}% to the next reward
              </p>
              <div className="mt-4 h-3 rounded-full border border-white/10 bg-white/5 p-[2px]">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progressWithinTier}%` }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>{user?.passXp ?? 0} XP</span>
                <span>{nextTierXp} XP to next rank</span>
              </div>
            </div>
          }
        />

        <section className="section-panel">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="command-panel-soft p-5">
              <p className="section-kicker">Current Reward Target</p>
              <h2 className="section-title mt-2">
                {activeTrack ? `Rank ${activeTrack.tier}` : "Season rewards"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Free players unlock coins and hints. Season Pass players unlock every premium cosmetic reward on the track as they rank up.
              </p>
              {activeTrack ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <RewardLaneCard
                    label="Free Reward"
                    reward={activeTrack.freeReward}
                    locked={activeTrack.tier > currentTier}
                  />
                  <RewardLaneCard
                    label="Season Pass Reward"
                    reward={activeTrack.premiumReward}
                    locked={!seasonContent?.hasSeasonPass || activeTrack.tier > currentTier}
                  />
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-6 text-sm text-muted-foreground">
                  No season pass is available right now.
                </div>
              )}
            </div>

            <div className="spotlight-panel flex flex-col gap-4">
              <div>
                <p className="section-kicker">Access</p>
                <p className="mt-2 text-3xl font-black">
                  {seasonContent?.hasSeasonPass ? "Season Pass Active" : "Unlock Premium Track"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {seasonContent?.hasSeasonPass
                    ? "Premium rewards unlock as you rank up."
                    : "Buy the pass to unlock every premium reward on the season track."}
                </p>
              </div>

              <Button
                variant="prestige"
                size="xl"
                className="w-full"
                disabled={isLoading || isPurchasing || accountNeedsSync || commerceUnavailable || Boolean(seasonContent?.hasSeasonPass)}
                onClick={() => void startSeasonCheckout(NEON_RIVALS_SEASON_PASS_PRODUCT_ID, "the season pass")}
              >
                <Crown size={14} />
                {seasonContent?.hasSeasonPass
                  ? "Season Pass Active"
                  : isPurchasing
                    ? "Opening..."
                    : commerceUnavailable
                      ? "Checkout Paused"
                      : "Buy Season Pass"}
              </Button>

              <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
                <p className="section-kicker">Tier Skips</p>
                <div className="mt-4 grid gap-3">
                  {NEON_RIVALS_TIER_SKIP_OFFERS.map((offer) => (
                    <Button
                      key={offer.id}
                      variant="outline"
                      size="lg"
                      className="w-full justify-between"
                      disabled={isLoading || isPurchasing || accountNeedsSync || commerceUnavailable || !seasonContent?.hasSeasonPass}
                      onClick={() => void startSeasonCheckout(offer.id, offer.name, true)}
                    >
                      <span>{offer.name}</span>
                      <span>${offer.priceUsd?.toFixed(2) ?? "0.00"}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-panel">
          <div className="section-header">
            <div>
              <p className="section-kicker">Reward Track</p>
              <h2 className="section-title">Free and Season Pass rewards by rank</h2>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4">
            {season?.tracks.map((track) => {
              const isCurrent = track.tier === currentTier;
              const isUnlocked = track.tier <= currentTier;
              return (
                <article
                  key={track.tier}
                  className={`min-w-[260px] rounded-[28px] border p-4 ${
                    isCurrent
                      ? "border-primary bg-primary/10"
                      : isUnlocked
                        ? "border-white/12 bg-slate-950/75"
                        : "border-white/8 bg-slate-950/55"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-primary">
                        Rank {track.tier}
                      </p>
                      <p className="mt-2 text-lg font-black text-white">
                        {isCurrent ? "Current Rank" : isUnlocked ? "Unlocked" : "Locked"}
                      </p>
                    </div>
                    {isCurrent ? <Crown size={18} className="text-primary" /> : null}
                  </div>
                  <div className="mt-4 space-y-4">
                    <RewardLaneCard
                      label="Free"
                      reward={track.freeReward}
                      locked={!isUnlocked}
                    />
                    <RewardLaneCard
                      label="Season Pass"
                      reward={track.premiumReward}
                      locked={!seasonContent?.hasSeasonPass || !isUnlocked}
                    />
                  </div>
                </article>
              );
            }) ?? (
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-sm text-muted-foreground">
                No season rewards are available right now.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
