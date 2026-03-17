import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  getBannerVisual,
  getCosmeticVisual,
  getEmblemVisual,
  getFrameVisual,
  getPlayerCardVisual,
  getTitleVisual,
} from "@/lib/cosmetics";

interface CosmeticPreviewProps {
  kind: string;
  productId?: string | null;
  label?: string;
  className?: string;
}

function backgroundVars(assetPath?: string): CSSProperties | undefined {
  if (!assetPath) return undefined;
  return { "--cosmetic-art": `url("${assetPath}")` } as CSSProperties;
}

export default function CosmeticPreview({ kind, productId, label, className }: CosmeticPreviewProps) {
  if (kind === "emblem") {
    const emblem = getEmblemVisual(productId);
    return (
      <div className={cn("cosmetic-preview-emblem", emblem.className, className)}>
        <span>{emblem.glyph ?? "PR"}</span>
      </div>
    );
  }

  if (kind === "title") {
    const title = getTitleVisual(productId);
    return <div className={cn("cosmetic-preview-title", title.className, className)}>{label ?? title.label}</div>;
  }

  if (kind === "frame") {
    const frame = getFrameVisual(productId);
    return (
      <div className={cn("cosmetic-preview-frame", className)}>
        <div className={cn("cosmetic-preview-frame-shell", frame.className)}>
          <div className="cosmetic-preview-frame-core" />
          {frame.assetPath ? <img src={frame.assetPath} alt="" className="cosmetic-preview-frame-art" aria-hidden="true" /> : null}
        </div>
      </div>
    );
  }

  if (kind === "banner") {
    const banner = getBannerVisual(productId);
    return (
      <div className={cn("cosmetic-preview-banner", banner.className, className)} style={backgroundVars(banner.assetPath)}>
        <span>{label ?? banner.label}</span>
      </div>
    );
  }

  if (kind === "theme") {
    const theme = getCosmeticVisual(kind, productId);
    return (
      <div
        className={cn("cosmetic-preview-theme", theme.shellClass, className)}
        style={backgroundVars("shellArt" in theme ? theme.shellArt : undefined)}
      >
        <span>{label ?? theme.label}</span>
      </div>
    );
  }

  const card = getPlayerCardVisual(productId);
  return (
    <div className={cn("cosmetic-preview-card", card.className, className)} style={backgroundVars(card.assetPath)}>
      <span>{label ?? card.label}</span>
    </div>
  );
}
