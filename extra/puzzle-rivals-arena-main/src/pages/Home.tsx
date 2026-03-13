import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useGame } from '@/engine/gameContext';
import BottomNav from '@/components/game/BottomNav';
import PlayerAvatar from '@/components/game/PlayerAvatar';
import { Zap, Users, Swords, Trophy } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { player } = useGame();

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PlayerAvatar avatar={player.avatar} frame={player.avatarFrame} size={44} />
          <div>
            <div className="font-bold text-foreground text-sm">{player.name}</div>
            <div className="font-hud text-xs text-muted-foreground">Lvl {player.level} · {player.rank}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-card rounded-full px-3 py-1.5">
            <span className="text-sm">🪙</span>
            <span className="font-hud text-xs font-bold text-coin">{player.coins}</span>
          </div>
          <div className="flex items-center gap-1 bg-card rounded-full px-3 py-1.5">
            <span className="text-sm">⚡</span>
            <span className="font-hud text-xs font-bold text-xp">{player.xp} XP</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center"
        >
          <h1 className="text-4xl font-black text-foreground tracking-tight">PUZZLE</h1>
          <h1 className="text-4xl font-black text-primary tracking-tight -mt-1">RIVALS</h1>
          <p className="font-hud text-sm text-muted-foreground mt-2">Race. Solve. Dominate.</p>
        </motion.div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-xs flex flex-col gap-3"
        >
          <Button variant="play" size="xl" className="w-full" onClick={() => navigate('/matchmaking')}>
            <Zap size={24} /> PLAY NOW
          </Button>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-3 w-full max-w-xs"
        >
          <button onClick={() => navigate('/leaderboard')} className="bg-card rounded-xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <Trophy size={20} className="text-coin" />
            <span className="font-hud text-xs text-muted-foreground">Ranked</span>
            <span className="font-bold text-sm text-foreground">#{Math.max(1, 100 - Math.floor(player.rating / 20))}</span>
          </button>
          <button onClick={() => navigate('/leaderboard')} className="bg-card rounded-xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <Swords size={20} className="text-destructive" />
            <span className="font-hud text-xs text-muted-foreground">Wins</span>
            <span className="font-bold text-sm text-foreground">
              {Object.values(player.puzzleStats).reduce((a, s) => a + s.wins, 0)}
            </span>
          </button>
          <button onClick={() => navigate('/profile')} className="bg-card rounded-xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <Users size={20} className="text-accent" />
            <span className="font-hud text-xs text-muted-foreground">Friends</span>
            <span className="font-bold text-sm text-foreground">{player.friends.length}</span>
          </button>
        </motion.div>

        {/* Battle Pass teaser */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => navigate('/battlepass')}
          className="w-full max-w-xs bg-gradient-prestige rounded-xl p-3 flex items-center gap-3 active:scale-95 transition-transform"
        >
          <span className="text-2xl">🏆</span>
          <div className="text-left">
            <div className="font-bold text-sm text-accent-foreground">Battle Pass S1</div>
            <div className="font-hud text-xs text-accent-foreground/70">Level {player.battlePassLevel} · Unlock rewards</div>
          </div>
        </motion.button>
      </div>

      <BottomNav />
    </div>
  );
}
