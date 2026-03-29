import type { CSSProperties, ReactNode } from "react";
import StockAvatar from "@/components/profile/StockAvatar";
import { DEFAULT_AVATAR_ID } from "@/lib/profile-customization";
import {
  getBannerVisual,
  getEmblemVisual,
  getPlayerCardVisual,
  getTitleVisual,
} from "@/lib/cosmetics";
import { cn } from "@/lib/utils";
import type { StockAvatarId } from "@/lib/types";

interface IdentityLoadoutCardProps {
  username: string;
  subtitle?: string;
  avatarId?: StockAvatarId | null;
  frameId?: string | null;
  playerCardId?: string | null;
  bannerId?: string | null;
  emblemId?: string | null;
  titleId?: string | null;
  titleLabel?: string | null;
  bannerLabel?: string | null;
  emblemLabel?: string | null;
  right?: ReactNode;
  compact?: boolean;
  className?: string;
}

export default function IdentityLoadoutCard({
  username,
  subtitle,
  avatarId,
  frameId,
  playerCardId,
  bannerId,
  emblemId,
  titleId,
  titleLabel,
  bannerLabel,
  emblemLabel,
  right,
  compact = false,
  className,
}: IdentityLoadoutCardProps) {
  const banner = getBannerVisual(bannerId);
  const card = getPlayerCardVisual(playerCardId);
  const emblem = getEmblemVisual(emblemId);
  const title = getTitleVisual(titleId);
  const cardStyle = (card.assetPath ? { "--identity-card-art": `url("${card.assetPath}")` } : undefined) as CSSProperties | undefined;

  return (
    <div
      className={cn("identity-loadout-card", card.className, compact && "identity-loadout-card-compact", className)}
      style={cardStyle}
    >
      <div className={cn("identity-loadout-banner", banner.className)}>
        {banner.assetPath ? <img src={banner.assetPath} alt="" aria-hidden="true" className="identity-loadout-banner-art" /> : null}
        <span className="identity-loadout-banner-copy">{bannerLabel ?? banner.label}</span>
      </div>
      <div className="identity-loadout-main">
        <div className="identity-loadout-avatar">
          <StockAvatar avatarId={avatarId ?? DEFAULT_AVATAR_ID} frameId={frameId} size={compact ? "sm" : "md"} />
        </div>
        <div className="identity-loadout-copy">
          <div className="identity-loadout-row">
            <p className="identity-loadout-name">{username}</p>
            <span className={cn("identity-loadout-title", title.className)}>{titleLabel ?? title.label}</span>
          </div>
          {subtitle ? <p className="identity-loadout-subtitle">{subtitle}</p> : null}
          <div className="identity-loadout-meta">
            <span className={cn("identity-loadout-meta-item", emblem.className)}>
              <span className="identity-loadout-meta-preview identity-loadout-meta-preview--emblem">
                {emblem.assetPath ? (
                  <img src={emblem.assetPath} alt="" aria-hidden="true" className="identity-loadout-meta-art identity-loadout-meta-art--contain" />
                ) : (
                  <span className="identity-loadout-meta-glyph">{emblem.glyph ?? "PR"}</span>
                )}
              </span>
              <span className="identity-loadout-meta-copy">{emblemLabel ?? emblem.label}</span>
            </span>
            <span className={cn("identity-loadout-meta-item", "identity-loadout-meta-item--card", card.chipClassName)}>
              <span className="identity-loadout-meta-preview identity-loadout-meta-preview--card">
                {card.assetPath ? (
                  <img src={card.assetPath} alt="" aria-hidden="true" className="identity-loadout-meta-art" />
                ) : (
                  <span className="identity-loadout-meta-glyph">PR</span>
                )}
              </span>
              <span className="identity-loadout-meta-copy">{card.label}</span>
            </span>
          </div>
        </div>
        {right ? <div className="identity-loadout-right">{right}</div> : null}
      </div>
    </div>
  );
}
