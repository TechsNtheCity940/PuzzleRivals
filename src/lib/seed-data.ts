import type {
  UserProfile,
  LeaderboardEntry,
  Tournament,
  DailyChallenge,
  StoreItem,
  SeasonPass,
  Clan,
  PuzzleMeta,
  RankBand,
  VipMembership,
  GameNotification,
  PuzzleType,
} from "./types";
import { CURRENT_NEON_RIVALS_SEASON, NEON_RIVALS_STORE_ITEMS } from "./season-content";

const EMPTY_PUZZLE_SKILLS: Partial<Record<PuzzleType, number>> = {
  rotate_pipes: 0,
  circuit_clash: 0,
  link_lock: 0,
  mirror_maze: 0,
  number_grid: 0,
  pattern_match: 0,
  word_scramble: 0,
  crossword_mini: 0,
  tile_slide: 0,
  sudoku_mini: 0,
  word_search: 0,
  matching_pairs: 0,
  spatial_reasoning: 0,
  maze: 0,
  pathfinder: 0,
  memory_grid: 0,
  glyph_rush: 0,
  riddle_choice: 0,
  wordle_guess: 0,
  chess_tactic: 0,
  checkers_tactic: 0,
  logic_sequence: 0,
  trivia_blitz: 0,
  geography_quiz: 0,
  science_quiz: 0,
  math_race: 0,
  code_breaker: 0,
  analogies: 0,
  deduction_grid: 0,
  chess_endgame: 0,
  chess_opening: 0,
  chess_mate_net: 0,
  vocabulary_duel: 0,
};

export const PUZZLE_TYPES: PuzzleMeta[] = [
  { type: "rotate_pipes", label: "Pipe Flow", icon: "Wrench", description: "Rotate pipe tiles to connect the flow" },
  { type: "circuit_clash", label: "Circuit Clash", icon: "Bolt", description: "Power the circuit grid from source to goal nodes" },
  { type: "link_lock", label: "Link Lock", icon: "Link", description: "Connect matching nodes without crossing live routes" },
  { type: "mirror_maze", label: "Mirror Maze", icon: "Sparkles", description: "Rotate mirrors until the beam lights every target" },
  { type: "number_grid", label: "Number Crunch", icon: "123", description: "Fill the grid with correct sums" },
  { type: "pattern_match", label: "Pattern Eye", icon: "Eye", description: "Find the matching pattern" },
  { type: "word_scramble", label: "Word Blitz", icon: "ABC", description: "Unscramble the letters" },
  { type: "crossword_mini", label: "Crossword Clash", icon: "Clue", description: "Solve clue-based mini crossword entries" },
  { type: "tile_slide", label: "Tile Shift", icon: "Tile", description: "Slide tiles into position" },
  { type: "sudoku_mini", label: "Sudoku Sprint", icon: "Grid", description: "4x4 speed sudoku" },
  { type: "word_search", label: "Word Hunt", icon: "Search", description: "Find hidden words" },
  { type: "matching_pairs", label: "Match Maker", icon: "Link", description: "Match terms with their paired clue or meaning" },
  { type: "spatial_reasoning", label: "Spatial Spin", icon: "Shape", description: "Pick the rotated or mirrored shape that fits" },
  { type: "maze", label: "Maze Rush", icon: "Maze", description: "Navigate the maze fastest" },
  { type: "pathfinder", label: "Pathfinder", icon: "Route", description: "Trace the valid route through a blocked grid" },
  { type: "memory_grid", label: "Memory Flash", icon: "Brain", description: "Remember the pattern" },
  { type: "glyph_rush", label: "Glyph Rush", icon: "Sparkles", description: "Recreate the glowing rune pattern from memory" },
  { type: "riddle_choice", label: "Riddle Relay", icon: "Riddle", description: "Solve rapid-fire riddles with multiple-choice answers" },
  { type: "wordle_guess", label: "Word Strike", icon: "Word", description: "Guess the hidden five-letter word using color feedback" },
  { type: "chess_tactic", label: "Chess Shot", icon: "Knight", description: "Pick the best tactical move from a chess position" },
  { type: "checkers_tactic", label: "Checkers Trap", icon: "Checkers", description: "Choose the strongest capture in a checkers setup" },
  { type: "logic_sequence", label: "Logic Sequence", icon: "Sequence", description: "Find the next term in a number or symbol pattern" },
  { type: "trivia_blitz", label: "Trivia Blitz", icon: "Trivia", description: "Rapid-fire general knowledge questions" },
  { type: "geography_quiz", label: "Geo Sprint", icon: "Globe", description: "Capitals, flags, and world geography" },
  { type: "science_quiz", label: "Science Snap", icon: "Science", description: "Quick science and technology questions" },
  { type: "math_race", label: "Math Race", icon: "Math", description: "Mental arithmetic and fast numeric logic" },
  { type: "code_breaker", label: "Code Breaker", icon: "Code", description: "Crack the right code from number clues" },
  { type: "analogies", label: "Analogy Ace", icon: "Analogy", description: "Match relationships between ideas and words" },
  { type: "deduction_grid", label: "Deduction Grid", icon: "Deduction", description: "Choose the clue that completes a logic grid" },
  { type: "chess_endgame", label: "Chess Endgame", icon: "Rook", description: "Find the winning plan in an endgame" },
  { type: "chess_opening", label: "Chess Opening", icon: "Bishop", description: "Choose the principled opening continuation" },
  { type: "chess_mate_net", label: "Mate Net", icon: "Queen", description: "Spot the move that spins a mating net" },
  { type: "vocabulary_duel", label: "Vocab Duel", icon: "Book", description: "Pick the strongest synonym or definition" },
];

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
  { tier: "master", division: 1, minElo: 3200, maxElo: 3599, label: "Master" },
  { tier: "grandmaster", division: 1, minElo: 3600, maxElo: 3999, label: "Grandmaster" },
  { tier: "legend", division: 1, minElo: 4000, maxElo: 9999, label: "Legend" },
];

export const CURRENT_USER: UserProfile = {
  id: "u_self",
  username: "Guest Player",
  email: null,
  avatarId: "blue-spinner",
  frameId: undefined,
  themeId: undefined,
  hintBalance: 0,
  hasSeasonPass: false,
  vipExpiresAt: null,
  elo: 0,
  rank: "bronze",
  level: 1,
  xp: 0,
  xpToNext: 5000,
  coins: 0,
  gems: 0,
  puzzleShards: 0,
  rankPoints: 0,
  passXp: 0,
  wins: 0,
  losses: 0,
  winStreak: 0,
  bestStreak: 0,
  matchesPlayed: 0,
  joinedAt: "2026-03-12",
  isVip: false,
  isGuest: true,
  authMethod: "guest",
  linkedProviders: {
    email: false,
    facebook: false,
    tiktok: false,
  },
  securityQuestionsConfigured: false,
  bestPuzzleType: null,
  worstPuzzleType: null,
  rivalUserId: null,
  socialLinks: {},
  puzzleSkills: { ...EMPTY_PUZZLE_SKILLS },
  nemeses: [],
  friends: [],
};

function withSkills(skills: Partial<Record<PuzzleType, number>>) {
  return { ...EMPTY_PUZZLE_SKILLS, ...skills };
}

export const PLAYERS: UserProfile[] = [
  { ...CURRENT_USER },
  { id: "u_2", username: "CipherKing", elo: 2850, rank: "diamond", level: 54, xp: 8200, xpToNext: 10000, coins: 34000, gems: 230, puzzleShards: 410, rankPoints: 2960, passXp: 8900, wins: 412, losses: 123, winStreak: 8, bestStreak: 21, matchesPlayed: 535, joinedAt: "2025-06-01", isVip: true, socialLinks: { tiktok: "@cipherking" }, puzzleSkills: withSkills({ rotate_pipes: 92, number_grid: 88, pattern_match: 95, word_scramble: 80, tile_slide: 85, sudoku_mini: 78, word_search: 72, maze: 90, memory_grid: 87, chess_tactic: 91, trivia_blitz: 84 }) , nemeses: ["u_self"], friends: ["u_3"] },
  { id: "u_3", username: "QuickMind", elo: 1420, rank: "gold", level: 22, xp: 2100, xpToNext: 4000, coins: 8200, gems: 45, puzzleShards: 95, rankPoints: 1325, passXp: 3200, wins: 98, losses: 76, winStreak: 3, bestStreak: 9, matchesPlayed: 174, joinedAt: "2025-10-20", isVip: false, socialLinks: {}, puzzleSkills: withSkills({ rotate_pipes: 62, number_grid: 70, pattern_match: 58, word_scramble: 75, tile_slide: 55, sudoku_mini: 68, word_search: 80, maze: 50, memory_grid: 60, geography_quiz: 73, vocabulary_duel: 76 }), nemeses: [], friends: ["u_self", "u_2"] },
  { id: "u_4", username: "GridWitch", elo: 2100, rank: "platinum", level: 38, xp: 5600, xpToNext: 7000, coins: 22000, gems: 150, puzzleShards: 260, rankPoints: 2240, passXp: 6100, wins: 267, losses: 145, winStreak: 2, bestStreak: 15, matchesPlayed: 412, joinedAt: "2025-07-10", isVip: true, socialLinks: { facebook: "gridwitch" }, puzzleSkills: withSkills({ rotate_pipes: 85, number_grid: 90, pattern_match: 78, word_scramble: 65, tile_slide: 88, sudoku_mini: 92, word_search: 60, maze: 75, memory_grid: 82, deduction_grid: 89, logic_sequence: 87 }), nemeses: ["u_5"], friends: ["u_self"] },
  { id: "u_5", username: "BlazeLogic", elo: 1850, rank: "gold", level: 31, xp: 4200, xpToNext: 6000, coins: 15600, gems: 95, puzzleShards: 180, rankPoints: 1765, passXp: 4700, wins: 178, losses: 110, winStreak: 0, bestStreak: 11, matchesPlayed: 288, joinedAt: "2025-08-05", isVip: false, socialLinks: { tiktok: "@blazelogic" }, puzzleSkills: withSkills({ rotate_pipes: 72, number_grid: 75, pattern_match: 80, word_scramble: 82, tile_slide: 65, sudoku_mini: 70, word_search: 78, maze: 85, memory_grid: 73, code_breaker: 81, math_race: 79 }), nemeses: ["u_self", "u_4"], friends: [] },
  { id: "u_6", username: "MasterVex", elo: 3520, rank: "master", level: 72, xp: 12000, xpToNext: 15000, coins: 58000, gems: 420, puzzleShards: 860, rankPoints: 3510, passXp: 12400, wins: 623, losses: 87, winStreak: 14, bestStreak: 31, matchesPlayed: 710, joinedAt: "2025-03-15", isVip: true, socialLinks: { tiktok: "@mastervex", facebook: "mastervex" }, puzzleSkills: withSkills({ rotate_pipes: 98, number_grid: 96, pattern_match: 99, word_scramble: 90, tile_slide: 94, sudoku_mini: 95, word_search: 88, maze: 97, memory_grid: 96, chess_tactic: 99, chess_endgame: 98, chess_opening: 94, chess_mate_net: 97 }), nemeses: [], friends: ["u_2"] },
  { id: "u_7", username: "PuzzlePawn", elo: 620, rank: "bronze", level: 8, xp: 800, xpToNext: 1500, coins: 2400, gems: 10, puzzleShards: 24, rankPoints: 540, passXp: 950, wins: 23, losses: 34, winStreak: 1, bestStreak: 4, matchesPlayed: 57, joinedAt: "2026-01-20", isVip: false, socialLinks: {}, puzzleSkills: withSkills({ rotate_pipes: 30, number_grid: 35, pattern_match: 28, word_scramble: 40, tile_slide: 25, sudoku_mini: 32, word_search: 38, maze: 22, memory_grid: 27, trivia_blitz: 41, analogies: 44 }), nemeses: [], friends: ["u_self"] },
  { id: "u_8", username: "NeonOracle", avatarId: "season1-neon-rival", playerCardId: "card_neon_circuit", bannerId: "banner_static_shock", emblemId: "emblem_voltage", frameId: "frame_pulse", themeId: "puzzle_theme_electric", elo: 3785, rank: "grandmaster", level: 81, xp: 13800, xpToNext: 16000, coins: 64000, gems: 520, puzzleShards: 920, rankPoints: 3820, passXp: 15100, wins: 702, losses: 104, winStreak: 10, bestStreak: 28, matchesPlayed: 806, joinedAt: "2025-04-18", isVip: true, socialLinks: { tiktok: "@neonoracle" }, puzzleSkills: withSkills({ pattern_match: 98, memory_grid: 97, maze: 96, wordle_guess: 94, number_grid: 95, chess_tactic: 93 }), nemeses: ["u_6"], friends: ["u_2", "u_4"] },
  { id: "u_9", username: "LegendVolt", avatarId: "season1-neon-strategist", playerCardId: "ranked_card_season1_highrank", bannerId: "banner_season1_neon_rivals", emblemId: "emblem_voltage", frameId: "frame_elite_aurora", themeId: "puzzle_theme_electric", elo: 4225, rank: "legend", level: 95, xp: 18200, xpToNext: 20000, coins: 82000, gems: 760, puzzleShards: 1240, rankPoints: 4380, passXp: 19800, wins: 980, losses: 112, winStreak: 18, bestStreak: 40, matchesPlayed: 1092, joinedAt: "2025-02-11", isVip: true, socialLinks: { facebook: "legendvolt", tiktok: "@legendvolt" }, puzzleSkills: withSkills({ rotate_pipes: 99, number_grid: 99, pattern_match: 100, tile_slide: 96, sudoku_mini: 98, maze: 99, chess_tactic: 100, logic_sequence: 97 }), nemeses: ["u_6", "u_8"], friends: ["u_2"] },
];

export const LEADERBOARD: LeaderboardEntry[] = PLAYERS
  .filter((player) => player.id !== "u_self")
  .sort((left, right) => right.elo - left.elo)
  .map((player, index) => ({
    rank: index + 1,
    userId: player.id,
    username: player.username,
    elo: player.elo,
    rankTier: player.rank,
    wins: player.wins,
  }));

export const TOURNAMENTS: Tournament[] = [
  { id: "t_1", name: "Pipe Masters Open", puzzleType: "rotate_pipes", entryFee: 500, prizePool: 15000, maxPlayers: 64, currentPlayers: 48, startsAt: "2026-03-12T18:00:00Z", status: "upcoming" },
  { id: "t_2", name: "Speed Grid Championship", puzzleType: "number_grid", entryFee: 1000, prizePool: 30000, maxPlayers: 32, currentPlayers: 32, startsAt: "2026-03-11T14:00:00Z", status: "live" },
  { id: "t_3", name: "Pattern Blitz Weekly", puzzleType: "pattern_match", entryFee: 200, prizePool: 5000, maxPlayers: 128, currentPlayers: 91, startsAt: "2026-03-14T20:00:00Z", status: "upcoming" },
  { id: "t_4", name: "Word War Invitational", puzzleType: "word_scramble", entryFee: 0, prizePool: 8000, maxPlayers: 256, currentPlayers: 256, startsAt: "2026-03-10T12:00:00Z", status: "completed" },
];

export const DAILY_CHALLENGES: DailyChallenge[] = [
  { id: "dc_1", date: "2026-03-11", puzzleConfig: { type: "rotate_pipes", seed: 31126, difficulty: 3, timeLimit: 90, gridSize: 5 }, title: "The 1% Puzzle", description: "Only 1% of players solve this pipe puzzle. Are you elite?", reward: { xp: 500, coins: 2000, gems: 10 }, completedBy: 142, isCompleted: false },
  { id: "dc_2", date: "2026-03-11", puzzleConfig: { type: "memory_grid", seed: 31127, difficulty: 2, timeLimit: 60, gridSize: 4 }, title: "Memory Streak", description: "3-day streak bonus active!", reward: { xp: 300, coins: 800 }, completedBy: 1240, isCompleted: true },
];

export const STORE_ITEMS: StoreItem[] = [
  { id: "s_1", name: "Neon Circuit", description: "Electrified puzzle theme with glowing grid lines", category: "theme", rarity: 3, priceGems: 120, isFeatured: true, collection: "Neon Rivals Legacy" },
  { id: "s_2", name: "Void Frame", description: "A frame forged in the absence of light", category: "frame", rarity: 4, priceGems: 250, collection: "Void Logic" },
  { id: "s_3", name: "Geometric Avatar Pack", description: "6 abstract geometric avatars", category: "avatar", rarity: 2, priceCoins: 5000, collection: "Launch Core" },
  { id: "s_4", name: "Hint Pack x10", description: "10 puzzle hints for when you need an edge", category: "hint_pack", rarity: 1, priceCoins: 2000 },
  { id: "s_5", name: "Starter Bundle", description: "5000 Coins + 50 Gems + Rare Frame", category: "bundle", rarity: 2, priceUsd: 4.99, isFeatured: true, collection: "Launch Core" },
  { id: "s_6", name: "Season 1: Neon Rivals Battle Pass", description: "Unlock 40 tiers of Neon Rivals rewards, including the Neon Strategist avatar.", category: "battle_pass", rarity: 4, priceUsd: 9.99, isFeatured: true, collection: "Season 1: Neon Rivals" },
  { id: "s_7", name: "Obsidian Skin", description: "Dark-on-dark puzzle board aesthetic", category: "theme", rarity: 2, priceGems: 80, collection: "Obsidian" },
  { id: "s_8", name: "Minimalist Lines", description: "Ultra-clean wireframe theme", category: "theme", rarity: 1, priceCoins: 3000, collection: "Core Deck" },
  { id: "s_9", name: "Diamond Edge Frame", description: "Cut with precision, earned with skill", category: "frame", rarity: 3, priceGems: 180, isOwned: true, collection: "Ranked Vault" },
  { id: "s_10", name: "Pro Hint Pack x25", description: "25 hints for casual and solo modes", category: "hint_pack", rarity: 2, priceGems: 60 },
  { id: "s_11", name: "Static Shock Card", description: "Animated neon player card for leaderboard intros.", category: "player_card", rarity: 4, priceGems: 200, collection: "Neon Rivals Legacy" },
  { id: "s_12", name: "Aurora Grid Banner", description: "Lobby banner with aurora streaks and puzzle lattice cuts.", category: "banner", rarity: 3, priceCoins: 4200, collection: "Neon Rivals Legacy" },
  { id: "s_13", name: "Word Master Emblem", description: "Equip a mastery emblem for vocabulary and riddle specialists.", category: "emblem", rarity: 2, priceCoins: 2400, collection: "Mastery" },
  { id: "s_14", name: "Founder Title", description: "A prestige profile title reserved for early rivals.", category: "title", rarity: 5, priceGems: 320, collection: "Legacy" },
  { id: "s_15", name: "Inferno Collection", description: "Avatar, banner, frame, and card from the Inferno identity line.", category: "bundle", rarity: 4, priceUsd: 12.99, collection: "Inferno" },
  { id: "s_16", name: "Storm Solver Avatar", description: "Static 2D rival portrait built around a charged puzzle spinner.", category: "avatar", rarity: 3, priceGems: 140, collection: "Storm Matrix" },
  { id: "s_17", name: "Puzzle Vault Banner", description: "Premium profile banner styled like a sealed puzzle archive.", category: "banner", rarity: 4, priceGems: 160, collection: "Puzzle Vault" },
  { id: "s_18", name: "Season Victor Emblem", description: "Exclusive rank-chase emblem with seasonal prestige polish.", category: "emblem", rarity: 5, priceGems: 260, collection: "Season Rewards" },
  { id: "s_19", name: "Voltage Pulse Frame", description: "Animated electric frame with charge arcs around the portrait.", category: "frame", rarity: 5, priceGems: 300, collection: "Neon Rivals Legacy" },
  { id: "s_20", name: "Holograph Grid Card", description: "Reactive player card that sharpens during intro reveals.", category: "player_card", rarity: 5, priceGems: 340, collection: "Holograph" },
  ...NEON_RIVALS_STORE_ITEMS,
];

export const CURRENT_SEASON: SeasonPass = {
  ...CURRENT_NEON_RIVALS_SEASON,
  tracks: CURRENT_NEON_RIVALS_SEASON.tracks.map((track) => ({
    ...track,
    freeReward: track.freeReward ? { ...track.freeReward } : undefined,
    premiumReward: track.premiumReward ? { ...track.premiumReward } : undefined,
  })),
};

export const VIP_MEMBERSHIP: VipMembership = {
  isActive: false,
  perks: [
    "2x Coin earnings from matches",
    "Exclusive VIP badge and frame",
    "Priority matchmaking",
    "Ad-free experience",
    "Monthly 500 Gem bonus",
    "Exclusive VIP tournaments",
  ],
  priceUsd: 7.99,
};

export const CLANS: Clan[] = [
  {
    id: "c_1",
    name: "Logic Lords",
    tag: "LGL",
    memberCount: 28,
    maxMembers: 30,
    trophies: 45200,
    rank: 1,
    leaderId: "u_6",
    members: [
      { userId: "u_6", username: "MasterVex", role: "leader", trophiesContributed: 12000, joinedAt: "2025-03-15" },
      { userId: "u_2", username: "CipherKing", role: "officer", trophiesContributed: 8500, joinedAt: "2025-06-01" },
      { userId: "u_4", username: "GridWitch", role: "member", trophiesContributed: 5200, joinedAt: "2025-09-10" },
    ],
  },
  {
    id: "c_2",
    name: "Brain Surge",
    tag: "BRN",
    memberCount: 22,
    maxMembers: 30,
    trophies: 31400,
    rank: 3,
    leaderId: "u_5",
    members: [{ userId: "u_5", username: "BlazeLogic", role: "leader", trophiesContributed: 7800, joinedAt: "2025-08-05" }],
  },
];

export const NOTIFICATIONS: GameNotification[] = [
  { id: "n_1", type: "challenge", title: "Beat My Brain!", message: "CipherKing challenges you to a Pipe Flow duel", createdAt: "2026-03-11T10:30:00Z", isRead: false },
  { id: "n_2", type: "reward", title: "Streak Bonus!", message: "5-win streak! +500 bonus coins", createdAt: "2026-03-11T09:15:00Z", isRead: false },
  { id: "n_3", type: "season", title: "Season 1: Neon Rivals", message: "Pulse Frame, Voltage Emblem, and the Neon Strategist avatar are now live.", createdAt: "2026-03-20T20:00:00Z", isRead: true },
  { id: "n_4", type: "clan_invite", title: "Clan Invite", message: "Logic Lords wants you to join!", createdAt: "2026-03-10T18:00:00Z", isRead: true },
];

export function getRankBand(elo: number): RankBand {
  return RANK_BANDS.find((band) => elo >= band.minElo && elo <= band.maxElo) || RANK_BANDS[0];
}

export function getRankColor(tier: string): string {
  const map: Record<string, string> = {
    bronze: "rank-bronze",
    silver: "rank-silver",
    gold: "rank-gold",
    platinum: "rank-platinum",
    diamond: "rank-diamond",
    master: "rank-master",
    grandmaster: "rank-grandmaster",
    legend: "rank-legend",
  };
  return map[tier] || "rank-bronze";
}

export function romanNumeral(n: number): string {
  return ["", "I", "II", "III", "IV"][n] || String(n);
}
