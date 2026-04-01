import { useEffect, useMemo, useState } from "react";
import { Crown, Gift, Lock, Sparkles, Trophy } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import CosmeticPreview from "@/components/cosmetics/CosmeticPreview";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import StockAvatar from "@/components/profile/StockAvatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { getPassTierProgress } from "@/lib/economy";
import {
  loadSeasonContent,
  type GameContentResolution,
  type GameContentSource,
  type SeasonContentSnapshot,
} from "@/lib/game-content";
import {
  findSeasonalCosmetic,
  NEON_RIVALS_BOARD_SHOWCASE,
  NEON_RIVALS_COSMETICS,
  NEON_RIVALS_ELITE_FRAMES,
  NEON_RIVALS_PREMIUM_AVATAR_TIER,
  NEON_RIVALS_RANKED_REWARDS,
  NEON_RIVALS_SECOND_AVATAR_ID,
  NEON_RIVALS_STRATEGIST_AVATAR_ID,
  NEON_RIVALS_STRATEGIST_CLIP,
} from "@/lib/season-content";
import { capturePayPalCheckout, createPayPalCheckout } from "@/lib/storefront";
import { FALLBACK_APP_RUNTIME_STATUS, loadAppRuntimeStatus } from "@/lib/app-status";
import { useAuth } from "@/providers/AuthProvider";

const BATTLE_PASS_PRODUCT_ID = "s_6";

type PreviewKind = "theme" | "frame" | "player_card" | "banner" | "emblem";

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

function sourceLabel(source: GameContentSource) {
  return source === "supabase" ? "Live" : "Offline";
}

function avatarIdForReward(itemId: string) {
  if (itemId === "avatar_season1_neon_strategist")
    return NEON_RIVALS_STRATEGIST_AVATAR_ID;
  return NEON_RIVALS_SECOND_AVATAR_ID;
}

function previewKindForCategory(category: string): PreviewKind | null {
  if (category === "puzzle_theme") return "theme";
  if (
    category === "frame" ||
    category === "player_card" ||
    category === "banner" ||
    category === "emblem"
  ) {
    return category;
  }
  return null;
}

function rewardLaneLabel(
  itemId: string,
  season: SeasonContentSnapshot["season"] | null,
) {
  if (!season) return "Season reward";
  const premiumTrack = season.tracks.find(
    (track) => track.premiumReward?.itemId === itemId,
  );
  if (premiumTrack) return `Premium Tier ${premiumTrack.tier}`;
  const freeTrack = season.tracks.find(
    (track) => track.freeReward?.itemId === itemId,
  );
  if (freeTrack) return `Free Tier ${freeTrack.tier}`;
  if (itemId === "emblem_voltage") return "Season milestone";
  if (
    itemId === "banner_season1_neon_rivals" ||
    itemId === "ranked_card_season1_highrank"
  )
    return "Ranked reward";
  return "Season reward";
}

function formatFallbackRewardLabel(itemId: string) {
  return itemId
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function describeQuestReward(
  reward: {
    coins?: number;
    gems?: number;
    shards?: number;
    passXp?: number;
    itemId?: string;
  },
  season: SeasonContentSnapshot["season"] | null,
) {
  if (reward.itemId) {
    const cosmetic = findSeasonalCosmetic(reward.itemId);
    const previewKind = cosmetic
      ? previewKindForCategory(cosmetic.category)
      : null;
    return {
      label: cosmetic?.name ?? formatFallbackRewardLabel(reward.itemId),
      eyebrow: cosmetic ? rewardLaneLabel(cosmetic.id, season) : "Season reward",
      previewKind,
      previewId: cosmetic?.id ?? null,
    };
  }

  if (reward.gems)
    return {
      label: `${reward.gems} Gems`,
      eyebrow: "Currency reward",
      previewKind: null,
      previewId: null,
    };
  if (reward.shards)
    return {
      label: `${reward.shards} Shards`,
      eyebrow: "Currency reward",
      previewKind: null,
      previewId: null,
    };
  if (reward.passXp)
    return {
      label: `${reward.passXp} Pass XP`,
      eyebrow: "Progress reward",
      previewKind: null,
      previewId: null,
    };
  if (reward.coins)
    return {
      label: `${reward.coins} Coins`,
      eyebrow: "Currency reward",
      previewKind: null,
      previewId: null,
    };

  return {
    label: "Season reward",
    eyebrow: "Reward",
    previewKind: null,
    previewId: null,
  };
}

function describeSeasonResolution(
  resolution: GameContentResolution | undefined,
) {
  if (resolution === "fallback") {
    return "Season data is unavailable in this environment.";
  }
  if (resolution === "unavailable") {
    return "Live season metadata is currently unavailable.";
  }
  if (resolution === "empty") {
    return "The live season feed is connected, but no active season is published right now.";
  }
  return null;
}

export default function SeasonPage() {
  const [seasonContent, setSeasonContent] =
    useState<SeasonContentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState(FALLBACK_APP_RUNTIME_STATUS);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const { user, canSave, hasSession, refreshUser, signOut } = useAuth();
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
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load season pass.",
          );
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to load season pass.",
          );
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
      toast.message("Battle pass checkout cancelled.");
      clearCheckoutParams(params, setParams);
      return;
    }
    if (checkoutState !== "paypal" || !purchaseId) return;

    let active = true;
    async function capture() {
      if (commerceUnavailable) {
        toast.error("Battle pass checkout is paused until live PayPal credentials are configured.");
        return;
      }
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
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to capture battle pass purchase.",
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
  const seasonResolution = seasonContent?.resolutions.season;
  const questsResolution = seasonContent?.resolutions.quests;
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
    if (accountNeedsSync) {
      toast.error("Profile sync is required before unlocking the battle pass.");
      return;
    }
    if (!canSave) {
      toast.error("Sign in before buying the battle pass.");
      return;
    }
    if (commerceUnavailable) {
      toast.error("Battle pass checkout is paused until live PayPal credentials are configured.");
      return;
    }
    setIsPurchasing(true);
    try {
      const response = await createPayPalCheckout(
        BATTLE_PASS_PRODUCT_ID,
        "/season",
      );
      window.location.assign(response.approvalUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout.",
      );
      setIsPurchasing(false);
    }
  }

  const subtitle = loadError
    ? loadError
    : accountNeedsSync
      ? "You are signed in, but the live season profile payload is unavailable. Sign out and retry before claiming rewards."
      : commerceUnavailable
        ? "Live season data is connected, but premium checkout is paused until PayPal credentials are complete."
        : isLoading
          ? "Loading Neon Rivals season lane..."
          : (describeSeasonResolution(seasonResolution) ??
            `Electric | Competitive | Puzzle Arena | ${sourceLabel(seasonContent?.sources.season ?? "supabase")} rewards`);

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Season 1 Live Event"
          title={
            season
              ? `Season ${season.seasonNumber}: ${season.name}`
              : "Season 1: Neon Rivals"
          }
          subtitle={subtitle}
          right={
            accountNeedsSync ? (
              <div className="spotlight-panel flex min-w-[260px] flex-col gap-3">
                <div>
                  <p className="section-kicker">Season Sync</p>
                  <p className="mt-2 text-lg font-black">Profile unavailable</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The season lane is live, but your account payload did not
                    load. Sign out to retry.
                  </p>
                </div>
                <Button
                  onClick={() => void signOut()}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Sign Out To Retry
                </Button>
              </div>
            ) : (
              <div className="spotlight-panel">
                <p className="section-kicker">Neon Rivals</p>
                <p className="mt-2 text-3xl font-black">
                  Tier {currentTier}/{season?.maxTier ?? 40}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {progressWithinTier}% toward the next unlock.
                </p>
              </div>
            )
          }
        />

        <section className="hero-panel">
          <div className="hero-grid">
            <div className="command-panel-soft p-5">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Season Theme</p>
                  <h2 className="section-title">Neon Rivals is live</h2>
                </div>
                <Sparkles size={18} className="text-primary" />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Electric blue, cyan, magenta, and violet pressure the arena,
                with a neon-gold strategist reward sitting at premium tier{" "}
                {NEON_RIVALS_PREMIUM_AVATAR_TIER}. The whole lane is built
                around clean sci-fi contrast instead of noisy effects.
              </p>
              <div className="mt-5 season-reward-grid">
                <div className="season-cosmetic-card season-cosmetic-card-animated">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="section-kicker">Featured Avatar</p>
                      <p className="mt-2 text-lg font-black">Neon Strategist</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Premium tier {NEON_RIVALS_PREMIUM_AVATAR_TIER} exclusive
                      </p>
                    </div>
                    <StockAvatar
                      avatarId={NEON_RIVALS_STRATEGIST_AVATAR_ID}
                      size="md"
                    />
                  </div>
                </div>
                <div className="season-cosmetic-card">
                  <p className="section-kicker">Signature Theme</p>
                  <CosmeticPreview
                    kind="theme"
                    productId="puzzle_theme_electric"
                    className="mt-4 min-h-[110px]"
                  />
                </div>
              </div>
            </div>

            {!seasonContent?.hasSeasonPass ? (
              <div className="spotlight-panel flex flex-col justify-between gap-4">
              {commerceUnavailable ? (
                <div className="rounded-[22px] border border-amber-400/20 bg-amber-500/8 px-4 py-3 text-sm text-muted-foreground">
                  Battle pass checkout is paused until live PayPal credentials are complete. The season lane, rewards, and previews remain visible.
                </div>
              ) : null}
                <div>
                  <p className="section-kicker">Premium Track</p>
                  <p className="mt-2 text-3xl font-black">
                    Unlock the full Neon Rivals lane
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Strategist avatar, pulse frame, Neon Circuit card, and the
                    full premium reward cadence.
                  </p>
                </div>
                <Button
                  variant="prestige"
                  size="xl"
                  className="w-full"
                  disabled={isLoading || isPurchasing || accountNeedsSync || commerceUnavailable}
                  onClick={() => void unlockPremiumTrack()}
                >
                  <Crown size={14} />
                  {accountNeedsSync
                    ? "Profile Sync Required"
                    : commerceUnavailable
                      ? "Checkout Paused"
                      : isPurchasing
                        ? "Opening..."
                      : "Unlock Neon Rivals Pass"}
                </Button>
              </div>
            ) : (
              <div className="spotlight-panel flex flex-col justify-between gap-4 text-center">
                <div>
                  <p className="section-kicker">Premium Active</p>
                  <p className="mt-2 text-3xl font-black text-primary">
                    Rewards live
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Strategist unlock status:{" "}
                    {currentTier >= NEON_RIVALS_PREMIUM_AVATAR_TIER
                      ? "ready to equip"
                      : `reach tier ${NEON_RIVALS_PREMIUM_AVATAR_TIER}`}
                  </p>
                </div>
                <StockAvatar
                  avatarId={NEON_RIVALS_STRATEGIST_AVATAR_ID}
                  size="lg"
                  className="mx-auto"
                />
              </div>
            )}
          </div>
        </section>

        <section className="section-panel overflow-hidden">
          <div className="section-header">
            <div>
              <p className="section-kicker">Season Broadcast</p>
              <h2 className="section-title">Live Neon Rivals media pack</h2>
            </div>
            <Sparkles size={18} className="text-primary" />
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
            <div className="command-panel-soft overflow-hidden border border-white/10 bg-slate-950/65 p-4">
              <p className="section-kicker">Season Banner</p>
              <img
                src="/cosmetics/banners/neon-rivals-season-banner.svg"
                alt="Season 1 Neon Rivals banner"
                className="mt-4 w-full rounded-[24px] border border-white/10 bg-slate-950/80 object-cover shadow-[0_18px_48px_rgba(8,12,24,0.38)]"
                loading="lazy"
              />
            </div>
            <div className="command-panel-soft overflow-hidden border border-primary/20 bg-slate-950/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Strategist Motion</p>
                  <h3 className="mt-2 text-lg font-black">
                    Season reward preview
                  </h3>
                </div>
                <StockAvatar
                  avatarId={NEON_RIVALS_STRATEGIST_AVATAR_ID}
                  size="sm"
                />
              </div>
              <video
                className="mt-4 aspect-[4/5] w-full rounded-[24px] border border-yellow-300/20 bg-black/80 object-cover shadow-[0_20px_54px_rgba(250,204,21,0.16)]"
                src={NEON_RIVALS_STRATEGIST_CLIP}
                poster="/avatars/season1-neon-strategist.svg"
                autoPlay
                loop
                muted
                playsInline
                controls
                preload="metadata"
              />
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Neon-yellow strategist motion clip used to spotlight the premium
                tier {NEON_RIVALS_PREMIUM_AVATAR_TIER} reward without adding a
                heavy new animation system.
              </p>
            </div>
          </div>
        </section>

        <section className="section-panel">
          <div className="section-header">
            <div>
              <p className="section-kicker">Puzzle Board Showcase</p>
              <h2 className="section-title">Electric arena board skins</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {NEON_RIVALS_BOARD_SHOWCASE.map((board) => (
              <article
                key={board.id}
                className="command-panel-soft overflow-hidden border border-white/10 bg-slate-950/65 p-3"
              >
                <img
                  src={board.assetRef}
                  alt={board.label}
                  className="aspect-[4/3] w-full rounded-[20px] border border-white/10 bg-slate-950/80 object-cover"
                  loading="lazy"
                />
                <div className="mt-3">
                  <p className="text-sm font-black text-white">{board.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {board.summary}
                  </p>
                </div>
              </article>
            ))}
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
                <p className="stat-value">
                  {seasonContent?.hasSeasonPass ? "Premium" : "Free"}
                </p>
              </div>
              <div className="rich-stat">
                <p className="hud-label">Rank Points</p>
                <p className="stat-value text-gradient-prestige">
                  {user?.rankPoints ?? 0}
                </p>
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
              {focusedTracks.length > 0 ? (
                focusedTracks.map((track) => (
                  <PuzzleTileButton
                    key={track.tier}
                    icon={track.isUnlocked ? Gift : Lock}
                    title={`Tier ${track.tier}`}
                    description={track.freeReward?.label ?? "No free reward"}
                    active={track.tier === currentTier}
                    right={
                      <div>
                        <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          Premium
                        </p>
                        <p
                          className={`mt-1 text-xs font-black ${seasonContent?.hasSeasonPass ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {track.premiumReward?.label ?? "-"}
                        </p>
                      </div>
                    }
                  />
                ))
              ) : (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading season rewards..."
                    : (describeSeasonResolution(seasonResolution) ??
                      "No reward lane is available yet.")}
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="section-panel">
          <div className="section-header">
            <div>
              <p className="section-kicker">Season Reward Catalog</p>
              <h2 className="section-title">Everything inside Neon Rivals</h2>
            </div>
          </div>
          <div className="season-reward-grid">
            {NEON_RIVALS_COSMETICS.map((reward) => {
              const previewKind = previewKindForCategory(reward.category);
              return (
                <div
                  key={reward.id}
                  className={`season-cosmetic-card ${reward.isAnimated ? "season-cosmetic-card-animated" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="section-kicker">
                        {rewardLaneLabel(reward.id, season)}
                      </p>
                      <h3 className="mt-2 text-lg font-black">{reward.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {reward.themeTags.join(" | ")}
                      </p>
                    </div>
                    {reward.category === "avatar" ? (
                      <StockAvatar
                        avatarId={avatarIdForReward(reward.id)}
                        size="sm"
                      />
                    ) : null}
                  </div>
                  {previewKind ? (
                    <CosmeticPreview
                      kind={previewKind}
                      productId={reward.id}
                      className="mt-4 min-h-[112px]"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className="section-panel">
          <div className="section-header">
            <div>
              <p className="section-kicker">Ranked Rewards</p>
              <h2 className="section-title">
                Neon badge tiers and elite finishers
              </h2>
            </div>
            <Trophy size={18} className="text-primary" />
          </div>
          <div className="season-ranked-grid">
            {NEON_RIVALS_RANKED_REWARDS.map((reward) => (
              <div key={reward.tier} className="ranked-reward-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="section-kicker">{reward.tier}</p>
                    <h3 className="mt-2 text-lg font-black">
                      {reward.badgeLabel}
                    </h3>
                  </div>
                  {reward.badgeAssetRef ? (
                    <div className="flex flex-col items-end gap-2">
                      <img
                        src={reward.badgeAssetRef}
                        alt={`${reward.badgeLabel} badge`}
                        className="h-16 w-16 rounded-2xl object-contain drop-shadow-[0_0_20px_rgba(106,222,255,0.28)]"
                        loading="lazy"
                      />
                      <span
                        className={`season-rank-badge ${reward.accentClassName ?? ""}`}
                      >
                        {reward.tier}
                      </span>
                    </div>
                  ) : (
                    <span
                      className={`season-rank-badge ${reward.accentClassName ?? ""}`}
                    >
                      {reward.tier}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {reward.summary}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {reward.frameId ? (
                    <CosmeticPreview
                      kind="frame"
                      productId={reward.frameId}
                      className="min-h-[92px]"
                    />
                  ) : null}
                  {reward.bannerId ? (
                    <CosmeticPreview
                      kind="banner"
                      productId={reward.bannerId}
                      className="min-h-[92px]"
                    />
                  ) : null}
                  {reward.playerCardId ? (
                    <CosmeticPreview
                      kind="player_card"
                      productId={reward.playerCardId}
                      className="min-h-[92px] sm:col-span-2"
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 season-reward-grid">
            {NEON_RIVALS_ELITE_FRAMES.map((frame) => (
              <div key={frame.id} className="season-cosmetic-card">
                <p className="section-kicker">Elite Frame Color</p>
                <h3 className="mt-2 text-lg font-black">{frame.name}</h3>
                <div className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/70 p-3">
                  <img
                    src={frame.assetRef}
                    alt={`${frame.name} frame`}
                    className="mx-auto aspect-square w-full max-w-[180px] object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="page-grid">
          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Daily + Weekly</p>
                <h2 className="section-title">Mission cadence</h2>
              </div>
            </div>
            <div className="section-stack">
              {(seasonContent
                ? [
                    ...seasonContent.quests.daily,
                    ...seasonContent.quests.weekly,
                  ].slice(0, 4)
                : []
              ).length > 0 ? (
                [
                  ...(seasonContent?.quests.daily ?? []),
                  ...(seasonContent?.quests.weekly ?? []),
                ]
                  .slice(0, 4)
                  .map((quest) => (
                    <PuzzleTileButton
                      key={quest.id}
                      icon={Gift}
                      title={quest.title}
                      description={`${quest.description} ${quest.progress}/${quest.target}`}
                      right={
                        <div className="text-right">
                          <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            {quest.track}
                          </p>
                          <p className="mt-1 text-xs font-black text-primary">
                            +{quest.reward.passXp ?? 0} PX / +
                            {quest.reward.coins ?? 0}C
                          </p>
                        </div>
                      }
                    />
                  ))
              ) : (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading mission cadence..."
                    : questsResolution === "unavailable"
                      ? "Live mission data is currently unavailable."
                      : "No daily or weekly quests are available right now."}
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
                seasonContent?.quests.seasonal.map((quest) => {
                  const rewardDisplay = describeQuestReward(quest.reward, season);
                  return (
                    <PuzzleTileButton
                      key={quest.id}
                      icon={Lock}
                      media={
                        rewardDisplay.previewKind && rewardDisplay.previewId ? (
                          <CosmeticPreview
                            kind={rewardDisplay.previewKind}
                            productId={rewardDisplay.previewId}
                            className="h-[72px] w-[72px] rounded-[20px]"
                          />
                        ) : undefined
                      }
                      title={quest.title}
                      description={`${quest.description} ${quest.progress}/${quest.target}`}
                      right={
                        <div className="text-right">
                          <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                            {rewardDisplay.eyebrow}
                          </p>
                          <p className="mt-1 text-xs font-black text-primary">
                            {rewardDisplay.label}
                          </p>
                        </div>
                      }
                    />
                  );
                })
              ) : (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  {isLoading
                    ? "Loading prestige objectives..."
                    : questsResolution === "unavailable"
                      ? "Live seasonal objectives are currently unavailable."
                      : "No seasonal objectives are available right now."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}





