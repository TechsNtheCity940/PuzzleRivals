import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Zap, RotateCcw, Share2, Swords } from "lucide-react";
import { CURRENT_USER, PLAYERS, PUZZLE_TYPES } from "@/lib/seed-data";
import { generatePipePuzzle, rotatePipeCell, checkPipeConnections, type PipeCell } from "@/lib/puzzle-engine";
import type { MatchPhase, PuzzleType } from "@/lib/types";

export default function MatchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get("mode") || "ranked";
  const puzzleType = (params.get("puzzle") || "rotate_pipes") as PuzzleType;
  const puzzleMeta = PUZZLE_TYPES.find(p => p.type === puzzleType)!;

  const [phase, setPhase] = useState<MatchPhase>("lobby");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(90);
  const [progress, setProgress] = useState(0);
  const [opponentProgress, setOpponentProgress] = useState(0);
  const [grid, setGrid] = useState<PipeCell[][]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const opponent = PLAYERS[1]; // CipherKing
  const user = CURRENT_USER;

  // Phase transitions
  useEffect(() => {
    if (phase === "lobby") {
      const t = setTimeout(() => setPhase("announcement"), 1500);
      return () => clearTimeout(t);
    }
    if (phase === "announcement") {
      const t = setTimeout(() => {
        setPhase("practice");
        setCountdown(10);
      }, 2000);
      return () => clearTimeout(t);
    }
    if (phase === "practice") {
      if (countdown <= 0) {
        setPhase("round");
        setTimeLeft(90);
        // Generate puzzle
        const seed = Date.now() % 100000;
        const g = generatePipePuzzle(seed, 5);
        setGrid(checkPipeConnections(g));
        return;
      }
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [phase, countdown]);

  // Round timer
  useEffect(() => {
    if (phase !== "round" || isComplete) return;
    if (timeLeft <= 0) {
      setPhase("results");
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, isComplete]);

  // Simulate opponent progress
  useEffect(() => {
    if (phase !== "round" || isComplete) return;
    const t = setInterval(() => {
      setOpponentProgress(p => {
        const next = p + Math.random() * 3;
        if (next >= 100) {
          clearInterval(t);
          return 100;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, isComplete]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if (phase !== "round" || isComplete) return;
    setGrid(prev => {
      const newGrid = prev.map((row, ri) =>
        row.map((cell, ci) => (ri === r && ci === c ? rotatePipeCell(cell) : cell))
      );
      const checked = checkPipeConnections(newGrid);

      // Calculate progress
      const total = checked.flat().filter(c => c.type !== "empty").length;
      const connected = checked.flat().filter(c => c.isConnected).length;
      const prog = Math.round((connected / total) * 100);
      setProgress(prog);

      if (prog >= 100) {
        setIsComplete(true);
        setTimeout(() => setPhase("results"), 1000);
      }

      return checked;
    });
  }, [phase, isComplete]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Lobby
  if (phase === "lobby") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-16 h-16 rounded-full border-2 border-ion mx-auto flex items-center justify-center"
          >
            <Swords size={28} className="text-ion" />
          </motion.div>
          <p className="font-display font-bold text-lg">Finding Opponent...</p>
          <p className="text-xs text-muted-foreground font-body">Matching by ELO range</p>
        </motion.div>
      </div>
    );
  }

  // Announcement
  if (phase === "announcement") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 px-8"
        >
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded bg-secondary mx-auto flex items-center justify-center font-display font-bold text-xl">
                {user.username[0]}
              </div>
              <p className="font-display font-semibold text-sm mt-2">{user.username}</p>
              <p className="text-[10px] text-muted-foreground">{user.elo}</p>
            </div>
            <span className="font-display font-bold text-2xl text-ion">VS</span>
            <div className="text-center">
              <div className="w-14 h-14 rounded bg-secondary mx-auto flex items-center justify-center font-display font-bold text-xl">
                {opponent.username[0]}
              </div>
              <p className="font-display font-semibold text-sm mt-2">{opponent.username}</p>
              <p className="text-[10px] text-muted-foreground">{opponent.elo}</p>
            </div>
          </div>
          <div>
            <span className="text-3xl">{puzzleMeta.icon}</span>
            <p className="font-display font-bold mt-2">{puzzleMeta.label}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Practice countdown
  if (phase === "practice") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="font-condensed text-xs uppercase tracking-widest text-muted-foreground">Get Ready</p>
          <motion.p
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-display font-bold text-6xl text-ion"
          >
            {countdown}
          </motion.p>
          <p className="text-sm text-muted-foreground">{puzzleMeta.label} · 90s</p>
        </div>
      </div>
    );
  }

  // Results
  if (phase === "results") {
    const won = progress >= opponentProgress;
    const eloChange = won ? 24 : -18;
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
          >
            <p className={`font-display font-bold text-3xl ${won ? "text-ion" : "text-destructive"}`}>
              {won ? "VICTORY" : "DEFEAT"}
            </p>
          </motion.div>

          <div className="flex gap-8 items-center">
            <div className="text-center">
              <p className="font-display font-semibold text-sm">{user.username}</p>
              <p className="stat-value mt-1">{Math.round(progress)}%</p>
            </div>
            <div className="font-display text-2xl text-muted-foreground">—</div>
            <div className="text-center">
              <p className="font-display font-semibold text-sm">{opponent.username}</p>
              <p className="stat-value mt-1">{Math.round(opponentProgress)}%</p>
            </div>
          </div>

          <div className="surface rounded p-4 w-full max-w-xs space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ELO Change</span>
              <span className={`font-display font-bold ${eloChange > 0 ? "text-ion" : "text-destructive"}`}>
                {eloChange > 0 ? "+" : ""}{eloChange}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">XP Earned</span>
              <span className="font-display font-bold">+{won ? 350 : 120}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Coins</span>
              <span className="font-display font-bold">+{won ? 500 : 150}</span>
            </div>
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={() => navigate(`/match?mode=${mode}&puzzle=${puzzleType}`)}
              className="flex-1 h-11 bg-ion text-primary-foreground font-display font-bold text-xs uppercase tracking-wider rounded flex items-center justify-center gap-2"
            >
              <RotateCcw size={14} />
              Rematch
            </button>
            <button className="h-11 px-4 border border-border font-display text-xs uppercase tracking-wider rounded flex items-center gap-2 text-foreground font-semibold">
              <Share2 size={14} />
              Share
            </button>
          </div>

          <button
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground font-body underline"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Round (actual gameplay)
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Timer bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock size={14} className={timeLeft <= 10 ? "text-destructive animate-pulse-ion" : "text-ion"} />
            <span className={`font-condensed font-bold text-lg tracking-tight ${timeLeft <= 10 ? "text-destructive" : "text-foreground"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <p className="text-[10px] font-condensed font-bold uppercase tracking-widest text-muted-foreground">
            {puzzleMeta.label}
          </p>
        </div>
        {/* Progress bars */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-condensed font-bold w-16 truncate">{user.username}</span>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-ion rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[10px] font-condensed font-bold w-8 text-right">{Math.round(progress)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-condensed font-bold w-16 truncate text-muted-foreground">{opponent.username}</span>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-muted-foreground rounded-full"
                animate={{ width: `${opponentProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[10px] font-condensed font-bold w-8 text-right text-muted-foreground">{Math.round(opponentProgress)}%</span>
          </div>
        </div>
      </div>

      {/* Puzzle Grid */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 5}, 1fr)` }}>
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <motion.button
                key={`${r}-${c}`}
                onClick={() => handleCellClick(r, c)}
                whileTap={{ scale: 0.9 }}
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-sm border flex items-center justify-center transition-colors ${
                  cell.isSource || cell.isSink
                    ? "border-ion bg-ion/10"
                    : cell.isConnected
                    ? "border-ion/50 bg-ion/5"
                    : "border-border bg-card"
                }`}
              >
                <svg
                  viewBox="0 0 40 40"
                  className={`w-10 h-10 ${cell.isConnected ? "text-ion" : "text-muted-foreground"}`}
                  style={{ transform: `rotate(${cell.rotation}deg)` }}
                >
                  {cell.type === "straight" && (
                    <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  )}
                  {cell.type === "corner" && (
                    <path d="M20 0 L20 20 L40 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {cell.type === "tee" && (
                    <>
                      <line x1="20" y1="0" x2="20" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </>
                  )}
                  {cell.type === "end" && (
                    <>
                      <line x1="20" y1="0" x2="20" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="20" cy="20" r="4" fill="currentColor" />
                    </>
                  )}
                </svg>
              </motion.button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
