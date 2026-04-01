import { useEffect, useState } from "react";
import {
  Bell,
  ChevronRight,
  Eye,
  Flame,
  LifeBuoy,
  Shield,
  Swords,
  TimerReset,
  Trophy,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import PuzzleRivalsLogo from "@/components/branding/PuzzleRivalsLogo";
import StockAvatar from "@/components/profile/StockAvatar";
import IdentityLoadoutCard from "@/components/cosmetics/IdentityLoadoutCard";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import {
  loadDiscoveryContent,
  loadProfileContent,
  type GameContentResolution,
  type GameContentSource,
} from "@/lib/game-content";
import { isOwnerUser } from "@/lib/dev-account";
import { getRankBand, getRankColor } from "@/lib/seed-data";
import type {
  DailyChallenge,
  LeaderboardEntry,
  ProfileActivityEvent,
} from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

function sourceLabel(source: GameContentSource) {
  return source === "supabase" ? "Live" : "Offline";
}

function formatActivityTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "Recent";
  }

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60_000),
  );
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function describeResolution(
  resolution: GameContentResolution,
  messages: {
    empty: string;
    unavailable: string;
    fallback: string;
  },
) {
  if (resolution === "empty") return messages.empty;
  if (resolution === "unavailable") return messages.unavailable;
  return messages.fallback;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { openSignUp } = useAuthDialog();
  const { user, canSave, hasSession, signOut } = useAuth();
  const accountNeedsSync = hasSession && !user;
  const rankBand = getRankBand(user?.elo ?? 0);
  const [featuredPlayers, setFeaturedPlayers] = useState<LeaderboardEntry[]>(
    [],
  );
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [activityPreview, setActivityPreview] = useState<
    ProfileActivityEvent[]
  >([]);
  const [challengeSource, setChallengeSource] =
    useState<GameContentSource>("supabase");
  const [challengeResolution, setChallengeResolution] =
    useState<GameContentResolution>("unavailable");
  const [leaderboardSource, setLeaderboardSource] =
    useState<GameContentSource>("supabase");
  const [leaderboardResolution, setLeaderboardResolution] =
    useState<GameContentResolution>("unavailable");
  const [activitySource, setActivitySource] =
    useState<GameContentSource>("supabase");
  const [activityResolution, setActivityResolution] =
    useState<GameContentResolution>("unavailable");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const winRate =
    user && user.matchesPlayed > 0
      ? Math.round((user.wins / user.matchesPlayed) * 100)
      : 0;
  const ownerAccess = isOwnerUser(user);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsContentLoading(true);
      setContentError(null);

      try {
        const [discovery, profile] = await Promise.all([
          loadDiscoveryContent(),
          loadProfileContent(user?.id),
        ]);

        if (cancelled) return;

        setFeaturedPlayers(profile.leaderboard.slice(0, 4));
        setLeaderboardSource(profile.sources.leaderboard);
        setLeaderboardResolution(profile.resolutions.leaderboard);
        setChallenge(
          discovery.dailyChallenges.find((entry) => !entry.isCompleted) ??
            discovery.dailyChallenges[0] ??
            null,
        );
        setChallengeSource(discovery.sources.dailyChallenges);
        setChallengeResolution(discovery.resolutions.dailyChallenges);
        setActivityPreview(profile.activityFeed.slice(0, 2));
        setActivitySource(profile.sources.activityFeed);
        setActivityResolution(profile.resolutions.activityFeed);
        setUnreadCount(
          profile.activityFeed.filter((entry) => !entry.isRead).length,
        );
      } catch (error) {
        if (cancelled) return;
        setContentError(
          error instanceof Error
            ? error.message
            : "Failed to load command deck content.",
        );
      } finally {
        if (!cancelled) {
          setIsContentLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const primaryAlert = activityPreview[0] ?? null;
  const leaderboardEmptyMessage = contentError
    ? contentError
    : describeResolution(leaderboardResolution, {
        empty:
          "Live ladder entries will appear here as soon as ranked results land.",
        unavailable: "Live leaderboard data is currently unavailable.",
        fallback: "Leaderboard data is unavailable in this environment.",
      });
  const activityEmptyMessage = isContentLoading
    ? "Loading alerts..."
    : activityResolution === "empty"
      ? canSave
        ? "Your live activity stream is empty right now. Match results, purchases, and social updates will appear here automatically."
        : "Sign in to start a live activity stream across devices."
      : describeResolution(activityResolution, {
          empty: "Your live activity stream is empty right now.",
          unavailable: "Live activity data is currently unavailable.",
          fallback: "Activity data is unavailable in this environment.",
        });
  const challengeDescription =
    contentError ??
    (isContentLoading
      ? "Syncing the latest command deck snapshot."
      : (challenge?.description ??
        describeResolution(challengeResolution, {
          empty:
            "The live challenge queue is clear right now. Check back after the next rotation.",
          unavailable: "Live challenge data is currently unavailable.",
          fallback: "Challenge data is unavailable in this environment.",
        })));

  const headerTitle = accountNeedsSync
    ? "Profile sync required"
    : canSave
      ? `Welcome back, ${user?.username ?? "Player"}`
      : "Welcome to the Arena";
  const headerSubtitle = accountNeedsSync
    ? "You are signed in, but live profile data is unavailable right now. Sign out and back in after the backend recovers."
    : canSave
      ? `${rankBand.label} rank with live stats active`
      : "Guests can explore every room. Sign up when you are ready to lock in progress.";

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Command Deck"
          title={headerTitle}
          subtitle={headerSubtitle}
          right={
            accountNeedsSync ? (
              <div className="spotlight-panel flex min-w-[300px] flex-col gap-3">
                <div>
                  <p className="section-kicker">Identity Deck</p>
                  <p className="mt-2 text-lg font-black">Profile unavailable</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Auth is active, but the live profile row did not load. Sign
                    out to retry cleanly.
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
              <IdentityLoadoutCard
                username={user?.username ?? "Guest Player"}
                subtitle={canSave ? "Account synced" : "Guest session active"}
                avatarId={user?.avatarId}
                frameId={user?.frameId}
                playerCardId={user?.playerCardId}
                bannerId={user?.bannerId}
                emblemId={user?.emblemId}
                titleId={user?.titleId}
                compact
                className="min-w-[320px]"
                right={
                  <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    className="profile-badge relative shrink-0"
                  >
                    <StockAvatar avatarId={user?.avatarId} size="sm" />
                    <Bell size={16} className="text-white/55" />
                    {canSave && unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black leading-none text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    ) : null}
                  </button>
                }
              />
            )
          }
        />

        <section className="hero-panel">
          <div className="hero-grid">
            <div className="section-stack">
              <div className="command-panel-soft p-4 md:p-5">
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Arena Feed</p>
                    <h2 className="section-title">
                      Pick a lane and start a run
                    </h2>
                  </div>
                  <span
                    className={`font-hud text-[10px] uppercase tracking-[0.2em] ${getRankColor(user?.rank ?? "bronze")}`}
                  >
                    {rankBand.label}
                  </span>
                </div>
                <div className="action-grid">
                  <PuzzleTileButton
                    icon={Swords}
                    title={
                      accountNeedsSync
                        ? "Profile Sync Required"
                        : canSave
                          ? "Ranked Match"
                          : "Create Account"
                    }
                    description={
                      accountNeedsSync
                        ? "Your auth session is live, but the profile payload is unavailable. Sign out and retry before queuing."
                        : canSave
                          ? "Queue live, climb the ladder, and stack new match history."
                          : "Unlock saved progress, ranks, matchmaking, and recovery features."
                    }
                    active
                    onClick={() => {
                      if (accountNeedsSync) {
                        void signOut();
                        return;
                      }
                      if (canSave) {
                        navigate("/play/neon-rival");
                        return;
                      }
                      openSignUp();
                    }}
                    right={<ChevronRight size={16} className="text-primary" />}
                  />
                  <PuzzleTileButton
                    icon={Flame}
                    title={
                      isContentLoading
                        ? "Loading daily challenge..."
                        : (challenge?.title ?? "Daily Challenge")
                    }
                    description={challengeDescription}
                    onClick={() => {
                      if (accountNeedsSync) {
                        void signOut();
                        return;
                      }
                      if (canSave) {
                        navigate("/play/neon-rival");
                        return;
                      }
                      openSignUp();
                    }}
                    right={
                      <span className="font-hud text-[10px] uppercase tracking-[0.18em] text-primary">
                        {isContentLoading
                          ? "Syncing"
                          : sourceLabel(challengeSource)}
                      </span>
                    }
                  />
                </div>
              </div>

              <div className="metric-grid">
                <div className="rich-stat">
                  <p className="hud-label">Coins</p>
                  <p className="stat-value text-coin">
                    {(user?.coins ?? 0).toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Build your loadout through matches and store drops.
                  </p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Gems</p>
                  <p className="stat-value text-primary">{user?.gems ?? 0}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Premium currency for pass, cosmetics, and quick unlocks.
                  </p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Win Rate</p>
                  <p className="stat-value">{winRate}%</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    A fast snapshot of how well your puzzle instincts are
                    landing.
                  </p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Streak</p>
                  <p className="stat-value text-primary">
                    {user?.winStreak ?? 0}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Keep the line glowing by chaining clean wins back to back.
                  </p>
                </div>
              </div>
            </div>

            <div className="section-stack">
              <div className="spotlight-panel p-3">
                <PuzzleRivalsLogo />
              </div>
              <div className="command-panel-soft grid gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-primary/10 text-primary">
                    <TimerReset size={18} />
                  </div>
                  <div>
                    <p className="section-kicker">Command Alerts</p>
                    <p className="text-lg font-black">
                      {isContentLoading
                        ? "Syncing activity"
                        : unreadCount > 0
                          ? `${unreadCount} new updates`
                          : primaryAlert
                            ? "Recent account activity"
                            : "Activity stream standing by"}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {contentError ??
                    (isContentLoading
                      ? "Pulling your latest match, purchase, and social signals."
                      : primaryAlert
                        ? `${primaryAlert.title} | ${formatActivityTime(primaryAlert.occurredAt)}`
                        : "Recent results, purchases, and social updates will surface here as they land.")}
                </p>
                <div className="grid gap-2">
                  {activityPreview.length > 0 ? (
                    activityPreview.map((entry) => (
                      <div
                        key={entry.id}
                        className="command-panel-soft flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {entry.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {entry.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">
                            {sourceLabel(activitySource)}
                          </p>
                          <p className="mt-1 text-xs font-black text-muted-foreground">
                            {formatActivityTime(entry.occurredAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="command-panel-soft px-4 py-3 text-sm text-muted-foreground">
                      {activityEmptyMessage}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => navigate("/profile")}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <Eye size={16} />
                  Review Activity
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="page-grid">
          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Top Ladder</p>
                <h2 className="section-title">
                  {sourceLabel(leaderboardSource)} current standouts
                </h2>
              </div>
              <Button
                onClick={() => navigate("/tournaments")}
                variant="ghost"
                size="sm"
              >
                <Trophy size={14} />
                View Circuit
              </Button>
            </div>
            <div className="section-stack">
              {featuredPlayers.length > 0 ? (
                featuredPlayers.slice(0, 4).map((entry, index) => (
                  <div
                    key={entry.userId}
                    className="command-panel-soft flex items-center gap-4 p-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-primary/20 bg-primary/10 font-hud text-sm font-semibold text-primary">
                      #{index + 1}
                    </div>
                    <StockAvatar avatarId={entry.avatarId} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black">
                        {entry.username}
                      </p>
                      <p
                        className={`font-hud text-[10px] uppercase tracking-[0.16em] ${getRankColor(entry.rankTier)}`}
                      >
                        {entry.rankTier}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary">
                        {entry.elo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.wins} wins
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  {leaderboardEmptyMessage}
                </div>
              )}
            </div>
          </section>

          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Account State</p>
                <h2 className="section-title">
                  {accountNeedsSync
                    ? "Profile sync required"
                    : canSave
                      ? "Live profile synced"
                      : "Guest session active"}
                </h2>
              </div>
            </div>
            <div className="section-stack">
              {accountNeedsSync ? (
                <div className="command-panel-soft flex min-h-[220px] flex-col justify-center gap-4 p-5">
                  <div>
                    <p className="text-lg font-black">
                      Live profile unavailable
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      This account is authenticated, but the profile payload did
                      not load. Sign out, then sign back in once the backend row
                      is available again.
                    </p>
                  </div>
                  <Button
                    onClick={() => void signOut()}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    Sign Out To Retry
                  </Button>
                </div>
              ) : (
                <>
                  <IdentityLoadoutCard
                    username={user?.username ?? "Guest Player"}
                    subtitle={
                      canSave
                        ? "Live identity synced"
                        : "Guest identity loadout"
                    }
                    avatarId={user?.avatarId}
                    frameId={user?.frameId}
                    playerCardId={user?.playerCardId}
                    bannerId={user?.bannerId}
                    emblemId={user?.emblemId}
                    titleId={user?.titleId}
                  />
                  <div className="info-grid">
                    <div className="command-panel-soft p-4">
                      <p className="hud-label">Recovery</p>
                      <p className="mt-2 text-base font-black">
                        {user?.securityQuestionsConfigured
                          ? "Configured"
                          : "Not configured"}
                      </p>
                    </div>
                    <div className="command-panel-soft p-4">
                      <p className="hud-label">Weak Spot</p>
                      <p className="mt-2 text-base font-black">
                        {user?.worstPuzzleType ?? "No data yet"}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/profile")}
                    variant="play"
                    size="xl"
                    className="w-full"
                  >
                    <Eye size={16} />
                    Open Profile Deck
                  </Button>
                  <Button
                    onClick={() => navigate("/friends")}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    <Users size={16} />
                    Open Friends Console
                  </Button>
                  <Button
                    onClick={() => navigate("/support")}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    <LifeBuoy size={16} />
                    Report Issue
                  </Button>
                  {ownerAccess ? (
                    <Button
                      onClick={() => navigate("/admin")}
                      variant="outline"
                      size="lg"
                      className="w-full"
                    >
                      <Shield size={16} />
                      Open Admin Console
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
