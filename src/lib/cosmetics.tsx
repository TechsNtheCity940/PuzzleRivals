import type { ItemCategory } from "@/lib/types";

type ThemeVisual = {
  shellClass: string;
  label: string;
  shellArt?: string;
  boardArt?: string;
};

type CosmeticVisual = {
  className: string;
  chipClassName: string;
  label: string;
  glyph?: string;
  assetPath?: string;
};

const DEFAULT_THEME: ThemeVisual = {
  shellClass: "cos-theme-default",
  label: "Arena Default",
};

const THEME_VISUALS: Record<string, ThemeVisual> = {
  s_1: {
    shellClass: "cos-theme-neon-circuit",
    label: "Neon Circuit",
    shellArt: "/cosmetics/themes/neon-circuit-shell.svg",
    boardArt: "/cosmetics/themes/neon-circuit-board.svg",
  },
  puzzle_theme_electric: {
    shellClass: "cos-theme-electric",
    label: "Electric Puzzle Theme",
    shellArt: "/cosmetics/themes/electric-shell.svg",
    boardArt: "/cosmetics/themes/electric-board.svg",
  },
  s_7: {
    shellClass: "cos-theme-obsidian",
    label: "Obsidian Skin",
    shellArt: "/cosmetics/themes/obsidian-shell.svg",
    boardArt: "/cosmetics/themes/obsidian-board.svg",
  },
  s_8: {
    shellClass: "cos-theme-minimalist",
    label: "Minimalist Lines",
    shellArt: "/cosmetics/themes/minimalist-shell.svg",
    boardArt: "/cosmetics/themes/minimalist-board.svg",
  },
};

const DEFAULT_FRAME: CosmeticVisual = {
  className: "cos-frame-default",
  chipClassName: "cos-chip-default",
  label: "Core Frame",
};

const FRAME_VISUALS: Record<string, CosmeticVisual> = {
  s_2: {
    className: "cos-frame-void",
    chipClassName: "cos-chip-void",
    label: "Void Frame",
    assetPath: "/cosmetics/frames/void-frame.svg",
  },
  s_9: {
    className: "cos-frame-diamond",
    chipClassName: "cos-chip-diamond",
    label: "Diamond Edge",
    assetPath: "/cosmetics/frames/diamond-edge.svg",
  },
  s_19: {
    className: "cos-frame-voltage",
    chipClassName: "cos-chip-voltage",
    label: "Voltage Pulse",
    assetPath: "/cosmetics/frames/voltage-pulse.svg",
  },
  frame_pulse: {
    className: "cos-frame-pulse",
    chipClassName: "cos-chip-voltage",
    label: "Pulse Frame",
    assetPath: "/cosmetics/frames/pulse-frame.svg",
  },
  frame_elite_obsidian: {
    className: "cos-frame-elite-obsidian",
    chipClassName: "cos-chip-obsidian",
    label: "Obsidian Elite",
    assetPath: "/cosmetics/frames/elite-obsidian-frame.svg",
  },
  frame_elite_nova: {
    className: "cos-frame-elite-nova",
    chipClassName: "cos-chip-nova",
    label: "Nova Elite",
    assetPath: "/cosmetics/frames/elite-nova-frame.svg",
  },
  frame_elite_inferno: {
    className: "cos-frame-elite-inferno",
    chipClassName: "cos-chip-inferno",
    label: "Inferno Elite",
    assetPath: "/cosmetics/frames/elite-inferno-frame.svg",
  },
  frame_elite_aurora: {
    className: "cos-frame-elite-aurora",
    chipClassName: "cos-chip-aurora",
    label: "Aurora Elite",
    assetPath: "/cosmetics/frames/elite-aurora-frame.svg",
  },
};

const DEFAULT_CARD: CosmeticVisual = {
  className: "cos-card-default",
  chipClassName: "cos-chip-default",
  label: "Arena Card",
};

const CARD_VISUALS: Record<string, CosmeticVisual> = {
  s_11: {
    className: "cos-card-static-shock",
    chipClassName: "cos-chip-voltage",
    label: "Static Shock",
    assetPath: "/cosmetics/cards/static-shock-card.svg",
  },
  s_20: {
    className: "cos-card-holograph",
    chipClassName: "cos-chip-holograph",
    label: "Holograph Grid",
    assetPath: "/cosmetics/cards/holograph-grid-card.svg",
  },
  card_neon_circuit: {
    className: "cos-card-neon-circuit",
    chipClassName: "cos-chip-voltage",
    label: "Neon Circuit Card",
    assetPath: "/cosmetics/cards/neon-circuit-card.svg",
  },
  ranked_card_season1_highrank: {
    className: "cos-card-neon-highrank",
    chipClassName: "cos-chip-legend",
    label: "Neon Rivals High-Rank",
    assetPath: "/cosmetics/cards/neon-rivals-rank-card.svg",
  },
};

const DEFAULT_BANNER: CosmeticVisual = {
  className: "cos-banner-default",
  chipClassName: "cos-chip-default",
  label: "Arena Banner",
};

const BANNER_VISUALS: Record<string, CosmeticVisual> = {
  s_12: {
    className: "cos-banner-aurora",
    chipClassName: "cos-chip-aurora",
    label: "Aurora Grid",
    assetPath: "/cosmetics/banners/aurora-grid-banner.svg",
  },
  s_17: {
    className: "cos-banner-vault",
    chipClassName: "cos-chip-vault",
    label: "Puzzle Vault",
    assetPath: "/cosmetics/banners/puzzle-vault-banner.svg",
  },
  banner_static_shock: {
    className: "cos-banner-static-shock",
    chipClassName: "cos-chip-voltage",
    label: "Static Shock",
    assetPath: "/cosmetics/banners/static-shock-banner.svg",
  },
  banner_season1_neon_rivals: {
    className: "cos-banner-neon-rivals",
    chipClassName: "cos-chip-legend",
    label: "Neon Rivals Season Banner",
    assetPath: "/cosmetics/banners/neon-rivals-season-banner.svg",
  },
};

const DEFAULT_EMBLEM: CosmeticVisual = {
  className: "cos-emblem-default",
  chipClassName: "cos-chip-default",
  label: "Arena Emblem",
  glyph: "PR",
};

const EMBLEM_VISUALS: Record<string, CosmeticVisual> = {
  s_13: { className: "cos-emblem-word-master", chipClassName: "cos-chip-word", label: "Word Master", glyph: "W" },
  s_18: { className: "cos-emblem-season-victor", chipClassName: "cos-chip-victor", label: "Season Victor", glyph: "V" },
  emblem_voltage: { className: "cos-emblem-voltage", chipClassName: "cos-chip-voltage", label: "Voltage Emblem", glyph: "V" },
};

const DEFAULT_TITLE: CosmeticVisual = {
  className: "cos-title-default",
  chipClassName: "cos-chip-default",
  label: "Rival",
};

const TITLE_VISUALS: Record<string, CosmeticVisual> = {
  s_14: { className: "cos-title-founder", chipClassName: "cos-chip-founder", label: "Founder" },
};

export function getThemeVisual(themeId?: string | null) {
  if (!themeId) return DEFAULT_THEME;
  return THEME_VISUALS[themeId] ?? DEFAULT_THEME;
}

export function getFrameVisual(frameId?: string | null) {
  if (!frameId) return DEFAULT_FRAME;
  return FRAME_VISUALS[frameId] ?? DEFAULT_FRAME;
}

export function getPlayerCardVisual(cardId?: string | null) {
  if (!cardId) return DEFAULT_CARD;
  return CARD_VISUALS[cardId] ?? DEFAULT_CARD;
}

export function getBannerVisual(bannerId?: string | null) {
  if (!bannerId) return DEFAULT_BANNER;
  return BANNER_VISUALS[bannerId] ?? DEFAULT_BANNER;
}

export function getEmblemVisual(emblemId?: string | null) {
  if (!emblemId) return DEFAULT_EMBLEM;
  return EMBLEM_VISUALS[emblemId] ?? DEFAULT_EMBLEM;
}

export function getTitleVisual(titleId?: string | null) {
  if (!titleId) return DEFAULT_TITLE;
  return TITLE_VISUALS[titleId] ?? DEFAULT_TITLE;
}

export function isRenderableCosmeticCategory(kind: string) {
  return (
    kind === "theme" ||
    kind === "frame" ||
    kind === "player_card" ||
    kind === "banner" ||
    kind === "emblem" ||
    kind === "title"
  );
}

export function getCosmeticVisual(kind: string, productId?: string | null) {
  switch (kind as ItemCategory) {
    case "theme":
      return getThemeVisual(productId);
    case "frame":
      return getFrameVisual(productId);
    case "player_card":
      return getPlayerCardVisual(productId);
    case "banner":
      return getBannerVisual(productId);
    case "emblem":
      return getEmblemVisual(productId);
    case "title":
      return getTitleVisual(productId);
    default:
      return DEFAULT_CARD;
  }
}
