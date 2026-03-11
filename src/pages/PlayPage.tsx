import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Swords, Zap, Crown, Users, Target, ChevronRight } from "lucide-react";
import { PUZZLE_TYPES, DAILY_CHALLENGES, CURRENT_USER, getRankBand, getRankColor } from "@/lib/seed-data";
import type { PuzzleType } from "@/lib/types";

type PlayMode = "ranked" | "casual" | "royale" | "challenge" | "daily";

const MODES = [
  { id: "ranked" as PlayMode, label: "Ranked", icon: Swords, desc: "Climb the ELO ladder" },
  { id: "casual" as PlayMode, label: "Casual", icon: Zap, desc: "Practice without stakes" },
  { id: "royale" as PlayMode, label: "Puzzle Royale", icon: Crown, desc: "Last solver standing" },
  { id: "challenge" as PlayMode, label: "Challenge", icon: Target, desc: "Send a Beat My Brain" },
  { id: "daily" as PlayMode, label: "Daily 1%", icon: Users, desc: "Today's elite puzzle" },
];

export default function PlayPage() {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<PlayMode>("ranked");
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleType>("rotate_pipes");
  const user = CURRENT_USER;
  const rankBand = getRankBand(user.elo);

  const handlePlay = () => {
    navigate(`/match?mode=${selectedMode}&puzzle=${selectedPuzzle}`);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="font-display font-bold text-lg">Play</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          <span className={getRankColor(user.rank)}>{rankBand.label}</span> · ELO {user.elo}
        </p>
      </div>

      {/* Mode Selection */}
      <div className="px-4 space-y-2">
        {MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => setSelectedMode(mode.id)}
            className={`w-full surface-interactive rounded p-3 flex items-center gap-3 text-left transition-all ${
              selectedMode === mode.id ? "border-ion" : ""
            }`}
          >
            <div className={`w-10 h-10 rounded flex items-center justify-center ${
              selectedMode === mode.id ? "bg-ion text-primary-foreground" : "bg-secondary"
            }`}>
              <mode.icon size={18} />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-sm">{mode.label}</p>
              <p className="text-[11px] text-muted-foreground">{mode.desc}</p>
            </div>
            {selectedMode === mode.id && (
              <motion.div
                layoutId="mode-check"
                className="w-2 h-2 rounded-full bg-ion"
              />
            )}
          </button>
        ))}
      </div>

      {/* Puzzle Type Picker */}
      <div className="px-4 mt-6">
        <p className="font-display font-bold text-sm mb-3">Puzzle Type</p>
        <div className="grid grid-cols-3 gap-2">
          {PUZZLE_TYPES.map(p => (
            <button
              key={p.type}
              onClick={() => setSelectedPuzzle(p.type)}
              className={`surface-interactive rounded p-3 text-center ${
                selectedPuzzle === p.type ? "border-ion" : ""
              }`}
            >
              <span className="text-xl">{p.icon}</span>
              <p className="font-condensed text-[10px] font-bold uppercase tracking-wider mt-1.5">
                {p.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Play Button */}
      <div className="px-4 mt-6 mb-4">
        <button
          onClick={handlePlay}
          className="w-full h-14 bg-ion text-primary-foreground font-display font-bold text-base uppercase tracking-wider rounded glow-ion flex items-center justify-center gap-2"
        >
          <Swords size={20} />
          Find Match
        </button>
      </div>
    </div>
  );
}
