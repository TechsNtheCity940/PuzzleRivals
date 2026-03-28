import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
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

  return (
    <section
      className={cn(
        "neon-puzzle-shell",
        `neon-puzzle-shell--${category}`,
        lowTime && "neon-puzzle-shell--low-time",
        celebrating && "neon-puzzle-shell--celebrating",
        className,
      )}
      data-category={category}
      data-puzzle-type={puzzleType}
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

      <div className="neon-puzzle-content">{children}</div>
    </section>
  );
}
