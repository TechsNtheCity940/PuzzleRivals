import type { StockAvatarId } from "@/lib/types";

export type StockAvatarOption = {
  id: StockAvatarId;
  label: string;
  imageSrc: string;
  accentFrom: string;
  accentTo: string;
  glowClassName: string;
  accessoryLabel: string;
};

export const STOCK_AVATARS: StockAvatarOption[] = [
  {
    id: "blue-spinner",
    label: "Blue Spinner",
    imageSrc: "/avatars/blue-spinner.png",
    accentFrom: "from-sky-400",
    accentTo: "to-blue-700",
    glowClassName: "shadow-[0_0_35px_rgba(56,189,248,0.35)]",
    accessoryLabel: "Spinner",
  },
  {
    id: "orange-cube",
    label: "Ember Cube",
    imageSrc: "/avatars/orange-cube.png",
    accentFrom: "from-orange-400",
    accentTo: "to-red-600",
    glowClassName: "shadow-[0_0_35px_rgba(251,146,60,0.35)]",
    accessoryLabel: "Cube",
  },
  {
    id: "violet-popper",
    label: "Violet Pop",
    imageSrc: "/avatars/violet-popper.png",
    accentFrom: "from-fuchsia-400",
    accentTo: "to-violet-700",
    glowClassName: "shadow-[0_0_35px_rgba(192,132,252,0.35)]",
    accessoryLabel: "Popper",
  },
  {
    id: "green-cube",
    label: "Neon Cube",
    imageSrc: "/avatars/green-cube.png",
    accentFrom: "from-lime-400",
    accentTo: "to-emerald-700",
    glowClassName: "shadow-[0_0_35px_rgba(132,204,22,0.35)]",
    accessoryLabel: "Logic Cube",
  },
];

export const DEFAULT_AVATAR_ID: StockAvatarId = "blue-spinner";

export function getStockAvatar(avatarId?: StockAvatarId | null) {
  return STOCK_AVATARS.find((avatar) => avatar.id === avatarId) ?? STOCK_AVATARS[0];
}
