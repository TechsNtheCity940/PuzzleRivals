import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Sparkles, Swords, Target, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { DAILY_CHALLENGES, getRankBand, getRankColor } from "@/lib/seed-data";

type PlayMode = "ranked" | "casual" | "royale" | "challenge" | "daily";

const MODES = [
  { id: "ranked" as PlayMode, label: "Ranked", icon: Swords, desc: "4-player standard ladder lobby" },
  { id: "casual" as PlayMode, label: "Casual", icon: Zap, desc: "Generated puzzles without rank pressure" },
  { id: "royale" as PlayMode, label: "Puzzle Royale", icon: Crown, desc: "Same lobby rule, bigger stakes" },
  { id: "challenge" as PlayMode, label: "Challenge", icon: Target, desc: "Practice into live match flow" },
  { id: "daily" as PlayMode, label: "Daily 1%", icon: Users, desc: "Generated daily elite variant" },
];

export default function PlayPage() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<PlayMode>("ranked");
  const { user } = useAuth();
  const rankBand = getRankBand(user?.elo ?? 0);

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="hud-label">Standard Match Flow</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Play Now</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className={getRankColor(user?.rank ?? "bronze")}>{rankBand.label}</span> - ELO {user?.elo ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-right">
          <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-primary">Lobby Rule</p>
          <p className="text-lg font-black">4 Players</p>
        </div>
      </div>

      <section className="panel">
        <div className="flex items-center justify-between">
          <div>
            <p className="hud-label">Queue Type</p>
            <h2 className="mt-1 text-lg font-black">Pick the match mode</h2>
          </div>
          <Sparkles size={18} className="text-accent" />
        </div>
        <div className="mt-4 space-y-3">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={`w-full rounded-[24px] border p-4 text-left transition-all ${
                selectedMode === mode.id
                  ? "border-primary/30 bg-primary/10 shadow-[0_18px_40px_rgba(191,255,0,0.14)]"
                  : "border-border bg-background/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  selectedMode === mode.id ? "bg-gradient-play text-primary-foreground" : "bg-card"
                }`}>
                  <mode.icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{mode.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{mode.desc}</p>
                </div>
                {selectedMode === mode.id && (
                  <motion.div layoutId="mode-check" className="h-3 w-3 rounded-full bg-primary" />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <p className="hud-label">Mandatory Match Order</p>
        <div className="mt-3 grid gap-3">
          {[
            "Queue into a 4-player lobby",
            "Lobby gets one randomly selected puzzle type",
            "All players see the puzzle visual and solve instructions",
            "12-second practice round begins",
            "Live match loads a different generated version of the same puzzle type",
          ].map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-2xl bg-background/35 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-card text-sm font-black text-primary">
                {index + 1}
              </div>
              <p className="text-sm text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="hud-label text-primary">AI Puzzle Generation</p>
            <h2 className="mt-1 text-lg font-black">Procedural matches that keep changing</h2>
          </div>
            <div className="rounded-2xl bg-accent/10 px-3 py-2 font-hud text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Infinite
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {[
            "Fresh seeds for practice and live every match",
            "Adaptive difficulty based on lobby ELO",
            "Randomized puzzle pool for standard play",
            "Ready to extend into deeper AI-generated logic templates",
          ].map((item) => (
            <div key={item} className="rounded-2xl bg-background/35 px-4 py-3 text-sm text-muted-foreground">
              {item}
            </div>
          ))}
        </div>
      </section>

      {DAILY_CHALLENGES[0] && (
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="hud-label text-primary">Daily 1%</p>
              <h2 className="mt-1 text-lg font-black">{DAILY_CHALLENGES[0].title}</h2>
            </div>
            <div className="rounded-2xl bg-primary/10 px-3 py-2 font-hud text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Generated
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{DAILY_CHALLENGES[0].description}</p>
        </section>
      )}

      <Button
        onClick={() => navigate(`/match?mode=${selectedMode}`)}
        variant="play"
        size="xl"
        className="w-full"
      >
        <Swords size={20} />
        Play Now
      </Button>
    </div>
  );
}
