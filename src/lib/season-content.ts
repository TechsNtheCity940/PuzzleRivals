import type {
  QuestDefinition,
  RankTier,
  RankedRewardDefinition,
  SeasonPass,
  SeasonalContentDefinition,
  SeasonReward,
  SeasonTrack,
  StoreItem,
} from "@/lib/types";

export const NEON_RIVALS_SEASON_ID = "season1_neon_rivals";
export const NEON_RIVALS_SEASON_KEY = "season-1";
export const NEON_RIVALS_BATTLE_PASS_PRODUCT_ID = "s_6";
export const NEON_RIVALS_PREMIUM_AVATAR_TIER = 20;
export const NEON_RIVALS_SECOND_AVATAR_ID = "season1-neon-rival" as const;
export const NEON_RIVALS_STRATEGIST_AVATAR_ID = "season1-neon-strategist" as const;
export const NEON_RIVALS_COLLECTION = "Season 1: Neon Rivals";

export const NEON_RIVALS_STRATEGIST_CLIP = "/media/season1/neon-strategist-clip.mp4";
export const NEON_RIVALS_BOARD_SHOWCASE = [
  { id: "pipe-flow", label: "Pipe Flow", summary: "Glowing conduit routing under live pressure.", assetRef: "/cosmetics/boards/pipe-flow-board.svg" },
  { id: "number-crunch", label: "Number Crunch", summary: "High-speed arithmetic in a precision matrix shell.", assetRef: "/cosmetics/boards/number-crunch-board.svg" },
  { id: "pattern-eye", label: "Pattern Eye", summary: "Signal-match tiles with clean neon recognition cues.", assetRef: "/cosmetics/boards/pattern-eye-board.svg" },
  { id: "word-blitz", label: "Word Blitz", summary: "Rapid letter pressure with readable contrast and timer intensity.", assetRef: "/cosmetics/boards/word-blitz-board.svg" },
  { id: "tile-shift", label: "Tile Shift", summary: "Glossy sliding blocks with assembly-line energy rails.", assetRef: "/cosmetics/boards/tile-shift-board.svg" },
  { id: "sudoku-sprint", label: "Sudoku Sprint", summary: "Crisp logic cells built for speed-solving focus.", assetRef: "/cosmetics/boards/sudoku-sprint-board.svg" },
  { id: "maze-rush", label: "Maze Rush", summary: "Route tracing with luminous nodes and pressure-path glow.", assetRef: "/cosmetics/boards/maze-rush-board.svg" },
  { id: "memory-flash", label: "Memory Flash", summary: "Reveal shimmer and recall-driven tile flashes.", assetRef: "/cosmetics/boards/memory-flash-board.svg" },
  { id: "riddle-relay", label: "Riddle Relay", summary: "Prompt-driven quiz panels with clean answer emphasis.", assetRef: "/cosmetics/boards/riddle-relay-board.svg" },
  { id: "word-strike", label: "Word Strike", summary: "Letter-grid duels tuned for strong readability under tension.", assetRef: "/cosmetics/boards/word-strike-board.svg" },
] as const;

export const NEON_RIVALS_COSMETICS: SeasonalContentDefinition[] = [
  {
    id: "puzzle_theme_electric",
    name: "Electric Puzzle Theme",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "puzzle_theme",
    rarity: 4,
    rewardSource: "season_pass",
    unlockMethod: "free_tier",
    imageRef: "/cosmetics/themes/electric-shell.svg",
    themeTags: ["neon", "electric", "competitive", "season-1"],
    isAnimated: true,
    sortOrder: 1,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "card_neon_circuit",
    name: "Neon Circuit Card",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "player_card",
    rarity: 4,
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/cosmetics/cards/neon-circuit-card.svg",
    themeTags: ["neon", "circuit", "cyan", "magenta"],
    isAnimated: true,
    sortOrder: 2,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "banner_static_shock",
    name: "Static Shock Banner",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "banner",
    rarity: 4,
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/cosmetics/banners/static-shock-banner.svg",
    themeTags: ["shock", "lightning", "season-1"],
    isAnimated: true,
    sortOrder: 3,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "emblem_voltage",
    name: "Voltage Emblem",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "emblem",
    rarity: 5,
    rewardSource: "season_milestone",
    unlockMethod: "season_objective",
    imageRef: "/cosmetics/emblems/voltage-emblem.svg",
    themeTags: ["voltage", "prestige", "ranked"],
    isAnimated: false,
    sortOrder: 4,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "frame_pulse",
    name: "Pulse Frame",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "frame",
    rarity: 5,
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/cosmetics/frames/pulse-frame.svg",
    themeTags: ["pulse", "electric", "glow"],
    isAnimated: true,
    sortOrder: 5,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "avatar_season1_neon_rival",
    name: "Neon Hacker Avatar",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "avatar",
    rarity: 4,
    rewardSource: "featured_store",
    unlockMethod: "store_featured",
    imageRef: "/avatars/season1-neon-rival.svg",
    themeTags: ["hooded", "magenta", "operator"],
    isAnimated: false,
    sortOrder: 6,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "avatar_season1_neon_strategist",
    name: "Neon Strategist Avatar",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "avatar",
    rarity: 6,
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/avatars/season1-neon-strategist.svg",
    themeTags: ["hooded", "gold", "chess", "exclusive"],
    isAnimated: false,
    sortOrder: 7,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "ranked_card_season1_highrank",
    name: "Neon Rivals High-Rank Card",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "player_card",
    rarity: 6,
    rewardSource: "ranked",
    unlockMethod: "rank_finish",
    imageRef: "/cosmetics/cards/neon-rivals-rank-card.svg",
    themeTags: ["ranked", "legend", "animated"],
    isAnimated: true,
    sortOrder: 8,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "banner_season1_neon_rivals",
    name: "Season 1 Banner",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "banner",
    rarity: 5,
    rewardSource: "ranked",
    unlockMethod: "rank_finish",
    imageRef: "/cosmetics/banners/neon-rivals-season-banner.svg",
    themeTags: ["season-1", "arena", "ranked"],
    isAnimated: false,
    sortOrder: 9,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "badge_ranked_season1_legend",
    name: "Legend Neon Badge",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "badge",
    rarity: 6,
    rewardSource: "ranked",
    unlockMethod: "rank_finish",
    imageRef: "/cosmetics/badges/legend-neon-badge.svg",
    themeTags: ["badge", "legend", "ranked"],
    isAnimated: true,
    sortOrder: 10,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
];

export const NEON_RIVALS_STORE_ITEMS: StoreItem[] = [
  {
    id: "puzzle_theme_electric",
    name: "Electric Puzzle Theme",
    description: "Dark navy shell art with cyan, magenta, and violet charge rails across the puzzle board.",
    category: "theme",
    rarity: 4,
    priceGems: 180,
    isFeatured: true,
    collection: NEON_RIVALS_COLLECTION,
  },
  {
    id: "card_neon_circuit",
    name: "Neon Circuit Card",
    description: "Season 1 player card with electric trace lines and a high-voltage shimmer.",
    category: "player_card",
    rarity: 4,
    priceGems: 220,
    isFeatured: true,
    collection: NEON_RIVALS_COLLECTION,
  },
  {
    id: "banner_static_shock",
    name: "Static Shock Banner",
    description: "Arena banner with angular storm arcs and electric cyan edge bloom.",
    category: "banner",
    rarity: 4,
    priceCoins: 5400,
    isFeatured: true,
    collection: NEON_RIVALS_COLLECTION,
  },
  {
    id: "emblem_voltage",
    name: "Voltage Emblem",
    description: "Prestige emblem forged around a split neon bolt.",
    category: "emblem",
    rarity: 5,
    priceGems: 260,
    collection: NEON_RIVALS_COLLECTION,
  },
  {
    id: "frame_pulse",
    name: "Pulse Frame",
    description: "Electric frame with timed glow surges and edge arcs around the portrait.",
    category: "frame",
    rarity: 5,
    priceGems: 300,
    isFeatured: true,
    collection: NEON_RIVALS_COLLECTION,
  },
  {
    id: "avatar_season1_neon_rival",
    name: "Neon Hacker Avatar",
    description: "Season 1 hacker portrait with hot-pink glow, luminous eyes, and puzzle-arena sparks.",
    category: "avatar",
    rarity: 4,
    priceGems: 180,
    isFeatured: true,
    collection: NEON_RIVALS_COLLECTION,
  },
];

export const NEON_RIVALS_ELITE_FRAMES = [
  { id: "frame_elite_obsidian", name: "Obsidian Elite", accentClassName: "ranked-frame-obsidian", assetRef: "/cosmetics/frames/elite-obsidian-frame.svg" },
  { id: "frame_elite_nova", name: "Nova Elite", accentClassName: "ranked-frame-nova", assetRef: "/cosmetics/frames/elite-nova-frame.svg" },
  { id: "frame_elite_inferno", name: "Inferno Elite", accentClassName: "ranked-frame-inferno", assetRef: "/cosmetics/frames/elite-inferno-frame.svg" },
  { id: "frame_elite_aurora", name: "Aurora Elite", accentClassName: "ranked-frame-aurora", assetRef: "/cosmetics/frames/elite-aurora-frame.svg" },
] as const;

export const NEON_RIVALS_RANKED_REWARDS: RankedRewardDefinition[] = [
  { tier: "bronze", badgeId: "badge_ranked_bronze", badgeLabel: "Bronze Voltage", badgeAssetRef: "/cosmetics/badges/bronze-neon-badge.svg", accentClassName: "ranked-badge-bronze", summary: "Copper neon trim and a low-voltage crest." },
  { tier: "silver", badgeId: "badge_ranked_silver", badgeLabel: "Silver Voltage", badgeAssetRef: "/cosmetics/badges/silver-neon-badge.svg", accentClassName: "ranked-badge-silver", summary: "Chrome facets with cool cyan edge charge." },
  { tier: "gold", badgeId: "badge_ranked_gold", badgeLabel: "Gold Voltage", badgeAssetRef: "/cosmetics/badges/gold-neon-badge.svg", accentClassName: "ranked-badge-gold", summary: "Gold crown cuts with warm electric bloom." },
  { tier: "platinum", badgeId: "badge_ranked_platinum", badgeLabel: "Platinum Voltage", badgeAssetRef: "/cosmetics/badges/platinum-neon-badge.svg", accentClassName: "ranked-badge-platinum", frameId: "frame_elite_obsidian", frameLabel: "Obsidian Elite", summary: "Sharper violet cuts and obsidian elite frame access." },
  { tier: "diamond", badgeId: "badge_ranked_diamond", badgeLabel: "Diamond Voltage", badgeAssetRef: "/cosmetics/badges/diamond-neon-badge.svg", accentClassName: "ranked-badge-diamond", frameId: "frame_elite_nova", frameLabel: "Nova Elite", summary: "Prismatic cyan facets with the Nova Elite frame." },
  { tier: "master", badgeId: "badge_ranked_master", badgeLabel: "Master Voltage", badgeAssetRef: "/cosmetics/badges/master-neon-badge.svg", accentClassName: "ranked-badge-master", frameId: "frame_elite_inferno", frameLabel: "Inferno Elite", bannerId: "banner_season1_neon_rivals", bannerLabel: "Season Banner", summary: "Arc-reactive crown badge plus Inferno Elite framing." },
  { tier: "grandmaster", badgeId: "badge_ranked_grandmaster", badgeLabel: "Grandmaster Voltage", badgeAssetRef: "/cosmetics/badges/grandmaster-neon-badge.svg", accentClassName: "ranked-badge-grandmaster", frameId: "frame_elite_aurora", frameLabel: "Aurora Elite", bannerId: "banner_season1_neon_rivals", bannerLabel: "Season Banner", playerCardId: "ranked_card_season1_highrank", playerCardLabel: "High-Rank Card", summary: "Full Neon Rivals identity package with animated card treatment." },
  { tier: "legend", badgeId: "badge_ranked_legend", badgeLabel: "Legend Voltage", badgeAssetRef: "/cosmetics/badges/legend-neon-badge.svg", accentClassName: "ranked-badge-legend", frameId: "frame_elite_aurora", frameLabel: "Aurora Elite", bannerId: "banner_season1_neon_rivals", bannerLabel: "Season Banner", playerCardId: "ranked_card_season1_highrank", playerCardLabel: "Animated High-Rank Card", summary: "Peak season reward set with the brightest pulse and full prestige stack." },
];

function makeCurrencyReward(tier: number): SeasonReward {
  if (tier % 5 === 0) {
    return { type: "gems", amount: tier * 12, label: `${tier * 12} Gems` };
  }
  if (tier % 2 === 0) {
    return { type: "coins", amount: tier * 350, label: `${tier * 350} Coins` };
  }
  return { type: "pass_xp", amount: tier * 140, label: `${tier * 140} Pass XP` };
}

const PREMIUM_ITEM_TIERS: Record<number, SeasonReward> = {
  1: { type: "item", itemId: "puzzle_theme_electric", label: "Electric Puzzle Theme" },
  4: { type: "item", itemId: "card_neon_circuit", label: "Neon Circuit Card" },
  8: { type: "item", itemId: "banner_static_shock", label: "Static Shock Banner" },
  12: { type: "item", itemId: "frame_pulse", label: "Pulse Frame" },
  20: { type: "item", itemId: "avatar_season1_neon_strategist", label: "Neon Strategist Avatar" },
  28: { type: "item", itemId: "emblem_voltage", label: "Voltage Emblem" },
  34: { type: "item", itemId: "avatar_season1_neon_rival", label: "Neon Hacker Avatar" },
  40: { type: "item", itemId: "ranked_card_season1_highrank", label: "Animated High-Rank Card" },
};

const FREE_ITEM_TIERS: Record<number, SeasonReward> = {
  3: { type: "item", itemId: "puzzle_theme_electric", label: "Electric Puzzle Theme" },
  10: { type: "item", itemId: "banner_static_shock", label: "Static Shock Banner" },
  16: { type: "shards", amount: 140, label: "140 Shards" },
  24: { type: "item", itemId: "emblem_voltage", label: "Voltage Emblem" },
  32: { type: "gems", amount: 240, label: "240 Gems" },
  40: { type: "coins", amount: 6000, label: "6000 Coins" },
};

export function buildNeonRivalsTracks(currentTier = 14, maxTier = 40): SeasonTrack[] {
  return Array.from({ length: maxTier }, (_, index) => {
    const tier = index + 1;
    return {
      tier,
      freeReward: FREE_ITEM_TIERS[tier] ?? makeCurrencyReward(tier),
      premiumReward: PREMIUM_ITEM_TIERS[tier] ?? (tier % 3 === 0
        ? { type: "shards", amount: tier * 18, label: `${tier * 18} Shards` }
        : { type: "gems", amount: tier * 14, label: `${tier * 14} Gems` }),
      isUnlocked: tier <= currentTier,
    };
  });
}

export const CURRENT_NEON_RIVALS_SEASON: SeasonPass = {
  id: NEON_RIVALS_SEASON_ID,
  name: "Neon Rivals",
  seasonNumber: 1,
  startsAt: "2026-03-20",
  endsAt: "2026-06-20",
  currentTier: 14,
  maxTier: 40,
  isPremium: false,
  tracks: buildNeonRivalsTracks(),
};

export const NEON_RIVALS_SEASONAL_CHALLENGES: QuestDefinition[] = [
  {
    id: "sq_gold",
    title: "Reach Gold",
    description: "Climb into Gold during Neon Rivals to claim the Voltage Emblem.",
    track: "seasonal",
    target: 1400,
    progress: 0,
    reward: { gems: 60, shards: 120, itemId: "emblem_voltage" },
    isCompleted: false,
  },
  {
    id: "sq_pass_xp",
    title: "Earn 5000 Pass XP",
    description: "Push your season lane forward to unlock the Neon Circuit card reward cache.",
    track: "seasonal",
    target: 5000,
    progress: 0,
    reward: { gems: 80, itemId: "card_neon_circuit" },
    isCompleted: false,
  },
  {
    id: "sq_master_finish",
    title: "Finish Master or Higher",
    description: "End the season at Master, Grandmaster, or Legend for the season banner track.",
    track: "seasonal",
    target: 3200,
    progress: 0,
    reward: { shards: 180, itemId: "banner_season1_neon_rivals" },
    isCompleted: false,
  },
];

export function isSeasonOnePremiumAvatarReward(itemId?: string | null) {
  return itemId === "avatar_season1_neon_strategist";
}

export function findSeasonalCosmetic(itemId?: string | null) {
  return NEON_RIVALS_COSMETICS.find((entry) => entry.id === itemId) ?? null;
}

export function getRankedRewardForTier(tier: RankTier) {
  return NEON_RIVALS_RANKED_REWARDS.find((entry) => entry.tier === tier) ?? null;
}
