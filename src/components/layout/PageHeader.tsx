import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  compact?: boolean;
}

export default function PageHeader({ eyebrow, title, subtitle, right, compact = false }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", compact && "items-center")}>
      <div className="min-w-0">
        <div className="logo-chip mb-2 w-fit">
          <img
            src="/brand/puzzle-rivals-logo.png"
            alt="Puzzle Rivals"
            className="h-7 w-7 rounded-full object-cover"
            draggable={false}
          />
          <span className="font-hud text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </span>
        </div>
        <h1 className={cn("text-2xl font-black tracking-tight", compact ? "text-xl" : "text-3xl")}>{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
