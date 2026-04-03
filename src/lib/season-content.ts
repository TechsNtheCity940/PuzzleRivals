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
export const NEON_RIVALS_SEASON_PASS_PRODUCT_ID = NEON_RIVALS_BATTLE_PASS_PRODUCT_ID;
export const NEON_RIVALS_PREMIUM_AVATAR_TIER = 36;
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
    unlockMethod: "premium_tier",
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
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
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
    name: "Neon Rival Avatar",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "avatar",
    rarity: 6,
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/avatars/season1-neon-rival.svg",
    themeTags: ["magenta", "operator", "exclusive"],
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
    themeTags: ["gold", "chess", "exclusive"],
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
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
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
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/cosmetics/banners/neon-rivals-season-banner.svg",
    themeTags: ["season-1", "arena", "prestige"],
    isAnimated: false,
    sortOrder: 9,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "frame_elite_obsidian",
    name: "Obsidian Elite Frame",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "frame",
    rarity: 5,
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/cosmetics/frames/elite-obsidian-frame.svg",
    themeTags: ["elite", "obsidian", "prestige"],
    isAnimated: false,
    sortOrder: 10,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "frame_elite_nova",
    name: "Nova Elite Frame",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "frame",
    rarity: 5,
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/cosmetics/frames/elite-nova-frame.svg",
    themeTags: ["elite", "nova", "prestige"],
    isAnimated: false,
    sortOrder: 11,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "frame_elite_inferno",
    name: "Inferno Elite Frame",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "frame",
    rarity: 5,
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/cosmetics/frames/elite-inferno-frame.svg",
    themeTags: ["elite", "inferno", "prestige"],
    isAnimated: false,
    sortOrder: 12,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "frame_elite_aurora",
    name: "Aurora Elite Frame",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "frame",
    rarity: 6,
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/cosmetics/frames/elite-aurora-frame.svg",
    themeTags: ["elite", "aurora", "grandmaster"],
    isAnimated: false,
    sortOrder: 13,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
  {
    id: "badge_ranked_legend",
    name: "Legend Voltage Badge",
    seasonId: NEON_RIVALS_SEASON_ID,
    category: "badge",
    rarity: 6,
    rewardSource: "season_pass",
    unlockMethod: "premium_tier",
    imageRef: "/cosmetics/badges/legend-neon-badge.svg",
    themeTags: ["legend", "badge", "prestige"],
    isAnimated: true,
    sortOrder: 14,
    availableFrom: "2026-03-20",
    availableTo: "2026-06-20",
  },
];

export const NEON_RIVALS_TIER_SKIP_OFFERS: StoreItem[] = [
  {
    id: "season1_tier_skip_1",
    name: "Season Tier Skip x1",
    description: "Instantly adds 1 Season 1 tier worth of pass XP.",
    category: "bundle",
    rarity: 2,
    priceUsd: 1.49,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
    bundlePassXp: 500,
  },
  {
    id: "season1_tier_skip_5",
    name: "Season Tier Skip x5",
    description: "Push 5 season pass tiers immediately without changing match balance.",
    category: "bundle",
    rarity: 3,
    priceUsd: 5.99,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
    bundlePassXp: 2500,
  },
  {
    id: "season1_tier_skip_10",
    name: "Season Tier Skip x10",
    description: "Fast-track 10 season pass tiers for players who want the full cosmetic lane early.",
    category: "bundle",
    rarity: 4,
    priceUsd: 9.99,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
    bundlePassXp: 5000,
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
    seasonId: NEON_RIVALS_SEASON_ID,
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
    seasonId: NEON_RIVALS_SEASON_ID,
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
    seasonId: NEON_RIVALS_SEASON_ID,
  },
  {
    id: "emblem_voltage",
    name: "Voltage Emblem",
    description: "Prestige emblem forged around a split neon bolt.",
    category: "emblem",
    rarity: 5,
    priceGems: 260,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
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
    seasonId: NEON_RIVALS_SEASON_ID,
  },
  {
    id: "avatar_season1_neon_rival",
    name: "Neon Rival Avatar",
    description: "Season 1 lead rival portrait with hot-pink glow, luminous eyes, and arena sparks.",
    category: "avatar",
    rarity: 6,
    priceGems: 320,
    isFeatured: true,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
  },
  {
    id: "avatar_season1_neon_strategist",
    name: "Neon Strategist Avatar",
    description: "Season 1 premium strategist portrait with gold light accents and command-board energy.",
    category: "avatar",
    rarity: 6,
    priceGems: 320,
    isFeatured: true,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
  },
  {
    id: "banner_season1_neon_rivals",
    name: "Season 1 Banner",
    description: "The grandmaster-season banner for Neon Rivals identity decks.",
    category: "banner",
    rarity: 5,
    priceGems: 260,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
  },
  {
    id: "ranked_card_season1_highrank",
    name: "Neon Rivals High-Rank Card",
    description: "Animated prestige card that anchors the Season 1 identity deck.",
    category: "player_card",
    rarity: 6,
    priceGems: 360,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
  },
  {
    id: "frame_elite_obsidian",
    name: "Obsidian Elite Frame",
    description: "Prestige frame with obsidian glow rails.",
    category: "frame",
    rarity: 5,
    priceGems: 240,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
  },
  {
    id: "frame_elite_nova",
    name: "Nova Elite Frame",
    description: "Prestige frame with nova-blue edge bloom.",
    category: "frame",
    rarity: 5,
    priceGems: 260,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
  },
  {
    id: "frame_elite_inferno",
    name: "Inferno Elite Frame",
    description: "Prestige frame with inferno pulse highlights.",
    category: "frame",
    rarity: 5,
    priceGems: 280,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
  },
  {
    id: "frame_elite_aurora",
    name: "Aurora Elite Frame",
    description: "Top-end elite frame with aurora charge flow.",
    category: "frame",
    rarity: 6,
    priceGems: 340,
    collection: NEON_RIVALS_COLLECTION,
    seasonId: NEON_RIVALS_SEASON_ID,
  },
  ...NEON_RIVALS_TIER_SKIP_OFFERS,
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

function makeFreeReward(tier: number): SeasonReward {
  if (tier % 5 === 0) {
    const hints = tier >= 30 ? 3 : tier >= 15 ? 2 : 1;
    return { type: "hints", amount: hints, label: `${hints} Hint${hints === 1 ? "" : "s"}` };
  }

  const coins = 250 + tier * 95;
  return { type: "coins", amount: coins, label: `${coins} Coins` };
}

function makePremiumReward(tier: number): SeasonReward {
  if (tier % 5 === 0) {
    const hints = tier >= 30 ? 4 : tier >= 15 ? 3 : 2;
    return { type: "hints", amount: hints, label: `${hints} Hint${hints === 1 ? "" : "s"}` };
  }

  if (tier % 2 === 0) {
    const passXp = 120 + tier * 20;
    return { type: "pass_xp", amount: passXp, label: `${passXp} Pass XP` };
  }

  const coins = 600 + tier * 120;
  return { type: "coins", amount: coins, label: `${coins} Coins` };
}

const PREMIUM_ITEM_TIERS: Record<number, SeasonReward> = {
  1: { type: "item", itemId: "puzzle_theme_electric", label: "Electric Puzzle Theme" },
  4: { type: "item", itemId: "card_neon_circuit", label: "Neon Circuit Card" },
  7: { type: "item", itemId: "banner_static_shock", label: "Static Shock Banner" },
  10: { type: "item", itemId: "frame_pulse", label: "Pulse Frame" },
  13: { type: "item", itemId: "emblem_voltage", label: "Voltage Emblem" },
  16: { type: "item", itemId: "frame_elite_obsidian", label: "Obsidian Elite Frame" },
  22: { type: "item", itemId: "frame_elite_nova", label: "Nova Elite Frame" },
  28: { type: "item", itemId: "frame_elite_inferno", label: "Inferno Elite Frame" },
  36: { type: "item", itemId: "avatar_season1_neon_strategist", label: "Neon Strategist Avatar" },
  37: { type: "item", itemId: "frame_elite_aurora", label: "Aurora Elite Frame" },
  38: { type: "item", itemId: "banner_season1_neon_rivals", label: "Season 1 Banner" },
  39: { type: "item", itemId: "ranked_card_season1_highrank", label: "Neon Rivals High-Rank Card" },
  40: { type: "item", itemId: "avatar_season1_neon_rival", label: "Neon Rival Avatar" },
};

export function buildNeonRivalsTracks(currentTier = 14, maxTier = 40): SeasonTrack[] {
  return Array.from({ length: maxTier }, (_, index) => {
    const tier = index + 1;
    return {
      tier,
      freeReward: makeFreeReward(tier),
      premiumReward: PREMIUM_ITEM_TIERS[tier] ?? makePremiumReward(tier),
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
    id: "sq_ranked_finish",
    title: "Finish 5 Ranked Battles",
    description: "Finish five ranked Arena battles to bank extra Season 1 pass XP and coins.",
    track: "seasonal",
    target: 5,
    progress: 0,
    reward: { coins: 1200, passXp: 350 },
    isCompleted: false,
  },
  {
    id: "sq_ranked_wins",
    title: "Win 3 Ranked Matches",
    description: "String together ranked wins to accelerate your season-pass progress.",
    track: "seasonal",
    target: 3,
    progress: 0,
    reward: { coins: 900, passXp: 260, shards: 90 },
    isCompleted: false,
  },
  {
    id: "sq_pass_climb",
    title: "Earn 5000 Pass XP",
    description: "Climb the full Neon Rivals season lane and lock in another premium milestone.",
    track: "seasonal",
    target: 5000,
    progress: 0,
    reward: { coins: 1800, passXp: 500, itemId: "card_neon_circuit" },
    isCompleted: false,
  },
];

export function isSeasonOnePremiumAvatarReward(itemId?: string | null) {
  return itemId === "avatar_season1_neon_strategist" || itemId === "avatar_season1_neon_rival";
}

export function findSeasonalCosmetic(itemId?: string | null) {
  return NEON_RIVALS_COSMETICS.find((entry) => entry.id === itemId) ?? null;
}

export function getRankedRewardForTier(tier: RankTier) {
  return NEON_RIVALS_RANKED_REWARDS.find((entry) => entry.tier === tier) ?? null;
}

