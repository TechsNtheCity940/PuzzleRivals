import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BottomNav from '@/components/game/BottomNav';
import { useGame } from '@/engine/gameContext';
import { Sparkles, Palette, Crown, Lightbulb } from 'lucide-react';

const THEMES = [
  { id: 'cyber', name: 'Cyber', color: 'bg-primary', price: 500, icon: '🤖' },
  { id: 'fantasy', name: 'Fantasy', color: 'bg-gradient-prestige', price: 800, icon: '🧙' },
  { id: 'neon', name: 'Neon', color: 'bg-accent', price: 600, icon: '💜' },
];

const FRAMES = [
  { id: 'cyber', name: 'Cyber Frame', price: 300, preview: '⚡' },
  { id: 'gold', name: 'Gold Frame', price: 500, preview: '👑' },
  { id: 'neon', name: 'Neon Frame', price: 400, preview: '💎' },
];

const HINTS = [
  { count: 3, price: 100 },
  { count: 10, price: 250 },
  { count: 25, price: 500 },
];

export default function Shop() {
  const navigate = useNavigate();
  const { player, updatePlayer } = useGame();

  const buyTheme = (id: string, price: number) => {
    if (player.coins >= price) {
      updatePlayer({ coins: player.coins - price, theme: id });
    }
  };

  const buyFrame = (id: string, price: number) => {
    if (player.coins >= price) {
      updatePlayer({ coins: player.coins - price, avatarFrame: id });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-black text-foreground">Shop</h1>
        <div className="flex items-center gap-1 bg-card rounded-full px-3 py-1.5">
          <span>🪙</span><span className="font-hud text-sm font-bold text-coin">{player.coins}</span>
        </div>
      </div>

      <div className="px-4 space-y-6 overflow-y-auto flex-1">
        {/* Themes */}
        <section>
          <h2 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2"><Palette size={16} /> Puzzle Themes</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {THEMES.map(theme => (
              <motion.button key={theme.id} whileTap={{ scale: 0.95 }}
                onClick={() => buyTheme(theme.id, theme.price)}
                className={`flex-shrink-0 w-28 rounded-xl p-3 flex flex-col items-center gap-2 border-2 ${
                  player.theme === theme.id ? 'border-primary bg-primary/10' : 'border-border bg-card'
                }`}
              >
                <span className="text-3xl">{theme.icon}</span>
                <span className="font-bold text-xs text-foreground">{theme.name}</span>
                {player.theme === theme.id ? (
                  <span className="font-hud text-xs text-primary">Equipped</span>
                ) : (
                  <span className="font-hud text-xs text-coin">🪙 {theme.price}</span>
                )}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Avatar Frames */}
        <section>
          <h2 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2"><Crown size={16} /> Avatar Frames</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {FRAMES.map(frame => (
              <motion.button key={frame.id} whileTap={{ scale: 0.95 }}
                onClick={() => buyFrame(frame.id, frame.price)}
                className={`flex-shrink-0 w-28 rounded-xl p-3 flex flex-col items-center gap-2 border-2 ${
                  player.avatarFrame === frame.id ? 'border-primary bg-primary/10' : 'border-border bg-card'
                }`}
              >
                <span className="text-3xl">{frame.preview}</span>
                <span className="font-bold text-xs text-foreground">{frame.name}</span>
                {player.avatarFrame === frame.id ? (
                  <span className="font-hud text-xs text-primary">Equipped</span>
                ) : (
                  <span className="font-hud text-xs text-coin">🪙 {frame.price}</span>
                )}
              </motion.button>
            ))}
          </div>
        </section>

        {/* Hint Packs */}
        <section>
          <h2 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2"><Lightbulb size={16} /> Hint Packs</h2>
          <div className="flex gap-3">
            {HINTS.map(h => (
              <button key={h.count}
                className="flex-1 bg-card rounded-xl p-3 flex flex-col items-center gap-1 border-2 border-border active:scale-95 transition-transform"
              >
                <span className="font-bold text-lg text-foreground">{h.count}×</span>
                <span className="text-xs text-muted-foreground">Hints</span>
                <span className="font-hud text-xs text-coin">🪙 {h.price}</span>
              </button>
            ))}
          </div>
        </section>

        {/* VIP */}
        <section>
          <button onClick={() => navigate('/battlepass')}
            className="w-full bg-gradient-prestige rounded-xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <Sparkles size={24} className="text-accent-foreground" />
            <div className="text-left">
              <div className="font-bold text-sm text-accent-foreground">VIP Membership</div>
              <div className="font-hud text-xs text-accent-foreground/70">2× rewards · Daily hints · Exclusive frames</div>
            </div>
          </button>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
