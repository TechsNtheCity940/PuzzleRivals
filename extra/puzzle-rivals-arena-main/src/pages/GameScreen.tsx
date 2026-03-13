import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useGame } from '@/engine/gameContext';
import { PUZZLE_CONFIGS, PuzzleId } from '@/engine/types';
import HUD from '@/components/game/HUD';
import PlayerAvatar from '@/components/game/PlayerAvatar';
import RotatePipes from '@/puzzles/RotatePipes';
import NumberGrid from '@/puzzles/NumberGrid';
import PatternMatch from '@/puzzles/PatternMatch';
import WordScramble from '@/puzzles/WordScramble';
import TileSliding from '@/puzzles/TileSliding';
import SudokuMini from '@/puzzles/SudokuMini';
import { Home, RotateCcw, Swords, Trophy, Medal } from 'lucide-react';

const PUZZLE_COMPONENTS: Record<PuzzleId, React.ComponentType<{ onSolve: () => void; isPractice: boolean; disabled: boolean }>> = {
  'rotate-pipes': RotatePipes,
  'number-grid': NumberGrid,
  'pattern-match': PatternMatch,
  'word-scramble': WordScramble,
  'tile-sliding': TileSliding,
  'sudoku-mini': SudokuMini,
};

export default function GameScreen() {
  const navigate = useNavigate();
  const { match, proceedToPractice, proceedToLive, reportSolved, requestRevenge, goHome } = useGame();
  const [puzzleKey, setPuzzleKey] = useState(0);
  const startTimeRef = useRef(0);

  const { phase, puzzleId } = match;
  const config = puzzleId ? PUZZLE_CONFIGS[puzzleId] : null;
  const PuzzleComponent = puzzleId ? PUZZLE_COMPONENTS[puzzleId] : null;

  // Announcement → Practice after 3s
  useEffect(() => {
    if (phase === 'announcement') {
      const t = setTimeout(() => proceedToPractice(), 3000);
      return () => clearTimeout(t);
    }
  }, [phase, proceedToPractice]);

  // Practice → Live after 10s
  useEffect(() => {
    if (phase === 'practice') {
      const t = setTimeout(() => {
        proceedToLive();
        setPuzzleKey(k => k + 1);
        startTimeRef.current = Date.now();
      }, 10000);
      return () => clearTimeout(t);
    }
  }, [phase, proceedToLive]);

  // Auto-results when time runs out
  useEffect(() => {
    if (phase === 'live' && match.timeRemaining <= 0) {
      reportSolved(config ? config.timeLimit * 1000 : 60000);
    }
  }, [phase, match.timeRemaining, reportSolved, config]);

  const handleSolve = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    reportSolved(elapsed);
  }, [reportSolved]);

  const handleRevenge = () => {
    requestRevenge();
    setPuzzleKey(k => k + 1);
  };

  const handleHome = () => { goHome(); navigate('/'); };

  // ANNOUNCEMENT PHASE
  if (phase === 'announcement') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        {match.isRevenge && match.revengeMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-hud text-xs text-destructive text-center mb-4 px-4">
            <Swords size={16} className="inline mr-1" />
            {match.revengeMessage}
          </motion.div>
        )}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="text-7xl mb-4"
        >
          {config?.icon}
        </motion.div>
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-black text-foreground"
        >
          {config?.name}
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="font-hud text-sm text-muted-foreground text-center mt-2"
        >
          {config?.description}
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          className="mt-6 font-hud text-primary text-sm"
        >
          Practice phase starting...
        </motion.div>
      </div>
    );
  }

  // PRACTICE PHASE
  if (phase === 'practice') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="px-4 pt-4 text-center">
          <div className="font-hud text-sm text-primary font-bold">PRACTICE — Get Ready!</div>
          <div className="text-xs text-muted-foreground font-hud mt-1">{config?.tutorialText}</div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          {PuzzleComponent && <PuzzleComponent key={`practice-${puzzleKey}`} onSolve={() => {}} isPractice disabled={false} />}
        </div>
        <div className="p-4 text-center">
          <span className="font-hud text-xs text-muted-foreground">Live round starts soon...</span>
        </div>
      </div>
    );
  }

  // LIVE PHASE
  if (phase === 'live') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <HUD />
        <div className="flex-1 flex items-center justify-center px-4 py-2">
          {PuzzleComponent && <PuzzleComponent key={`live-${puzzleKey}`} onSolve={handleSolve} isPractice={false} disabled={false} />}
        </div>
      </div>
    );
  }

  // RESULTS PHASE
  if (phase === 'results') {
    const results = match.results;
    const playerResult = results.find(r => r.playerId === match.players.find(p => !p.isAI)?.profile.id);
    const won = playerResult?.rank === 1;
    const medalIcons = ['🥇', '🥈', '🥉'];

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 gap-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <div className="text-6xl">{won ? '🏆' : '💪'}</div>
        </motion.div>
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className={`text-2xl font-black ${won ? 'text-primary' : 'text-foreground'}`}
        >
          {won ? 'VICTORY!' : 'GOOD FIGHT!'}
        </motion.h1>

        {/* Rankings */}
        <div className="w-full max-w-xs space-y-2">
          {results.map((r, i) => (
            <motion.div key={r.playerId} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.15 }}
              className={`flex items-center gap-3 p-3 rounded-xl ${r.rank === 1 ? 'bg-primary/10 border border-primary/30' : 'bg-card'}`}
            >
              <span className="text-2xl">{medalIcons[r.rank - 1] || ''}</span>
              <div className="flex-1">
                <div className="font-bold text-sm text-foreground">{r.playerName}</div>
                <div className="font-hud text-xs text-muted-foreground">
                  {r.time < 999000 ? `${(r.time / 1000).toFixed(1)}s` : 'DNF'} · Score: {r.score}
                </div>
              </div>
              {r.rewards.coins > 0 && (
                <div className="text-right">
                  <div className="font-hud text-xs text-coin">+{r.rewards.coins} 🪙</div>
                  <div className="font-hud text-xs text-xp">+{r.rewards.xp} XP</div>
                  <div className={`font-hud text-xs ${r.rewards.ratingChange >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {r.rewards.ratingChange >= 0 ? '+' : ''}{r.rewards.ratingChange} RP
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="w-full max-w-xs flex flex-col gap-3 mt-2">
          <Button variant="play" size="lg" className="w-full" onClick={handleRevenge}>
            <Swords size={18} /> REVENGE
          </Button>
          <Button variant="outline" size="lg" className="w-full" onClick={handleHome}>
            <Home size={18} /> Home
          </Button>
        </div>
      </div>
    );
  }

  // Fallback — shouldn't reach here normally
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Button onClick={handleHome}>Back to Home</Button>
    </div>
  );
}
