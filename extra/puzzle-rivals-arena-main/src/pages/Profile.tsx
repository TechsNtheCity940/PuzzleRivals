import { useGame } from '@/engine/gameContext';
import BottomNav from '@/components/game/BottomNav';
import PlayerAvatar from '@/components/game/PlayerAvatar';
import { ALL_PUZZLE_IDS, PUZZLE_CONFIGS } from '@/engine/types';

export default function Profile() {
  const { player } = useGame();

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <div className="px-4 pt-6 pb-4 flex flex-col items-center gap-3">
        <PlayerAvatar avatar={player.avatar} frame={player.avatarFrame} size={80} />
        <h1 className="text-xl font-black text-foreground">{player.name}</h1>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="font-hud text-xs text-muted-foreground">Rating</div>
            <div className="font-bold text-lg text-primary">{player.rating}</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="font-hud text-xs text-muted-foreground">Rank</div>
            <div className="font-bold text-sm text-foreground">{player.rank}</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="font-hud text-xs text-muted-foreground">Level</div>
            <div className="font-bold text-lg text-foreground">{player.level}</div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1 bg-card rounded-full px-3 py-1.5">
            <span>🪙</span><span className="font-hud text-sm font-bold text-coin">{player.coins}</span>
          </div>
          <div className="flex items-center gap-1 bg-card rounded-full px-3 py-1.5">
            <span>⚡</span><span className="font-hud text-sm font-bold text-xp">{player.xp} XP</span>
          </div>
        </div>
      </div>

      {/* Puzzle Stats */}
      <div className="px-4">
        <h2 className="font-bold text-sm text-foreground mb-2">Puzzle Stats</h2>
        <div className="space-y-2">
          {ALL_PUZZLE_IDS.map(id => {
            const cfg = PUZZLE_CONFIGS[id];
            const stats = player.puzzleStats[id];
            const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
            return (
              <div key={id} className="bg-card rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">{cfg.icon}</span>
                <div className="flex-1">
                  <div className="font-bold text-sm text-foreground">{cfg.name}</div>
                  <div className="font-hud text-xs text-muted-foreground">
                    {stats.played} played · {winRate}% win
                  </div>
                </div>
                {stats.bestTime > 0 && (
                  <div className="font-hud text-xs text-primary">{stats.bestTime}s best</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
