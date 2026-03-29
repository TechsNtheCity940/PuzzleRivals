import type { TileTextureKey } from "@/game/utils/constants";

export type NeonRivalsGameStatus = "booting" | "running" | "complete" | "failed";

export type NeonRivalsRunMode = "score_attack" | "combo_rush" | "color_hunt" | "clear_rush";

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

export interface NeonRivalsGameState {
  status: NeonRivalsGameStatus;
  mode: NeonRivalsRunMode;
  score: number;
  combo: number;
  maxCombo: number;
  movesLeft: number;
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
  onComplete?: (state: NeonRivalsGameState) => void;
  onFailed?: (state: NeonRivalsGameState) => void;
}
