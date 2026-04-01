import { useEffect, useRef, useState } from "react";
import { primeNeonRivalsExperience } from "@/game/config/preloadNeonRivals";
import type { NeonRivalsGameBridge, NeonRivalsGameState, NeonRivalsRunMode } from "@/game/types";
import { cn } from "@/lib/utils";

interface NeonRivalsGameProps {
  className?: string;
  playerName?: string;
  sessionSeed: number;
  themeLabel?: string;
  mode: NeonRivalsRunMode;
  onStateChange?: (state: NeonRivalsGameState) => void;
}

export { primeNeonRivalsExperience };

export default function NeonRivalsGame({
  className,
  playerName,
  sessionSeed,
  themeLabel = "Season 1: Neon Rivals",
  mode,
  onStateChange,
}: NeonRivalsGameProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<{ destroy: (removeCanvas?: boolean) => void } | null>(null);
  const bridgeRef = useRef<NeonRivalsGameBridge>({});
  const [isBooting, setIsBooting] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    bridgeRef.current = {
      onReady: () => setIsBooting(false),
      onStateChange,
      onComplete: onStateChange,
      onFailed: onStateChange,
    };
  }, [onStateChange]);

  useEffect(() => {
    let cancelled = false;
    setIsBooting(true);
    setLoadError(null);

    async function mountGame() {
      if (!hostRef.current) {
        return;
      }

      try {
        await primeNeonRivalsExperience();
        const { createNeonRivalsGame } = await import("@/game/config/gameConfig");
        if (cancelled || !hostRef.current) {
          return;
        }

        gameRef.current = createNeonRivalsGame({
          parent: hostRef.current,
          bridge: {
            onReady: () => bridgeRef.current.onReady?.(),
            onStateChange: (state) => bridgeRef.current.onStateChange?.(state),
            onComplete: (state) => bridgeRef.current.onComplete?.(state),
            onFailed: (state) => bridgeRef.current.onFailed?.(state),
          },
          playerName,
          sessionSeed,
          themeLabel,
          mode,
        });
      } catch (error) {
        if (!cancelled) {
          setIsBooting(false);
          setLoadError(error instanceof Error ? error.message : "Failed to boot Arena board.");
        }
      }
    }

    void mountGame();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [mode, playerName, sessionSeed, themeLabel]);

  return (
    <div className={cn("neon-rivals-game-root", className)}>
      <div className="neon-rivals-game-host">
        <div ref={hostRef} className="neon-rivals-game-stage" />
      </div>
      {isBooting && !loadError ? (
        <div className="neon-rivals-game-overlay">
          <div className="neon-rivals-game-status-card">
            <p className="font-hud text-[11px] uppercase tracking-[0.18em] text-primary">Booting Arena board</p>
            <p className="mt-2 text-sm text-muted-foreground">Loading Neon Rivals board layers, tile systems, and live objective rules.</p>
          </div>
        </div>
      ) : null}
      {loadError ? (
        <div className="neon-rivals-game-overlay">
          <div className="neon-rivals-game-status-card neon-rivals-game-status-card--error">
            <p className="font-hud text-[11px] uppercase tracking-[0.18em] text-destructive">Board failed to boot</p>
            <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
