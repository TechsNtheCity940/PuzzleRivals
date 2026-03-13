import { useGame } from '@/engine/gameContext';
import { PUZZLE_CONFIGS } from '@/engine/types';

export default function HUD() {
  const { match } = useGame();
  const puzzleConfig = match.puzzleId ? PUZZLE_CONFIGS[match.puzzleId] : null;
  const opponent = match.players.find(p => p.isAI);
  const player = match.players.find(p => !p.isAI);
  const isLow = match.timeRemaining <= 5 && match.timeRemaining > 0;

  return (
    <div className="w-full px-4 pt-2">
      {/* Opponent progress (flipped, fills toward center) */}
      {opponent && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-hud text-muted-foreground">{opponent.profile.avatar} {opponent.profile.name}</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden rotate-180">
            <div
              className="h-full bg-destructive/70 rounded-full transition-all duration-300"
              style={{ width: `${opponent.progress}%` }}
            />
          </div>
          <span className="text-xs font-hud text-muted-foreground">{Math.round(opponent.progress)}%</span>
        </div>
      )}

      {/* Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {puzzleConfig && (
            <span className="text-sm font-hud text-muted-foreground">
              {puzzleConfig.icon} {puzzleConfig.name}
            </span>
          )}
        </div>
        <div className={`font-hud font-bold text-2xl tabular-nums ${
          isLow ? 'text-destructive animate-pulse-threat' : 'text-primary'
        }`}>
          {Math.floor(match.timeRemaining / 60)}:{String(match.timeRemaining % 60).padStart(2, '0')}
        </div>
      </div>

      {/* Player progress */}
      {player && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-hud text-muted-foreground">{player.profile.avatar} You</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${player.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
