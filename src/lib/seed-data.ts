import type {
  UserProfile, LeaderboardEntry, Tournament, DailyChallenge,
  StoreItem, SeasonPass, Clan, PuzzleMeta, RankBand, VipMembership, GameNotification
} from "./types";

// ---------- Puzzle Metadata ----------
export const PUZZLE_TYPES: PuzzleMeta[] = [
  { type: "rotate_pipes", label: "Pipe Flow", icon: "🔧", description: "Rotate pipe tiles to connect the flow" },
  { type: "number_grid", label: "Number Crunch", icon: "🔢", description: "Fill the grid with correct sums" },
  { type: "pattern_match", label: "Pattern Eye", icon: "👁", description: "Find the matching pattern" },
  { type: "word_scramble", label: "Word Blitz", icon: "🔤", description: "Unscramble the letters" },
  { type: "tile_slide", label: "Tile Shift", icon: "⬜", description: "Slide tiles into position" },
  { type: "sudoku_mini", label: "Sudoku Sprint", icon: "🧩", description: "4×4 speed sudoku" },
  { type: "word_search", label: "Word Hunt", icon: "🔍", description: "Find hidden words" },
  { type: "maze", label: "Maze Rush", icon: "🏁", description: "Navigate the maze fastest" },
  { type: "memory_grid", label: "Memory Flash", icon: "🧠", description: "Remember the pattern" },
];

// ---------- Rank Bands ----------
export const RANK_BANDS: RankBand[] = [
  { tier: "bronze", division: 3, minElo: 0, maxElo: 399, label: "Bronze III" },
  { tier: "bronze", division: 2, minElo: 400, maxElo: 599, label: "Bronze II" },
  { tier: "bronze", division: 1, minElo: 600, maxElo: 799, label: "Bronze I" },
  { tier: "silver", division: 3, minElo: 800, maxElo: 999, label: "Silver III" },
  { tier: "silver", division: 2, minElo: 1000, maxElo: 1199, label: "Silver II" },
  { tier: "silver", division: 1, minElo: 1200, maxElo: 1399, label: "Silver I" },
  { tier: "gold", division: 3, minElo: 1400, maxElo: 1599, label: "Gold III" },
  { tier: "gold", division: 2, minElo: 1600, maxElo: 1799, label: "Gold II" },
  { tier: "gold", division: 1, minElo: 1800, maxElo: 1999, label: "Gold I" },
  { tier: "platinum", division: 3, minElo: 2000, maxElo: 2199, label: "Platinum III" },
  { tier: "platinum", division: 2, minElo: 2200, maxElo: 2399, label: "Platinum II" },
  { tier: "platinum", division: 1, minElo: 2400, maxElo: 2599, label: "Platinum I" },
  { tier: "diamond", division: 3, minElo: 2600, maxElo: 2799, label: "Diamond III" },
  { tier: "diamond", division: 2, minElo: 2800, maxElo: 2999, label: "Diamond II" },
  { tier: "diamond", division: 1, minElo: 3000, maxElo: 3199, label: "Diamond I" },
  { tier: "master", division: 1, minElo: 3200, maxElo: 9999, label: "Master" },
];

// ---------- Current User ----------
export const CURRENT_USER: UserProfile = {
  id: "u_self",
  username: "New Challenger",
  elo: 0,
  rank: "bronze",
  level: 1,
  xp: 0,
  xpToNext: 5000,
  coins: 0,
  gems: 0,
  wins: 0,
  losses: 0,
  winStreak: 0,
  bestStreak: 0,
  matchesPlayed: 0,
  joinedAt: "2026-03-12",
  isVip: false,
  socialLinks: {},
  puzzleSkills: {
    rotate_pipes: 0,
    number_grid: 0,
    pattern_match: 0,
    word_scramble: 0,
    tile_slide: 0,
    sudoku_mini: 0,
    word_search: 0,
    maze: 0,
    memory_grid: 0,
  },
  nemeses: [],
  friends: [],
};

// ---------- Fake Players ----------
export const PLAYERS: UserProfile[] = [
  { ...CURRENT_USER },
  { id: "u_2", username: "CipherKing", elo: 2850, rank: "diamond", level: 54, xp: 8200, xpToNext: 10000, coins: 34000, gems: 230, wins: 412, losses: 123, winStreak: 8, bestStreak: 21, matchesPlayed: 535, joinedAt: "2025-06-01", isVip: true, socialLinks: { tiktok: "@cipherking" }, puzzleSkills: { rotate_pipes: 92, number_grid: 88, pattern_match: 95, word_scramble: 80, tile_slide: 85, sudoku_mini: 78, word_search: 72, maze: 90, memory_grid: 87 }, nemeses: ["u_self"], friends: ["u_3"] },
  { id: "u_3", username: "QuickMind", elo: 1420, rank: "gold", level: 22, xp: 2100, xpToNext: 4000, coins: 8200, gems: 45, wins: 98, losses: 76, winStreak: 3, bestStreak: 9, matchesPlayed: 174, joinedAt: "2025-10-20", isVip: false, socialLinks: {}, puzzleSkills: { rotate_pipes: 62, number_grid: 70, pattern_match: 58, word_scramble: 75, tile_slide: 55, sudoku_mini: 68, word_search: 80, maze: 50, memory_grid: 60 }, nemeses: [], friends: ["u_self", "u_2"] },
  { id: "u_4", username: "GridWitch", elo: 2100, rank: "platinum", level: 38, xp: 5600, xpToNext: 7000, coins: 22000, gems: 150, wins: 267, losses: 145, winStreak: 2, bestStreak: 15, matchesPlayed: 412, joinedAt: "2025-07-10", isVip: true, socialLinks: { facebook: "gridwitch" }, puzzleSkills: { rotate_pipes: 85, number_grid: 90, pattern_match: 78, word_scramble: 65, tile_slide: 88, sudoku_mini: 92, word_search: 60, maze: 75, memory_grid: 82 }, nemeses: ["u_5"], friends: ["u_self"] },
  { id: "u_5", username: "BlazeLogic", elo: 1850, rank: "gold", level: 31, xp: 4200, xpToNext: 6000, coins: 15600, gems: 95, wins: 178, losses: 110, winStreak: 0, bestStreak: 11, matchesPlayed: 288, joinedAt: "2025-08-05", isVip: false, socialLinks: { tiktok: "@blazelogic" }, puzzleSkills: { rotate_pipes: 72, number_grid: 75, pattern_match: 80, word_scramble: 82, tile_slide: 65, sudoku_mini: 70, word_search: 78, maze: 85, memory_grid: 73 }, nemeses: ["u_self", "u_4"], friends: [] },
  { id: "u_6", username: "MasterVex", elo: 3350, rank: "master", level: 72, xp: 12000, xpToNext: 15000, coins: 58000, gems: 420, wins: 623, losses: 87, winStreak: 14, bestStreak: 31, matchesPlayed: 710, joinedAt: "2025-03-15", isVip: true, socialLinks: { tiktok: "@mastervex", facebook: "mastervex" }, puzzleSkills: { rotate_pipes: 98, number_grid: 96, pattern_match: 99, word_scramble: 90, tile_slide: 94, sudoku_mini: 95, word_search: 88, maze: 97, memory_grid: 96 }, nemeses: [], friends: ["u_2"] },
  { id: "u_7", username: "PuzzlePawn", elo: 620, rank: "bronze", level: 8, xp: 800, xpToNext: 1500, coins: 2400, gems: 10, wins: 23, losses: 34, winStreak: 1, bestStreak: 4, matchesPlayed: 57, joinedAt: "2026-01-20", isVip: false, socialLinks: {}, puzzleSkills: { rotate_pipes: 30, number_grid: 35, pattern_match: 28, word_scramble: 40, tile_slide: 25, sudoku_mini: 32, word_search: 38, maze: 22, memory_grid: 27 }, nemeses: [], friends: ["u_self"] },
];

// ---------- Leaderboard ----------
export const LEADERBOARD: LeaderboardEntry[] = PLAYERS
  .filter(p => p.id !== "u_self")
  .sort((a, b) => b.elo - a.elo)
  .map((p, i) => ({
    rank: i + 1,
    userId: p.id,
    username: p.username,
    elo: p.elo,
    rankTier: p.rank,
    wins: p.wins,
  }));

// ---------- Tournaments ----------
export const TOURNAMENTS: Tournament[] = [
  { id: "t_1", name: "Pipe Masters Open", puzzleType: "rotate_pipes", entryFee: 500, prizePool: 15000, maxPlayers: 64, currentPlayers: 48, startsAt: "2026-03-12T18:00:00Z", status: "upcoming" },
  { id: "t_2", name: "Speed Grid Championship", puzzleType: "number_grid", entryFee: 1000, prizePool: 30000, maxPlayers: 32, currentPlayers: 32, startsAt: "2026-03-11T14:00:00Z", status: "live" },
  { id: "t_3", name: "Pattern Blitz Weekly", puzzleType: "pattern_match", entryFee: 200, prizePool: 5000, maxPlayers: 128, currentPlayers: 91, startsAt: "2026-03-14T20:00:00Z", status: "upcoming" },
  { id: "t_4", name: "Word War Invitational", puzzleType: "word_scramble", entryFee: 0, prizePool: 8000, maxPlayers: 256, currentPlayers: 256, startsAt: "2026-03-10T12:00:00Z", status: "completed" },
];

// ---------- Daily Challenges ----------
export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: "dc_1", date: "2026-03-11", puzzleConfig: { type: "rotate_pipes", seed: 31126, difficulty: 3, timeLimit: 90, gridSize: 5 }, title: "The 1% Puzzle", description: "Only 1% of players solve this pipe puzzle. Are you elite?", reward: { xp: 500, coins: 2000, gems: 10 }, completedBy: 142, isCompleted: false },
  { id: "dc_2", date: "2026-03-11", puzzleConfig: { type: "memory_grid", seed: 31127, difficulty: 2, timeLimit: 60, gridSize: 4 }, title: "Memory Streak", description: "3-day streak bonus active!", reward: { xp: 300, coins: 800 }, completedBy: 1240, isCompleted: true },
];

// ---------- Store Items ----------
export const STORE_ITEMS: StoreItem[] = [
  { id: "s_1", name: "Neon Circuit", description: "Electrified puzzle theme with glowing grid lines", category: "theme", rarity: 3, priceGems: 120, isFeatured: true },
  { id: "s_2", name: "Void Frame", description: "A frame forged in the absence of light", category: "frame", rarity: 4, priceGems: 250 },
  { id: "s_3", name: "Geometric Avatar Pack", description: "6 abstract geometric avatars", category: "avatar", rarity: 2, priceCoins: 5000 },
  { id: "s_4", name: "Hint Pack ×10", description: "10 puzzle hints for when you need an edge", category: "hint_pack", rarity: 1, priceCoins: 2000 },
  { id: "s_5", name: "Starter Bundle", description: "5000 Coins + 50 Gems + Rare Frame", category: "bundle", rarity: 2, priceUsd: 4.99 },
  { id: "s_6", name: "Season XI Battle Pass", description: "Unlock 40 tiers of exclusive rewards", category: "battle_pass", rarity: 3, priceUsd: 9.99 },
  { id: "s_7", name: "Obsidian Skin", description: "Dark-on-dark puzzle board aesthetic", category: "theme", rarity: 2, priceGems: 80 },
  { id: "s_8", name: "Minimalist Lines", description: "Ultra-clean wireframe theme", category: "theme", rarity: 1, priceCoins: 3000 },
  { id: "s_9", name: "Diamond Edge Frame", description: "Cut with precision, earned with skill", category: "frame", rarity: 3, priceGems: 180, isOwned: true },
  { id: "s_10", name: "Pro Hint Pack ×25", description: "25 hints + bonus solve time", category: "hint_pack", rarity: 2, priceGems: 60 },
];

// ---------- Season Pass ----------
export const CURRENT_SEASON: SeasonPass = {
  id: "season_11",
  name: "Echoes of Logic",
  seasonNumber: 11,
  startsAt: "2026-02-01",
  endsAt: "2026-04-30",
  currentTier: 14,
  maxTier: 40,
  isPremium: false,
  tracks: Array.from({ length: 40 }, (_, i) => ({
    tier: i + 1,
    freeReward: i % 3 === 0 ? { type: "coins" as const, amount: 500 * (i + 1), label: `${500 * (i + 1)} Coins` } : i % 3 === 1 ? { type: "xp" as const, amount: 200 * (i + 1), label: `${200 * (i + 1)} XP` } : undefined,
    premiumReward: { type: i % 5 === 0 ? "item" as const : i % 2 === 0 ? "gems" as const : "coins" as const, amount: i % 5 === 0 ? undefined : (i + 1) * 100, itemId: i % 5 === 0 ? `s_${(i % 10) + 1}` : undefined, label: i % 5 === 0 ? "Exclusive Item" : `${(i + 1) * 100} ${i % 2 === 0 ? "Gems" : "Coins"}` },
    isUnlocked: i < 14,
  })),
};

// ---------- VIP ----------
export const VIP_MEMBERSHIP: VipMembership = {
  isActive: false,
  perks: [
    "2× Coin earnings from matches",
    "Exclusive VIP badge & frame",
    "Priority matchmaking",
    "Ad-free experience",
    "Monthly 500 Gem bonus",
    "Exclusive VIP tournaments",
  ],
  priceUsd: 7.99,
};

// ---------- Clans ----------
export const CLANS: Clan[] = [
  {
    id: "c_1", name: "Logic Lords", tag: "LGL", memberCount: 28, maxMembers: 30, trophies: 45200, rank: 1, leaderId: "u_6",
    members: [
      { userId: "u_6", username: "MasterVex", role: "leader", trophiesContributed: 12000, joinedAt: "2025-03-15" },
      { userId: "u_2", username: "CipherKing", role: "officer", trophiesContributed: 8500, joinedAt: "2025-06-01" },
      { userId: "u_4", username: "GridWitch", role: "member", trophiesContributed: 5200, joinedAt: "2025-09-10" },
    ],
  },
  {
    id: "c_2", name: "Brain Surge", tag: "BRN", memberCount: 22, maxMembers: 30, trophies: 31400, rank: 3, leaderId: "u_5",
    members: [
      { userId: "u_5", username: "BlazeLogic", role: "leader", trophiesContributed: 7800, joinedAt: "2025-08-05" },
    ],
  },
];

// ---------- Notifications ----------
export const NOTIFICATIONS: GameNotification[] = [
  { id: "n_1", type: "challenge", title: "Beat My Brain!", message: "CipherKing challenges you to a Pipe Flow duel", createdAt: "2026-03-11T10:30:00Z", isRead: false },
  { id: "n_2", type: "reward", title: "Streak Bonus!", message: "5-win streak! +500 bonus coins", createdAt: "2026-03-11T09:15:00Z", isRead: false },
  { id: "n_3", type: "season", title: "Season XI Update", message: "New tier rewards unlocked", createdAt: "2026-03-10T20:00:00Z", isRead: true },
  { id: "n_4", type: "clan_invite", title: "Clan Invite", message: "Logic Lords wants you to join!", createdAt: "2026-03-10T18:00:00Z", isRead: true },
];

// ---------- Helper ----------
export function getRankBand(elo: number): RankBand {
  return RANK_BANDS.find(b => elo >= b.minElo && elo <= b.maxElo) || RANK_BANDS[0];
}

export function getRankColor(tier: string): string {
  const map: Record<string, string> = {
    bronze: "rank-bronze",
    silver: "rank-silver",
    gold: "rank-gold",
    platinum: "rank-platinum",
    diamond: "rank-diamond",
    master: "rank-master",
  };
  return map[tier] || "rank-bronze";
}

export function romanNumeral(n: number): string {
  return ["", "I", "II", "III", "IV"][n] || String(n);
}
