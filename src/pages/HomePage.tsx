import { motion } from "framer-motion";
import { Play, Eye, ChevronRight, Flame, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CURRENT_USER, PLAYERS, DAILY_CHALLENGES, NOTIFICATIONS, getRankBand, getRankColor } from "@/lib/seed-data";

export default function HomePage() {
  const navigate = useNavigate();
  const topPlayer = PLAYERS.find(p => p.id === "u_6")!;
  const user = CURRENT_USER;
  const rankBand = getRankBand(user.elo);
  const unreadNotifs = NOTIFICATIONS.filter(n => !n.isRead).length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center font-display font-bold text-sm">
            {user.username[0]}
          </div>
          <div>
            <p className="font-display font-semibold text-sm leading-none">{user.username}</p>
            <p className={`text-[10px] font-condensed font-bold uppercase tracking-wider ${getRankColor(user.rank)}`}>
              {rankBand.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-body">
            <span className="text-muted-foreground">🪙</span>
            <span className="font-semibold">{user.coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-body">
            <span className="text-muted-foreground">💎</span>
            <span className="font-semibold">{user.gems}</span>
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="relative p-1.5"
          >
            <Bell size={18} className="text-muted-foreground" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-ion text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Match of the Day - Hero */}
      <div className="relative flex-1 min-h-[50vh] bg-card flex flex-col justify-end p-4">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />

        {/* Simulated replay grid */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="grid grid-cols-5 gap-1 p-8">
            {Array.from({ length: 25 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-8 h-8 border border-border rounded-sm"
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-20 space-y-4">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-ion" />
            <span className="text-[10px] font-condensed font-bold uppercase tracking-widest text-ion">Match of the Day</span>
          </div>

          <div>
            <p className="font-display font-bold text-xl">{topPlayer.username}</p>
            <p className={`text-xs font-condensed font-bold uppercase tracking-wider ${getRankColor(topPlayer.rank)}`}>
              Master · ELO {topPlayer.elo}
            </p>
          </div>

          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            Solved a Difficulty V Pipe Flow puzzle in 23.4s. Watch the replay to see how the #1 player thinks.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/play")}
              className="flex-1 h-12 bg-ion text-primary-foreground font-display font-bold text-sm uppercase tracking-wider rounded flex items-center justify-center gap-2 glow-ion"
            >
              <Play size={16} fill="currentColor" />
              Play Now
            </button>
            <button className="h-12 px-4 border border-border font-display font-semibold text-xs uppercase tracking-wider rounded flex items-center gap-2 text-foreground">
              <Eye size={14} />
              Watch
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 border-t border-border">
        <div className="p-4 text-center border-r border-border">
          <p className="stat-value text-ion">{user.winStreak}</p>
          <p className="stat-label">Streak</p>
        </div>
        <div className="p-4 text-center border-r border-border">
          <p className="stat-value">{Math.round((user.wins / user.matchesPlayed) * 100)}%</p>
          <p className="stat-label">Win Rate</p>
        </div>
        <div className="p-4 text-center">
          <p className="stat-value">{user.matchesPlayed}</p>
          <p className="stat-label">Matches</p>
        </div>
      </div>

      {/* Daily Challenge */}
      {DAILY_CHALLENGES.filter(d => !d.isCompleted).map(challenge => (
        <button
          key={challenge.id}
          onClick={() => navigate("/play")}
          className="m-4 surface-interactive rounded p-4 flex items-center gap-4 text-left"
        >
          <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
            <Flame size={24} className="text-ion" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm">{challenge.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{challenge.description}</p>
            <p className="text-[10px] text-ion font-condensed font-bold uppercase tracking-wider mt-1">
              +{challenge.reward.xp} XP · +{challenge.reward.coins} Coins
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
        </button>
      ))}

      {/* Streak Reward */}
      <div className="mx-4 mb-4 surface rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-bold text-sm">Daily Streak</p>
          <p className="text-ion font-condensed font-bold text-sm">{user.winStreak} days</p>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <div
              key={day}
              className={`flex-1 h-1.5 rounded-full ${day <= user.winStreak ? "bg-ion" : "bg-secondary"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
