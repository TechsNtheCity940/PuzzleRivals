// ==============================
// Puzzle Rivals — Core Data Types
// ==============================

// ---------- Puzzle Engine ----------
export type PuzzleType =
  | "rotate_pipes"
  | "number_grid"
  | "pattern_match"
  | "word_scramble"
  | "crossword_mini"
  | "tile_slide"
  | "sudoku_mini"
  | "word_search"
  | "matching_pairs"
  | "spatial_reasoning"
  | "maze"
  | "pathfinder"
  | "memory_grid"
  | "riddle_choice"
  | "wordle_guess"
  | "chess_tactic"
  | "checkers_tactic"
  | "logic_sequence"
  | "trivia_blitz"
  | "geography_quiz"
  | "science_quiz"
  | "math_race"
  | "code_breaker"
  | "analogies"
  | "deduction_grid"
  | "chess_endgame"
  | "chess_opening"
  | "chess_mate_net"
  | "vocabulary_duel";

export type StockAvatarId =
  | "blue-spinner"
  | "orange-cube"
  | "violet-popper"
  | "green-cube"
  | "season1-neon-rival"
  | "season1-neon-strategist";

export interface PuzzleConfig {
  type: PuzzleType;
  seed: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  timeLimit: number; // seconds
  gridSize: number;
}

export interface PuzzleMeta {
  type: PuzzleType;
  label: string;
  icon: string;
  description: string;
}

// ---------- Ranks ----------
export type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | "legend";

export interface RankBand {
  tier: RankTier;
  division: 1 | 2 | 3;
  minElo: number;
  maxElo: number;
  label: string;
}

// ---------- User / Profile ----------
export type UserAppRole = "player" | "admin" | "owner";

export interface UserProfile {
  id: string;
  username: string;
  email?: string | null;
  appRole?: UserAppRole | null;
  avatarId?: StockAvatarId;
  avatarUrl?: string;
  frameId?: string;
  themeId?: string;
  playerCardId?: string;
  bannerId?: string;
  emblemId?: string;
  titleId?: string;
  hintBalance?: number;
  hasSeasonPass?: boolean;
  vipExpiresAt?: string | null;
  vipAccess?: boolean;
  elo: number;
  rank: RankTier;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  gems: number;
  puzzleShards: number;
  rankPoints: number;
  passXp: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestStreak: number;
  matchesPlayed: number;
  joinedAt: string;
  isVip: boolean;
  isGuest?: boolean;
  authMethod?: "guest" | "email" | "facebook" | "tiktok";
  linkedProviders?: {
    email: boolean;
    facebook: boolean;
    tiktok: boolean;
  };
  securityQuestionsConfigured?: boolean;
  clanId?: string;
  bestPuzzleType?: PuzzleType | null;
  worstPuzzleType?: PuzzleType | null;
  rivalUserId?: string | null;
  socialLinks: {
    facebook?: string;
    tiktok?: string;
  };
  puzzleSkills: Partial<Record<PuzzleType, number>>; // 0-100 proficiency
  nemeses: string[]; // user IDs
  friends: string[];
}

// ---------- Match ----------
export type MatchPhase = "lobby" | "announcement" | "practice" | "round" | "results";

export interface MatchConfig {
  id: string;
  mode: "ranked" | "casual" | "royale" | "revenge" | "challenge" | "daily";
  puzzleConfig: PuzzleConfig;
  players: MatchPlayer[];
  phase: MatchPhase;
  startedAt?: string;
  endedAt?: string;
}

export interface MatchPlayer {
  userId: string;
  username: string;
  avatarUrl?: string;
  elo: number;
  rank: RankTier;
  progress: number; // 0-100
  timeMs?: number;
  score?: number;
  isWinner?: boolean;
}

export interface MatchResult {
  matchId: string;
  winnerId: string;
  players: MatchPlayer[];
  eloChanges: Record<string, number>;
  rewards: MatchReward;
  replayId: string;
}

export interface MatchReward {
  xp: number;
  coins: number;
  gems?: number;
  elo?: number;
  passXp?: number;
  rankPoints?: number;
  shards?: number;
  streakBonus?: number;
}

// ---------- Replay ----------
export interface Replay {
  id: string;
  matchId: string;
  puzzleConfig: PuzzleConfig;
  players: ReplayPlayer[];
  duration: number;
  createdAt: string;
}

export interface ReplayPlayer {
  userId: string;
  username: string;
  moves: ReplayMove[];
}

export interface ReplayMove {
  timestampMs: number;
  action: string;
  data: Record<string, unknown>;
}

// ---------- Economy / Store ----------
export type ItemCategory =
  | "theme"
  | "avatar"
  | "frame"
  | "player_card"
  | "banner"
  | "emblem"
  | "title"
  | "bundle"
  | "hint_pack"
  | "battle_pass"
  | "badge";
export type ItemRarity = 1 | 2 | 3 | 4 | 5 | 6; // common -> mythic

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  priceCoins?: number;
  priceGems?: number;
  priceUsd?: number;
  isComplimentary?: boolean;
  imageUrl?: string;
  isOwned?: boolean;
  isEquipped?: boolean;
  isFeatured?: boolean;
  collection?: string;
}

export type SeasonalContentCategory =
  | "avatar"
  | "player_card"
  | "banner"
  | "emblem"
  | "frame"
  | "badge"
  | "puzzle_theme";

export type SeasonalRewardSource =
  | "season_pass"
  | "season_milestone"
  | "ranked"
  | "featured_store";

export type SeasonalUnlockMethod =
  | "free_tier"
  | "premium_tier"
  | "season_objective"
  | "rank_finish"
  | "store_featured";

export interface SeasonalContentDefinition {
  id: string;
  name: string;
  seasonId: string;
  category: SeasonalContentCategory;
  rarity: ItemRarity;
  rewardSource: SeasonalRewardSource;
  unlockMethod: SeasonalUnlockMethod;
  imageRef: string;
  themeTags: string[];
  isAnimated: boolean;
  sortOrder: number;
  availableFrom?: string;
  availableTo?: string;
}

export interface RankedRewardDefinition {
  tier: RankTier;
  badgeId: string;
  badgeLabel: string;
  badgeAssetRef?: string;
  accentClassName?: string;
  frameId?: string;
  frameLabel?: string;
  bannerId?: string;
  bannerLabel?: string;
  playerCardId?: string;
  playerCardLabel?: string;
  summary: string;
}

export interface InventoryItem {
  itemId: string;
  acquiredAt: string;
  isEquipped: boolean;
}

// ---------- Season / Battle Pass ----------
export interface SeasonPass {
  id: string;
  name: string;
  seasonNumber: number;
  startsAt: string;
  endsAt: string;
  currentTier: number;
  maxTier: number;
  isPremium: boolean;
  tracks: SeasonTrack[];
}

export interface SeasonTrack {
  tier: number;
  freeReward?: SeasonReward;
  premiumReward?: SeasonReward;
  isUnlocked: boolean;
}

export interface SeasonReward {
  type: "coins" | "gems" | "xp" | "shards" | "pass_xp" | "item" | "title";
  amount?: number;
  itemId?: string;
  label: string;
}

export interface QuestReward {
  coins?: number;
  gems?: number;
  shards?: number;
  passXp?: number;
  itemId?: string;
}

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  track: "daily" | "weekly" | "seasonal";
  target: number;
  progress: number;
  reward: QuestReward;
  isCompleted: boolean;
}

// ---------- VIP ----------
export interface VipMembership {
  isActive: boolean;
  expiresAt?: string;
  perks: string[];
  priceUsd: number;
}

export type SupportTicketCategory = "bug" | "complaint" | "support" | "feedback";

export type SupportTicketStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

// ---------- Clan ----------
export interface Clan {
  id: string;
  name: string;
  tag: string;
  memberCount: number;
  maxMembers: number;
  trophies: number;
  rank: number;
  leaderId: string;
  members: ClanMember[];
}

export interface ClanMember {
  userId: string;
  username: string;
  role: "leader" | "officer" | "member";
  trophiesContributed: number;
  joinedAt: string;
}

// ---------- Tournament ----------
export interface Tournament {
  id: string;
  name: string;
  puzzleType: PuzzleType;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  currentPlayers: number;
  startsAt: string;
  status: "upcoming" | "live" | "completed";
}

// ---------- Leaderboard ----------
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarId?: StockAvatarId;
  avatarUrl?: string;
  elo: number;
  rankTier: RankTier;
  wins: number;
}

// ---------- Daily / Challenges ----------
export interface DailyChallenge {
  id: string;
  date: string;
  puzzleConfig: PuzzleConfig;
  title: string;
  description: string;
  reward: MatchReward;
  completedBy: number;
  isCompleted: boolean;
}

// ---------- Notifications ----------
export interface GameNotification {
  id: string;
  type: "match_invite" | "clan_invite" | "friend_request" | "reward" | "season" | "challenge";
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface ProfileActivityEvent {
  id: string;
  type: "match" | "purchase" | "social";
  label: string;
  title: string;
  description: string;
  occurredAt: string;
  isRead: boolean;
}

// ---------- Puzzle Royale ----------
export interface RoyaleRound {
  roundNumber: number;
  puzzleConfig: PuzzleConfig;
  playersRemaining: number;
  eliminatedCount: number;
  timeLimit: number;
}

export interface RoyaleMatch {
  id: string;
  totalPlayers: number;
  currentRound: number;
  rounds: RoyaleRound[];
  status: "waiting" | "in_progress" | "completed";
  winnerId?: string;
}


