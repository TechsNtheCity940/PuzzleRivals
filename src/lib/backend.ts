import type { UserProfile } from "@/lib/types";

export type MatchMode = "ranked" | "casual" | "royale" | "revenge" | "challenge" | "daily";

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

export interface PuzzleCatalogEntry {
  type: MatchPlayablePuzzleType;
  label: string;
  icon: string;
  description: string;
}

export interface BackendPuzzleSelection {
  puzzleType: MatchPlayablePuzzleType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  practiceSeed: number;
  liveSeed: number;
  selectedAt: string;
  meta: PuzzleCatalogEntry;
}

export interface BackendLobbyReward {
  xp: number;
  coins: number;
  elo: number;
}

export interface BackendLobbyPlayer {
  playerId: string;
  username: string;
  elo: number;
  rank: UserProfile["rank"];
  avatarId?: UserProfile["avatarId"];
  frameId?: string | null;
  playerCardId?: string | null;
  bannerId?: string | null;
  emblemId?: string | null;
  titleId?: string | null;
  playerCardName?: string | null;
  bannerName?: string | null;
  emblemName?: string | null;
  titleName?: string | null;
  isBot: boolean;
  ready: boolean;
  nextRoundVote: "continue" | "exit" | null;
  joinedAt: string;
  progress: number;
  practiceProgress: number;
  solvedAtMs: number | null;
  completions: number;
  score: number;
  currentSeed: number;
  pace: number;
  reward?: BackendLobbyReward;
}

export interface BackendLobbyResults {
  completedAt: string;
  rapidFire: boolean;
  standings: Array<{
    playerId: string;
    username: string;
    progress: number;
    solvedAtMs: number | null;
    rank: number;
    completions: number;
    score: number;
    reward: BackendLobbyReward;
    isBot: boolean;
  }>;
}

export interface BackendLobby {
  id: string;
  mode: MatchMode;
  status: "filling" | "ready" | "practice" | "live" | "intermission" | "complete";
  maxPlayers: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  players: BackendLobbyPlayer[];
  selection: BackendPuzzleSelection | null;
  practiceStartsAt: string | null;
  practiceEndsAt: string | null;
  liveStartsAt: string | null;
  liveEndsAt: string | null;
  intermissionStartsAt: string | null;
  intermissionEndsAt: string | null;
  results: BackendLobbyResults | null;
}

export type RotatePipesSubmission = {
  kind: "rotate_pipes";
  rotations: number[];
};

export type NumberGridSubmission = {
  kind: "number_grid";
  values: Array<number | null>;
};

export type PatternMatchSubmission = {
  kind: "pattern_match";
  answers: number[];
};

export type WordScrambleSubmission = {
  kind: "word_scramble";
  selectedIndices: number[];
};

export type TileSlideSubmission = {
  kind: "tile_slide";
  tiles: number[];
};

export type SudokuMiniSubmission = {
  kind: "sudoku_mini";
  values: Array<number | null>;
};

export type MazeSubmission = {
  kind: "maze";
  position: number;
};

export type MemoryGridSubmission = {
  kind: "memory_grid";
  selectedIndices: number[];
};

export type RiddleChoiceSubmission = {
  kind: "riddle_choice";
  answers: number[];
};

export type WordleGuessSubmission = {
  kind: "wordle_guess";
  guesses: string[];
};

export type ChessTacticSubmission = {
  kind: "chess_tactic";
  answers: number[];
};

export type CheckersTacticSubmission = {
  kind: "checkers_tactic";
  answers: number[];
};

export type LogicSequenceSubmission = {
  kind: "logic_sequence";
  answers: number[];
};

export type TriviaBlitzSubmission = {
  kind: "trivia_blitz";
  answers: number[];
};

export type GeographyQuizSubmission = {
  kind: "geography_quiz";
  answers: number[];
};

export type ScienceQuizSubmission = {
  kind: "science_quiz";
  answers: number[];
};

export type MathRaceSubmission = {
  kind: "math_race";
  answers: number[];
};

export type CodeBreakerSubmission = {
  kind: "code_breaker";
  answers: number[];
};

export type AnalogiesSubmission = {
  kind: "analogies";
  answers: number[];
};

export type DeductionGridSubmission = {
  kind: "deduction_grid";
  answers: number[];
};

export type ChessEndgameSubmission = {
  kind: "chess_endgame";
  answers: number[];
};

export type ChessOpeningSubmission = {
  kind: "chess_opening";
  answers: number[];
};

export type ChessMateNetSubmission = {
  kind: "chess_mate_net";
  answers: number[];
};

export type VocabularyDuelSubmission = {
  kind: "vocabulary_duel";
  answers: number[];
};

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
  | CheckersTacticSubmission
  | LogicSequenceSubmission
  | TriviaBlitzSubmission
  | GeographyQuizSubmission
  | ScienceQuizSubmission
  | MathRaceSubmission
  | CodeBreakerSubmission
  | AnalogiesSubmission
  | DeductionGridSubmission
  | ChessEndgameSubmission
  | ChessOpeningSubmission
  | ChessMateNetSubmission
  | VocabularyDuelSubmission;
