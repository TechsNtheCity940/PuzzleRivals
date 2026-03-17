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
    <div className={cn("hero-grid items-start page-header-glow", compact && "lg:grid-cols-[minmax(0,1fr)_auto]")}>
      <div className="min-w-0">
        <div className="eyebrow-chip mb-4 w-fit">
          <img
            src="/brand/puzzle-rivals-logo.png"
            alt="Puzzle Rivals"
            className="h-7 w-7 rounded-full object-cover"
            draggable={false}
          />
          <span>{eyebrow}</span>
        </div>
        <h1 className={cn("hero-title", compact ? "text-3xl md:text-4xl" : "")}>{title}</h1>
        {subtitle ? <p className="hero-subtitle mt-3">{subtitle}</p> : null}
      </div>
      {right ? <div className="w-full max-w-full lg:max-w-sm">{right}</div> : null}
    </div>
  );
}
