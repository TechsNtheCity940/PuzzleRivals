import type { CSSProperties, ReactNode } from "react";
import StockAvatar from "@/components/profile/StockAvatar";
import { DEFAULT_AVATAR_ID } from "@/lib/profile-customization";
import {
  getBannerVisual,
  getEmblemVisual,
  getFrameVisual,
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
  rankLabel?: string | null;
  right?: ReactNode;
  compact?: boolean;
  variant?: "default" | "match-seat";
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
  rankLabel,
  right,
  compact = false,
  variant = "default",
  className,
}: IdentityLoadoutCardProps) {
  const isMatchSeat = variant === "match-seat";
  const equippedBanner = getBannerVisual(bannerId);
  const matchBanner = getBannerVisual("banner_static_shock");
  const banner = isMatchSeat ? matchBanner : equippedBanner;
  const equippedCard = getPlayerCardVisual(playerCardId);
  const card = isMatchSeat ? getPlayerCardVisual("card_neon_circuit") : equippedCard;
  const emblem = getEmblemVisual(emblemId);
  const frame = getFrameVisual(frameId);
  const title = getTitleVisual(titleId);
  const cardStyle = (card.assetPath
    ? { "--identity-card-art": `url("${card.assetPath}")` }
    : undefined) as CSSProperties | undefined;

  if (isMatchSeat) {
    return (
      <div
        className={cn(
          "identity-loadout-card",
          card.className,
          "identity-loadout-card--match-seat",
          className,
        )}
        style={cardStyle}
      >
        {frame.assetPath ? (
          <img
            src={frame.assetPath}
            alt=""
            aria-hidden="true"
            className="identity-loadout-card-frame-art"
          />
        ) : null}
        <div
          className={cn(
            "identity-loadout-card-frame-shell",
            frame.className,
          )}
        />

        <div className="identity-loadout-match-seat-shell">
          <div className="identity-loadout-match-header">
            <div className="identity-loadout-match-avatar">
              <StockAvatar
                avatarId={avatarId ?? DEFAULT_AVATAR_ID}
                frameId={null}
                size="md"
              />
            </div>
            <div className="identity-loadout-match-copy">
              <p className="identity-loadout-name">{username}</p>
              {subtitle ? (
                <p className="identity-loadout-match-subtitle">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className={cn("identity-loadout-match-rail", banner.className)}>
            {banner.assetPath ? (
              <img
                src={banner.assetPath}
                alt=""
                aria-hidden="true"
                className="identity-loadout-match-banner-art"
              />
            ) : null}
            <div className="identity-loadout-match-emblem">
              <span className={cn("identity-loadout-meta-preview", "identity-loadout-meta-preview--emblem", emblem.className)}>
                {emblem.assetPath ? (
                  <img
                    src={emblem.assetPath}
                    alt=""
                    aria-hidden="true"
                    className="identity-loadout-meta-art identity-loadout-meta-art--contain"
                  />
                ) : (
                  <span className="identity-loadout-meta-glyph">{emblem.glyph ?? "PR"}</span>
                )}
              </span>
              <span className="identity-loadout-match-emblem-copy">
                {emblemLabel ?? emblem.label}
              </span>
            </div>
            <div className="identity-loadout-match-rank">
              <span className="identity-loadout-match-rank-label">Rank</span>
              <span className="identity-loadout-match-rank-value">
                {rankLabel ?? titleLabel ?? title.label}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
