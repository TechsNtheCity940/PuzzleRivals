import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '@/engine/gameContext';
import { MOCK_LEADERBOARD } from '@/engine/mockData';
import BottomNav from '@/components/game/BottomNav';
import PlayerAvatar from '@/components/game/PlayerAvatar';

const TABS = ['Daily', 'Friends', 'Clan'] as const;

export default function Leaderboard() {
  const { player } = useGame();
  const [tab, setTab] = useState<typeof TABS[number]>('Daily');

  const allPlayers = [
    { ...player, leaderboardRank: 0 },
    ...MOCK_LEADERBOARD,
  ].sort((a, b) => b.rating - a.rating).map((p, i) => ({ ...p, leaderboardRank: i + 1 }));

  const filtered = tab === 'Friends'
    ? allPlayers.filter(p => p.id === player.id || player.friends.includes(p.id))
    : tab === 'Clan'
      ? allPlayers.filter(p => p.clan === player.clan)
      : allPlayers;

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-xl font-black text-foreground">Leaderboard</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-4">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full font-hud text-xs font-bold transition-all ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-2 overflow-y-auto flex-1">
        {filtered.map((p, i) => (
          <motion.div key={p.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-xl ${p.id === player.id ? 'bg-primary/10 border border-primary/30' : 'bg-card'}`}
          >
            <span className={`font-hud font-bold text-sm w-6 text-center ${
              p.leaderboardRank <= 3 ? 'text-coin' : 'text-muted-foreground'
            }`}>
              {p.leaderboardRank <= 3 ? ['🥇','🥈','🥉'][p.leaderboardRank - 1] : `#${p.leaderboardRank}`}
            </span>
            <PlayerAvatar avatar={p.avatar} frame={p.avatarFrame} size={36} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-foreground truncate">{p.name}</div>
              <div className="font-hud text-xs text-muted-foreground">{p.rank} · Lvl {p.level}</div>
            </div>
            <div className="font-hud text-sm font-bold text-primary">{p.rating}</div>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
