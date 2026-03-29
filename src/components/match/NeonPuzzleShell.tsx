import { type CSSProperties, useEffect, useRef, useState, type ReactNode } from "react";
import type { MatchPlayablePuzzleType } from "@/lib/backend";
import { cn } from "@/lib/utils";
import {
  getNeonPuzzleSurfaceAsset,
  getNeonPuzzleThemeDefinition,
  type NeonPuzzleThemeCategory,
} from "@/lib/match-board-theme";

function formatPuzzleLabel(puzzleType: string) {
  return puzzleType.replace(/_/g, " ");
}

export default function NeonPuzzleShell({
  category,
  puzzleType,
  children,
  className,
  lowTime = false,
  celebrating = false,
}: {
  category: NeonPuzzleThemeCategory;
  puzzleType: string;
  children: ReactNode;
  className?: string;
  lowTime?: boolean;
  celebrating?: boolean;
}) {
  const theme = getNeonPuzzleThemeDefinition(category);
  const surfaceAsset = getNeonPuzzleSurfaceAsset(category, puzzleType as MatchPlayablePuzzleType);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const viewport = viewportRef.current;
    const target = targetRef.current;
    if (!viewport || !target) return;

    const measure = () => {
      rafRef.current = null;

      const availableWidth = viewport.clientWidth;
      const availableHeight = viewport.clientHeight;
      const targetWidth = target.scrollWidth;
      const targetHeight = target.scrollHeight;

      if (!availableWidth || !availableHeight || !targetWidth || !targetHeight) {
        setFitScale(1);
        return;
      }

      const nextScale = Math.min(1, availableWidth / targetWidth, availableHeight / targetHeight);
      setFitScale(nextScale);
    };

    const scheduleMeasure = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(viewport);
    resizeObserver.observe(target);
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [children, surfaceAsset]);

  const shellStyle = {
    ["--np-stage-max-width" as string]: theme.surfaceLayout.stageMaxWidth,
    ["--np-viewport-inset" as string]: theme.surfaceLayout.viewportInset,
  } as CSSProperties;

  return (
    <section
      className={cn(
        "neon-puzzle-shell",
        `neon-puzzle-shell--${category}`,
        `neon-puzzle-shell--surface-${theme.surfaceVariant}`,
        lowTime && "neon-puzzle-shell--low-time",
        celebrating && "neon-puzzle-shell--celebrating",
        className,
      )}
      data-category={category}
      data-puzzle-type={puzzleType}
      data-surface-variant={theme.surfaceVariant}
      style={shellStyle}
    >
      <div className="neon-puzzle-ambient" aria-hidden="true">
        <div className="neon-puzzle-grid-glow" />
        <div className="neon-puzzle-scanlines" />
        <div className="neon-puzzle-arc neon-puzzle-arc--left" />
        <div className="neon-puzzle-arc neon-puzzle-arc--right" />
        <span className="neon-puzzle-node neon-puzzle-node--tl" />
        <span className="neon-puzzle-node neon-puzzle-node--tr" />
        <span className="neon-puzzle-node neon-puzzle-node--br" />
        <span className="neon-puzzle-node neon-puzzle-node--bl" />
        {Array.from({ length: 8 }, (_, index) => (
          <span
            key={index}
            className="neon-puzzle-particle"
            style={{
              ["--particle-x" as string]: `${10 + ((index * 11) % 78)}%`,
              ["--particle-y" as string]: `${12 + ((index * 9) % 72)}%`,
              ["--particle-delay" as string]: `${index * 0.55}s`,
            }}
          />
        ))}
      </div>

      <div className="neon-puzzle-trim">
        <div className="flex flex-wrap items-center gap-2">
          <div className="neon-puzzle-chip">{theme.label}</div>
          <div className="neon-puzzle-kicker">{theme.kicker}</div>
        </div>
        <div className="neon-puzzle-kicker">{formatPuzzleLabel(puzzleType)}</div>
      </div>

      <div className="neon-puzzle-rail neon-puzzle-rail--left" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="neon-puzzle-rail neon-puzzle-rail--right" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="neon-puzzle-content">
        <div className="neon-puzzle-surface-shell">
          <img src={surfaceAsset} alt="" className="neon-puzzle-surface-art" aria-hidden="true" />
          <div className="neon-puzzle-surface-glow" aria-hidden="true" />
          <div className="neon-puzzle-surface-trace neon-puzzle-surface-trace--left" aria-hidden="true" />
          <div className="neon-puzzle-surface-trace neon-puzzle-surface-trace--right" aria-hidden="true" />
          <div className="neon-puzzle-surface-trace neon-puzzle-surface-trace--bottom" aria-hidden="true" />

          <div ref={viewportRef} className="neon-puzzle-surface-viewport">
            <div className="neon-puzzle-surface-screen" aria-hidden="true">
              <span className="neon-puzzle-surface-corner neon-puzzle-surface-corner--tl" />
              <span className="neon-puzzle-surface-corner neon-puzzle-surface-corner--tr" />
              <span className="neon-puzzle-surface-corner neon-puzzle-surface-corner--br" />
              <span className="neon-puzzle-surface-corner neon-puzzle-surface-corner--bl" />
              <span className="neon-puzzle-surface-scan" />
            </div>
            <div className="neon-puzzle-fit-frame">
              <div
                ref={targetRef}
                className="neon-puzzle-fit-target"
                style={{ transform: `scale(${fitScale})` }}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
