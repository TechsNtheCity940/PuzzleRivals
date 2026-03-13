import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronRight, Crown, Eye, Flame, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PuzzleRivalsLogo from "@/components/branding/PuzzleRivalsLogo";
import StockAvatar from "@/components/profile/StockAvatar";
import { fetchLeaderboard } from "@/lib/player-data";
import { DAILY_CHALLENGES, getRankBand, getRankColor } from "@/lib/seed-data";
import type { LeaderboardEntry } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

export default function HomePage() {
  const navigate = useNavigate();
  const { user, isGuest, canSave, isReady } = useAuth();
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

  return (
    <div className="space-y-4 px-4 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StockAvatar avatarId={user?.avatarId} size="sm" />
          <div>
            <p className="text-sm font-bold leading-none">{user?.username ?? "Guest Player"}</p>
            <p className={`mt-1 text-[11px] font-hud font-semibold uppercase tracking-[0.2em] ${getRankColor(user?.rank ?? "bronze")}`}>
              {rankBand.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="currency-chip">
            <span>Coins</span>
            <span className="text-coin">{(user?.coins ?? 0).toLocaleString()}</span>
          </div>
          <div className="currency-chip">
            <span>Gems</span>
            <span>{user?.gems ?? 0}</span>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card/80 text-muted-foreground"
          >
            <Bell size={18} />
          </button>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel relative overflow-hidden p-5"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(191,255,0,0.18),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
        <div className="relative z-10 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={14} className="text-primary" />
              <span className="hud-label text-primary">Match of the Day</span>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-hud text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Live Replay
            </span>
          </div>

          <PuzzleRivalsLogo />

          <div className="rounded-2xl border border-white/5 bg-background/30 p-4 backdrop-blur-sm">
            <p className="text-sm text-muted-foreground">
              {isGuest
                ? "Guests can explore and customize locally, but real stats only start once you create an account."
                : "Real stats, profile progress, and leaderboard placement now come from your live account data."}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate(canSave ? "/match?mode=ranked" : "/profile")}
              variant="play"
              size="xl"
              className="flex-1"
              disabled={!isReady || !user}
            >
              {!isReady || !user ? "Syncing Account..." : canSave ? "Play Now" : "Create Account"}
            </Button>
            <Button onClick={() => navigate("/profile")} variant="outline" size="xl" className="px-5">
              <Eye size={16} />
              Profile
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-background/40 p-3">
              <p className="hud-label">Mode</p>
              <p className="mt-1 text-sm font-black">{canSave ? "Ranked" : "Guest"}</p>
            </div>
            <div className="rounded-2xl bg-background/40 p-3">
              <p className="hud-label">Focus</p>
              <p className="mt-1 text-sm font-black">{user?.worstPuzzleType ? "Improve Weakness" : "Fresh Start"}</p>
            </div>
            <div className="rounded-2xl bg-background/40 p-3">
              <p className="hud-label">Season</p>
              <p className="mt-1 text-sm font-black">Launch</p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-3 gap-3">
        <div className="panel text-center">
          <p className="stat-value text-primary">{user?.winStreak ?? 0}</p>
          <p className="stat-label">Streak</p>
        </div>
        <div className="panel text-center">
          <p className="stat-value">{winRate}%</p>
          <p className="stat-label">Win Rate</p>
        </div>
        <div className="panel text-center">
          <p className="stat-value">{user?.matchesPlayed ?? 0}</p>
          <p className="stat-label">Matches</p>
        </div>
      </div>

      {DAILY_CHALLENGES.filter((challenge) => !challenge.isCompleted).map((challenge) => (
        <button
          key={challenge.id}
          onClick={() => navigate(canSave ? "/match?mode=daily" : "/profile")}
          className="panel-interactive w-full text-left"
          disabled={!isReady || !user}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Flame size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="hud-label text-primary">Daily Challenge</p>
              <p className="mt-1 text-base font-bold">{challenge.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{challenge.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-hud font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">+{challenge.reward.xp} XP</span>
                <span className="rounded-full bg-accent/12 px-2.5 py-1 text-accent">+{challenge.reward.coins} Coins</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </button>
      ))}

      <section className="panel">
        <div className="flex items-center justify-between">
          <div>
            <p className="hud-label">Ladder Snapshot</p>
            <h2 className="mt-1 text-lg font-black">Top Arena Players</h2>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="rounded-full border border-border px-3 py-1.5 font-hud text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            View More
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {featuredPlayers.length > 0 ? (
            featuredPlayers.map((entry, index) => (
              <div key={entry.userId} className="flex items-center gap-3 rounded-2xl bg-background/35 p-3">
                <StockAvatar avatarId={entry.avatarId} size="sm" className="h-11 w-11 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{entry.username}</p>
                  <p className={`text-[11px] font-hud font-semibold uppercase tracking-[0.18em] ${getRankColor(entry.rankTier)}`}>
                    {entry.rankTier}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-primary">#{index + 1}</p>
                  <p className="text-[11px] font-hud text-muted-foreground">{entry.elo} ELO</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-background/35 p-4 text-sm text-muted-foreground">
              No ranked results yet. The leaderboard will populate after the first saved-account matches finish.
            </div>
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="hud-label">Consistency Bonus</p>
            <h2 className="mt-1 text-lg font-black">Daily Streak</h2>
          </div>
          <Sparkles size={18} className="text-accent" />
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/35 px-4 py-3">
          <div>
            <p className="text-sm font-bold">{user?.winStreak ?? 0} Day Run</p>
            <p className="text-sm text-muted-foreground">Keep winning to unlock higher streak rewards.</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-prestige text-lg text-white">
            <Crown size={20} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div
              key={day}
              className={`flex h-12 items-center justify-center rounded-2xl border text-sm font-black ${
                day <= (user?.winStreak ?? 0)
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-background/25 text-muted-foreground"
              }`}
            >
              {day}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
