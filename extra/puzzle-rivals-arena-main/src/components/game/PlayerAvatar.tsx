interface Props {
  avatar: string;
  frame: string;
  size?: number;
  name?: string;
  showName?: boolean;
}

const FRAME_COLORS: Record<string, string> = {
  default: 'border-border',
  cyber: 'border-primary glow-primary',
  gold: 'border-coin',
  neon: 'border-accent glow-prestige',
  fantasy: 'bg-gradient-prestige',
};

export default function PlayerAvatar({ avatar, frame, size = 48, name, showName }: Props) {
  const frameClass = FRAME_COLORS[frame] || FRAME_COLORS.default;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex items-center justify-center rounded-full border-2 bg-card ${frameClass}`}
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: size * 0.5 }}>{avatar}</span>
      </div>
      {showName && name && (
        <span className="text-xs font-hud text-muted-foreground truncate max-w-[80px]">{name}</span>
      )}
    </div>
  );
}
