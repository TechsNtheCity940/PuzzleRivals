import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PuzzleTileButtonProps {
  icon?: ComponentType<{ size?: number; className?: string }>;
  emoji?: string;
  title: string;
  description?: string;
  active?: boolean;
  right?: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function PuzzleTileButton({
  icon: Icon,
  emoji,
  title,
  description,
  active = false,
  right,
  onClick,
  className,
  disabled,
}: PuzzleTileButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn("puzzle-tile", active && "puzzle-tile-active", disabled && "opacity-60", className)}
    >
      <div className="relative z-10 flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-background/45 text-xl",
            active && "bg-primary/12 text-primary",
          )}
        >
          {Icon ? <Icon size={18} className={active ? "text-primary" : "text-muted-foreground"} /> : emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{title}</p>
          {description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {right ? <div className="shrink-0 self-center">{right}</div> : null}
      </div>
    </button>
  );
}
