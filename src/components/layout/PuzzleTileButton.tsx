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
      className={cn(
        "puzzle-tile group interactive-halo",
        active && "puzzle-tile-active",
        disabled && "opacity-60",
        className,
      )}
    >
      <div className="relative z-10 flex items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-background/45 text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            active && "bg-primary/12 text-primary",
          )}
        >
          {Icon ? <Icon size={18} className={active ? "text-primary" : "text-muted-foreground"} /> : emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black tracking-tight">{title}</p>
          {description ? <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {right ? <div className="shrink-0 self-center text-right">{right}</div> : null}
      </div>
    </button>
  );
}
