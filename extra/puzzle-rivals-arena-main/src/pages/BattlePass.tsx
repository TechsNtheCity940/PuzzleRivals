import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useGame } from '@/engine/gameContext';
import { ArrowLeft, Lock, Check, Star } from 'lucide-react';

const REWARDS = [
  { level: 1, name: 'Starter Pack', type: 'coins', amount: 100, icon: '🪙' },
  { level: 2, name: '3× Hints', type: 'hints', amount: 3, icon: '💡' },
  { level: 3, name: 'Neon Frame', type: 'frame', amount: 1, icon: '💜' },
  { level: 5, name: '500 Coins', type: 'coins', amount: 500, icon: '🪙' },
  { level: 7, name: 'Cyber Theme', type: 'theme', amount: 1, icon: '🤖' },
  { level: 10, name: 'Gold Frame', type: 'frame', amount: 1, icon: '👑' },
  { level: 12, name: '1000 Coins', type: 'coins', amount: 1000, icon: '🪙' },
  { level: 15, name: 'Fantasy Theme', type: 'theme', amount: 1, icon: '🧙' },
  { level: 20, name: 'VIP Trial', type: 'vip', amount: 3, icon: '⭐' },
  { level: 25, name: 'Grandmaster Frame', type: 'frame', amount: 1, icon: '🏆' },
];

export default function BattlePass() {
  const navigate = useNavigate();
  const { player } = useGame();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-4 pt-6 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground active:scale-90"><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-black text-foreground">Battle Pass</h1>
        <span className="ml-auto font-hud text-xs text-primary">Season 1</span>
      </div>

      {/* Progress */}
      <div className="px-4 mb-4">
        <div className="bg-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-foreground">Level {player.battlePassLevel}</span>
            <span className="font-hud text-xs text-muted-foreground">Next: {player.battlePassLevel * 200} XP</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-prestige rounded-full transition-all" style={{ width: `${Math.min(100, (player.xp % 200) / 2)}%` }} />
          </div>
        </div>
      </div>

      {/* VIP Banner */}
      <div className="px-4 mb-4">
        <div className="bg-gradient-prestige rounded-xl p-4 flex items-center gap-3">
          <Star size={28} className="text-accent-foreground" />
          <div>
            <div className="font-bold text-sm text-accent-foreground">Upgrade to VIP</div>
            <div className="font-hud text-xs text-accent-foreground/70">Unlock premium rewards on every level</div>
          </div>
        </div>
      </div>

      {/* Rewards track */}
      <div className="px-4 flex-1 overflow-y-auto space-y-2 pb-8">
        {REWARDS.map((reward, i) => {
          const unlocked = player.battlePassLevel >= reward.level;
          return (
            <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                unlocked ? 'bg-primary/10 border border-primary/20' : 'bg-card'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-hud font-bold text-xs ${
                unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {reward.level}
              </div>
              <span className="text-2xl">{reward.icon}</span>
              <div className="flex-1">
                <div className="font-bold text-sm text-foreground">{reward.name}</div>
              </div>
              {unlocked ? (
                <Check size={18} className="text-primary" />
              ) : (
                <Lock size={16} className="text-muted-foreground" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
