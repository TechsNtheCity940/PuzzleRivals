import { useEffect, useState } from "react";
import { Bell, ChevronRight, Crown, Eye, Flame, Swords } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import PuzzleRivalsLogo from "@/components/branding/PuzzleRivalsLogo";
import StockAvatar from "@/components/profile/StockAvatar";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import { fetchLeaderboard } from "@/lib/player-data";
import { DAILY_CHALLENGES, getRankBand, getRankColor } from "@/lib/seed-data";
import type { LeaderboardEntry } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

export default function HomePage() {
  const navigate = useNavigate();
  const { openSignUp } = useAuthDialog();
  const { user, canSave, isReady } = useAuth();
  const rankBand = getRankBand(user?.elo ?? 0);
  const [featuredPlayers, setFeaturedPlayers] = useState<LeaderboardEntry[]>([]);
  const winRate = user && user.matchesPlayed > 0 ? Math.round((user.wins / user.matchesPlayed) * 100) : 0;

  useEffect(() => {
    let cancelled = false;
    void fetchLeaderboard(3).then((entries) => {
      if (!cancelled) {
        setFeaturedPlayers(entries);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const challenge = DAILY_CHALLENGES.find((entry) => !entry.isCompleted) ?? DAILY_CHALLENGES[0];

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Command Deck"
          title={canSave ? `Welcome back, ${user?.username ?? "Player"}` : "Welcome to the Arena"}
          subtitle={canSave ? `${rankBand.label} rank with live stats active` : "Guests can explore. Sign up to lock in progress."}
          right={
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="command-panel-soft flex items-center gap-2 px-3 py-2"
            >
              <StockAvatar avatarId={user?.avatarId} size="sm" />
              <Bell size={16} className="text-muted-foreground" />
            </button>
          }
        />

        <section className="command-panel grid min-h-0 flex-1 grid-rows-[auto_auto_1fr] gap-3 overflow-hidden p-3">
          <div className="grid grid-cols-[1.3fr_0.7fr] gap-3">
            <div className="command-panel-soft overflow-hidden p-2">
              <PuzzleRivalsLogo />
            </div>
            <div className="grid grid-rows-3 gap-3">
              <div className="compact-metric">
                <span className="hud-label">Coins</span>
                <span className="text-lg font-black text-coin">{(user?.coins ?? 0).toLocaleString()}</span>
              </div>
              <div className="compact-metric">
                <span className="hud-label">Gems</span>
                <span className="text-lg font-black text-primary">{user?.gems ?? 0}</span>
              </div>
              <div className="compact-metric">
                <span className="hud-label">Win Rate</span>
                <span className="text-lg font-black">{winRate}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="compact-metric">
              <span className="hud-label">Streak</span>
              <span className="text-xl font-black text-primary">{user?.winStreak ?? 0}</span>
            </div>
            <div className="compact-metric">
              <span className="hud-label">Matches</span>
              <span className="text-xl font-black">{user?.matchesPlayed ?? 0}</span>
            </div>
            <div className="compact-metric">
              <span className="hud-label">Focus</span>
              <span className={`text-sm font-black ${getRankColor(user?.rank ?? "bronze")}`}>{rankBand.label}</span>
            </div>
          </div>

          <div className="grid min-h-0 grid-cols-[1fr_1fr] gap-3">
            <div className="grid min-h-0 grid-rows-[auto_auto_1fr] gap-3">
              <PuzzleTileButton
                icon={Swords}
                title={canSave ? "Ranked Match" : "Create Account"}
                description={
                  canSave
                    ? "Queue live and start building your stats."
                    : "Unlock saved progress, ranks, and matchmaking."
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
                title={challenge?.title ?? "Daily Challenge"}
                description={challenge?.description ?? "A fresh daily puzzle run."}
                onClick={() => {
                  if (canSave) {
                    navigate("/match?mode=daily");
                    return;
                  }
                  openSignUp();
                }}
                right={<span className="font-hud text-[10px] uppercase tracking-[0.18em] text-primary">Daily</span>}
              />
              <div className="command-panel-soft min-h-0 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="hud-label">Top Ladder</p>
                    <p className="text-sm font-black">Current standouts</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/tournaments")}
                    className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary"
                  >
                    View
                  </button>
                </div>
                <div className="grid gap-2">
                  {featuredPlayers.slice(0, 3).map((entry, index) => (
                    <div key={entry.userId} className="flex items-center gap-3 rounded-2xl bg-black/20 px-3 py-2">
                      <div className="w-5 text-center font-hud text-xs text-primary">#{index + 1}</div>
                      <StockAvatar avatarId={entry.avatarId} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{entry.username}</p>
                        <p className={`text-[10px] font-hud uppercase tracking-[0.16em] ${getRankColor(entry.rankTier)}`}>
                          {entry.rankTier}
                        </p>
                      </div>
                      <span className="text-sm font-black text-primary">{entry.elo}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid min-h-0 grid-rows-[auto_1fr_auto] gap-3">
              <div className="command-panel-soft p-3">
                <div className="flex items-center gap-2">
                  <Crown size={16} className="text-primary" />
                  <div>
                    <p className="hud-label">Match of the Day</p>
                    <p className="text-sm font-black">Puzzle Rivals broadcast</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Featured logo slot stays branded here and acts as the app’s spotlight panel.
                </p>
              </div>

              <div className="command-panel-soft min-h-0 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="hud-label">Account State</p>
                    <p className="text-sm font-black">{canSave ? "Live profile synced" : "Guest sandbox active"}</p>
                  </div>
                  <StockAvatar avatarId={user?.avatarId} size="sm" />
                </div>
                <div className="grid gap-2">
                  <div className="rounded-2xl bg-black/20 px-3 py-2">
                    <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-muted-foreground">PuzzleTag</p>
                    <p className="truncate text-sm font-bold">{user?.username ?? "Guest Player"}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 px-3 py-2">
                    <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recovery</p>
                    <p className="text-sm font-bold">
                      {user?.securityQuestionsConfigured ? "Configured" : "Not configured"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-black/20 px-3 py-2">
                    <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Weak Spot</p>
                    <p className="text-sm font-bold">{user?.worstPuzzleType ?? "No data yet"}</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => navigate("/profile")} variant="outline" size="xl" className="w-full">
                <Eye size={16} />
                Open Profile
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
