import { cn } from "@/lib/utils";
import { getFrameVisual } from "@/lib/cosmetics";
import { getStockAvatar } from "@/lib/profile-customization";
import type { StockAvatarId } from "@/lib/types";

type StockAvatarProps = {
  avatarId?: StockAvatarId | null;
  frameId?: string | null;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  className?: string;
};

export default function StockAvatar({
  avatarId,
  frameId,
  size = "md",
  selected = false,
  className,
}: StockAvatarProps) {
  const avatar = getStockAvatar(avatarId);
  const frame = getFrameVisual(frameId);
  const sizeClassName = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-24 w-24" : "h-20 w-20";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[26px] border border-white/10 bg-slate-950",
        sizeClassName,
        avatar.glowClassName,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className,
      )}
    >
      <img
        src={avatar.imageSrc}
        alt={avatar.label}
        className="h-full w-full object-cover"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(2,6,23,0.18))]" />
      {frame.assetPath ? (
        <img
          src={frame.assetPath}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-95"
        />
      ) : null}
      <div className={cn("pointer-events-none absolute inset-0 rounded-[26px]", frame.className)} />
    </div>
  );
}
