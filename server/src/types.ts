export type MatchMode = "ranked" | "head_to_head" | "casual" | "royale" | "revenge" | "challenge" | "daily";

export type RankTier = "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master";

export type MatchPlayablePuzzleType =
  | "rotate_pipes"
  | "number_grid"
  | "pattern_match"
  | "word_scramble"
  | "tile_slide"
  | "sudoku_mini"
  | "maze"
  | "memory_grid"
  | "riddle_choice"
  | "wordle_guess"
  | "chess_tactic"
  | "checkers_tactic";

export interface PuzzleCatalogEntry {
  type: MatchPlayablePuzzleType;
  label: string;
  icon: string;
  description: string;
}

export interface AuthoritativePuzzleSelection {
  puzzleType: MatchPlayablePuzzleType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  practiceSeed: number;
  liveSeed: number;
  selectedAt: string;
  meta: PuzzleCatalogEntry;
}

export interface UserProfileRecord {
  id: string;
  username: string;
  elo: number;
  rank: RankTier;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  gems: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestStreak: number;
  matchesPlayed: number;
  joinedAt: string;
  isVip: boolean;
  isBot: boolean;
  socialLinks: {
    facebook?: string;
    tiktok?: string;
  };
  puzzleSkills: Record<string, number>;
  nemeses: string[];
  friends: string[];
}

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface LobbyReward {
  xp: number;
  coins: number;
  elo: number;
}

export interface LobbyPlayer {
  playerId: string;
  username: string;
  elo: number;
  rank: RankTier;
  isBot: boolean;
  ready: boolean;
  nextRoundVote: "continue" | "exit" | null;
  joinedAt: string;
  progress: number;
  practiceProgress: number;
  solvedAtMs: number | null;
  pace: number;
  reward?: LobbyReward;
}

export interface LobbyResultEntry {
  playerId: string;
  username: string;
  progress: number;
  solvedAtMs: number | null;
  rank: number;
  reward: LobbyReward;
  isBot: boolean;
}

export interface LobbyResults {
  completedAt: string;
  standings: LobbyResultEntry[];
}

export interface LobbyRecord {
  id: string;
  mode: MatchMode;
  status: "filling" | "ready" | "practice" | "live" | "intermission" | "complete";
  maxPlayers: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  players: LobbyPlayer[];
  selection: AuthoritativePuzzleSelection | null;
  practiceStartsAt: string | null;
  practiceEndsAt: string | null;
  liveStartsAt: string | null;
  liveEndsAt: string | null;
  intermissionStartsAt: string | null;
  intermissionEndsAt: string | null;
  results: LobbyResults | null;
}

export interface AuthenticatedLobbyRecord extends LobbyRecord {
  selfPlayerId: string;
}

export interface CreatePayPalOrderInput {
  currencyCode: string;
  items: Array<{
    name: string;
    quantity: number;
    unitAmount: number;
    description?: string;
    sku?: string;
  }>;
  referenceId?: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface RotatePipesSubmission {
  kind: "rotate_pipes";
  rotations: number[];
}

export interface NumberGridSubmission {
  kind: "number_grid";
  values: Array<number | null>;
}

export interface PatternMatchSubmission {
  kind: "pattern_match";
  answers: number[];
}

export interface WordScrambleSubmission {
  kind: "word_scramble";
  selectedIndices: number[];
}

export interface TileSlideSubmission {
  kind: "tile_slide";
  tiles: number[];
}

export interface SudokuMiniSubmission {
  kind: "sudoku_mini";
  values: Array<number | null>;
}

export interface MazeSubmission {
  kind: "maze";
  position: number;
}

export interface MemoryGridSubmission {
  kind: "memory_grid";
  selectedIndices: number[];
}

export interface RiddleChoiceSubmission {
  kind: "riddle_choice";
  answers: number[];
}

export interface WordleGuessSubmission {
  kind: "wordle_guess";
  guesses: string[];
}

export interface ChessTacticSubmission {
  kind: "chess_tactic";
  answers: number[];
}

export interface CheckersTacticSubmission {
  kind: "checkers_tactic";
  answers: number[];
}

export type PuzzleSubmission =
  | RotatePipesSubmission
  | NumberGridSubmission
  | PatternMatchSubmission
  | WordScrambleSubmission
  | TileSlideSubmission
  | SudokuMiniSubmission
  | MazeSubmission
  | MemoryGridSubmission
  | RiddleChoiceSubmission
  | WordleGuessSubmission
  | ChessTacticSubmission
  | CheckersTacticSubmission;
