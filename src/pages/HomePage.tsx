import { useEffect, useState } from "react";
import { Bell, ChevronRight, Eye, Flame, Swords, TimerReset, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import PuzzleRivalsLogo from "@/components/branding/PuzzleRivalsLogo";
import StockAvatar from "@/components/profile/StockAvatar";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import { loadDiscoveryContent, type GameContentSource } from "@/lib/game-content";
import { fetchLeaderboard } from "@/lib/player-data";
import { LEADERBOARD, getRankBand, getRankColor } from "@/lib/seed-data";
import type { DailyChallenge, LeaderboardEntry } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

function sourceLabel(source: GameContentSource) {
  return source === "supabase" ? "Live" : "Demo";
}

export default function HomePage() {
  const navigate = useNavigate();
  const { openSignUp } = useAuthDialog();
  const { user, canSave } = useAuth();
  const rankBand = getRankBand(user?.elo ?? 0);
  const [featuredPlayers, setFeaturedPlayers] = useState<LeaderboardEntry[]>([]);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [challengeSource, setChallengeSource] = useState<GameContentSource>("seed");
  const [leaderboardSource, setLeaderboardSource] = useState<GameContentSource>("seed");
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const winRate = user && user.matchesPlayed > 0 ? Math.round((user.wins / user.matchesPlayed) * 100) : 0;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsContentLoading(true);
      setContentError(null);

      try {
        const [entries, discovery] = await Promise.all([
          fetchLeaderboard(4),
          loadDiscoveryContent(),
        ]);

        if (cancelled) return;

        setFeaturedPlayers(entries.length > 0 ? entries : LEADERBOARD.slice(0, 4));
        setLeaderboardSource(entries.length > 0 ? "supabase" : "seed");
        setChallenge(discovery.dailyChallenges.find((entry) => !entry.isCompleted) ?? discovery.dailyChallenges[0] ?? null);
        setChallengeSource(discovery.sources.dailyChallenges);
      } catch (error) {
        if (cancelled) return;
        setContentError(error instanceof Error ? error.message : "Failed to load command deck content.");
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
  }, []);

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Command Deck"
          title={canSave ? `Welcome back, ${user?.username ?? "Player"}` : "Welcome to the Arena"}
          subtitle={
            canSave
              ? `${rankBand.label} rank with live stats active`
              : "Guests can explore every room. Sign up when you are ready to lock in progress."
          }
          right={
            <div className="spotlight-panel flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="section-kicker">Identity Deck</p>
                <p className="truncate text-lg font-black">{user?.username ?? "Guest Player"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{canSave ? "Account synced" : "Guest sandbox active"}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="profile-badge shrink-0"
              >
                <StockAvatar avatarId={user?.avatarId} size="sm" />
                <Bell size={16} className="text-white/55" />
              </button>
            </div>
          }
        />

        <section className="hero-panel">
          <div className="hero-grid">
            <div className="section-stack">
              <div className="command-panel-soft p-4 md:p-5">
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Arena Feed</p>
                    <h2 className="section-title">Pick a lane and start a run</h2>
                  </div>
                  <span className={`font-hud text-[10px] uppercase tracking-[0.2em] ${getRankColor(user?.rank ?? "bronze")}`}>
                    {rankBand.label}
                  </span>
                </div>
                <div className="action-grid">
                  <PuzzleTileButton
                    icon={Swords}
                    title={canSave ? "Ranked Match" : "Create Account"}
                    description={
                      canSave
                        ? "Queue live, climb the ladder, and stack new match history."
                        : "Unlock saved progress, ranks, matchmaking, and recovery features."
                    }
                    active
                    onClick={() => {
                      if (canSave) {
                        navigate("/match?mode=ranked");
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
                        : challenge?.title ?? "Daily Challenge"
                    }
                    description={
                      contentError ??
                      (isContentLoading
                        ? "Syncing the latest command deck snapshot."
                        : challenge?.description ?? "A fresh daily puzzle run.")
                    }
                    onClick={() => {
                      if (canSave) {
                        navigate("/match?mode=daily");
                        return;
                      }
                      openSignUp();
                    }}
                    right={
                      <span className="font-hud text-[10px] uppercase tracking-[0.18em] text-primary">
                        {isContentLoading ? "Syncing" : sourceLabel(challengeSource)}
                      </span>
                    }
                  />
                </div>
              </div>

              <div className="metric-grid">
                <div className="rich-stat">
                  <p className="hud-label">Coins</p>
                  <p className="stat-value text-coin">{(user?.coins ?? 0).toLocaleString()}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Build your loadout through matches and store drops.</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Gems</p>
                  <p className="stat-value text-primary">{user?.gems ?? 0}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Premium currency for pass, cosmetics, and quick unlocks.</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Win Rate</p>
                  <p className="stat-value">{winRate}%</p>
                  <p className="mt-2 text-xs text-muted-foreground">A fast snapshot of how well your puzzle instincts are landing.</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Streak</p>
                  <p className="stat-value text-primary">{user?.winStreak ?? 0}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Keep the line glowing by chaining clean wins back to back.</p>
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
                    <p className="section-kicker">Match of the Day</p>
                    <p className="text-lg font-black">Puzzle Rivals broadcast</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Featured logo slot stays branded here and acts as the app's spotlight panel.
                </p>
                <Button onClick={() => navigate("/play")} variant="outline" size="lg" className="w-full">
                  <Eye size={16} />
                  Explore Queue Modes
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
                <h2 className="section-title">{sourceLabel(leaderboardSource)} current standouts</h2>
              </div>
              <Button onClick={() => navigate("/tournaments")} variant="ghost" size="sm">
                <Trophy size={14} />
                View Circuit
              </Button>
            </div>
            <div className="section-stack">
              {featuredPlayers.length > 0 ? featuredPlayers.slice(0, 4).map((entry, index) => (
                <div key={entry.userId} className="command-panel-soft flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-primary/20 bg-primary/10 font-hud text-sm font-semibold text-primary">
                    #{index + 1}
                  </div>
                  <StockAvatar avatarId={entry.avatarId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-black">{entry.username}</p>
                    <p className={`font-hud text-[10px] uppercase tracking-[0.16em] ${getRankColor(entry.rankTier)}`}>
                      {entry.rankTier}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-primary">{entry.elo}</p>
                    <p className="text-xs text-muted-foreground">{entry.wins} wins</p>
                  </div>
                </div>
              )) : (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                  {contentError ?? "Leaderboard sync is still warming up."}
                </div>
              )}
            </div>
          </section>

          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Account State</p>
                <h2 className="section-title">{canSave ? "Live profile synced" : "Guest sandbox active"}</h2>
              </div>
            </div>
            <div className="section-stack">
              <div className="command-panel-soft flex items-center gap-4 p-4">
                <StockAvatar avatarId={user?.avatarId} size="md" />
                <div className="min-w-0">
                  <p className="hud-label">PuzzleTag</p>
                  <p className="truncate text-xl font-black">{user?.username ?? "Guest Player"}</p>
                </div>
              </div>
              <div className="info-grid">
                <div className="command-panel-soft p-4">
                  <p className="hud-label">Recovery</p>
                  <p className="mt-2 text-base font-black">
                    {user?.securityQuestionsConfigured ? "Configured" : "Not configured"}
                  </p>
                </div>
                <div className="command-panel-soft p-4">
                  <p className="hud-label">Weak Spot</p>
                  <p className="mt-2 text-base font-black">{user?.worstPuzzleType ?? "No data yet"}</p>
                </div>
              </div>
              <Button onClick={() => navigate("/profile")} variant="play" size="xl" className="w-full">
                <Eye size={16} />
                Open Profile Deck
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


