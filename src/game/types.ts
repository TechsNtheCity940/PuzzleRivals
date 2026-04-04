import type { TileTextureKey } from "@/game/utils/constants";
import type { MatchPlayablePuzzleType, PuzzleSubmission } from "@/lib/backend";

export type NeonRivalsGameStatus = "booting" | "running" | "complete" | "failed";

export type NeonRivalsBoardFamily =
  | "match3"
  | "maze"
  | "pipe"
  | "link"
  | "mirror"
  | "tile"
  | "number"
  | "spatial"
  | "strategy"
  | "quiz"
  | "memory"
  | "glyph";

export type NeonRivalsRunMode =
  | "score_attack"
  | "combo_rush"
  | "color_hunt"
  | "clear_rush"
  | "maze_rush"
  | "pipe_rush"
  | "circuit_clash"
  | "link_lock"
  | "mirror_maze"
  | "tile_shift"
  | "number_crunch"
  | "spatial_spin"
  | "chess_shot"
  | "checkers_trap"
  | "chess_endgame"
  | "chess_opening"
  | "chess_mate_net"
  | "riddle_relay"
  | "trivia_blitz"
  | "geography_dash"
  | "science_spark"
  | "analogy_arc"
  | "vocabulary_duel"
  | "memory_flash"
  | "glyph_rush";

export interface ArenaRotationHistoryEntry {
  mode: NeonRivalsRunMode;
  boardFamily: NeonRivalsBoardFamily;
  seed: number;
  playedAt: number;
}

export interface NeonRivalsRewardSummary {
  xp: number;
  coins: number;
  gems: number;
  passXp: number;
  shards: number;
  itemIds: string[];
}

export interface NeonRivalsRunSyncResult {
  ok: true;
  alreadySubmitted: boolean;
  runId: string;
  reward: NeonRivalsRewardSummary;
  questReward: NeonRivalsRewardSummary;
  totalReward: NeonRivalsRewardSummary;
}

export interface NeonRivalsRunSubmission {
  sessionSeed: number;
  mode: NeonRivalsRunMode;
  status: Extract<NeonRivalsGameStatus, "complete" | "failed">;
  score: number;
  combo: number;
  maxCombo: number;
  matchedTiles: number;
  movesLeft: number;
  targetScore: number;
  objectiveTitle: string;
  objectiveLabel: string;
  objectiveValue: number;
  objectiveTarget: number;
  targetColor?: TileTextureKey;
  targetColorLabel?: string;
  durationMs: number;
}

export interface NeonRivalsMatchContext {
  puzzleType: MatchPlayablePuzzleType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  stage: "practice" | "live";
}

export interface NeonRivalsGameState {
  status: NeonRivalsGameStatus;
  mode: NeonRivalsRunMode;
  boardFamily: NeonRivalsBoardFamily;
  score: number;
  combo: number;
  maxCombo: number;
  movesLeft: number;
  resourceLabel: string;
  targetScore: number;
  matchedTiles: number;
  objectiveTitle: string;
  objectiveLabel: string;
  objectiveDescription: string;
  objectiveValue: number;
  objectiveTarget: number;
  objectiveProgressPercent: number;
  targetColor?: TileTextureKey;
  targetColorLabel?: string;
  clearedByColor: Partial<Record<TileTextureKey, number>>;
  durationMs: number;
  seed: number;
}

export interface NeonRivalsGameBridge {
  onReady?: () => void;
  onStateChange?: (state: NeonRivalsGameState) => void;
  onSubmissionChange?: (
    submission: PuzzleSubmission,
    state: NeonRivalsGameState,
  ) => void;
  onComplete?: (state: NeonRivalsGameState) => void;
  onFailed?: (state: NeonRivalsGameState) => void;
}

