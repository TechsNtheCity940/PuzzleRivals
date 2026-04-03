import type {
  ArenaRotationHistoryEntry,
  NeonRivalsBoardFamily,
  NeonRivalsGameState,
  NeonRivalsRunMode,
} from "@/game/types";

export type HeadToHeadPresetId = "quick_match" | "ranked" | "extended";
export type HeadToHeadCombatantId = "player" | "opponent";
export type HeadToHeadMomentumTier = "low" | "medium" | "high";
export type HeadToHeadAttackId =
  | "reverse_input"
  | "fog_tiles"
  | "mini_scramble"
  | "freeze_pulse";
export type HeadToHeadDefenseId =
  | "cleanse"
  | "shield"
  | "focus_mode"
  | "anchor";
export type HeadToHeadAbilityId = HeadToHeadAttackId | HeadToHeadDefenseId;
export type HeadToHeadEffectKind = "attack" | "defense";
export type HeadToHeadRuntimeStatus = "countdown" | "live" | "finished";

export interface HeadToHeadPresetConfig {
  id: HeadToHeadPresetId;
  label: string;
  targetScore: number;
  description: string;
}

export interface HeadToHeadModeDefinition {
  mode: NeonRivalsRunMode;
  boardFamily: NeonRivalsBoardFamily;
  label: string;
  description: string;
  baseDifficulty: 1 | 2 | 3 | 4 | 5;
  fastSolveThresholdMs: number;
}

export interface HeadToHeadStatusEffect {
  id: string;
  abilityId: HeadToHeadAbilityId;
  kind: HeadToHeadEffectKind;
  label: string;
  target: HeadToHeadCombatantId;
  startedAtMs: number;
  endsAtMs: number;
  severity: number;
}

export interface HeadToHeadFogPatch {
  top: number;
  left: number;
  width: number;
  height: number;
  rotationDeg: number;
}

export interface HeadToHeadBoardModifiers {
  reversed: boolean;
  frozen: boolean;
  fogPatches: HeadToHeadFogPatch[];
  scrambleVersion: number;
  activeStatuses: HeadToHeadStatusEffect[];
}

export interface HeadToHeadCombatantState {
  id: HeadToHeadCombatantId;
  displayName: string;
  score: number;
  comboStreak: number;
  comboTotal: number;
  momentum: number;
  momentumTier: HeadToHeadMomentumTier;
  attackCharge: number;
  defenseCharge: number;
  nextAttack: HeadToHeadAttackId;
  nextDefense: HeadToHeadDefenseId;
  roundsSolved: number;
  mistakes: number;
  lastSolveMs: number | null;
  targetReachedAtMs: number | null;
  activeStatuses: HeadToHeadStatusEffect[];
}

export interface HeadToHeadRoundState {
  mode: NeonRivalsRunMode;
  boardFamily: NeonRivalsBoardFamily;
  label: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  roundIndex: number;
  sessionSeed: number;
  roundKey: string;
}

export interface HeadToHeadBattleLogEntry {
  id: string;
  tone: "info" | "warning" | "attack" | "defense" | "score";
  text: string;
  atMs: number;
}

export interface HeadToHeadSnapshot {
  status: HeadToHeadRuntimeStatus;
  preset: HeadToHeadPresetConfig;
  mode: HeadToHeadModeDefinition;
  targetScore: number;
  countdownMs: number;
  elapsedMs: number;
  player: HeadToHeadCombatantState;
  opponent: HeadToHeadCombatantState;
  playerBoard: HeadToHeadRoundState;
  playerBoardModifiers: HeadToHeadBoardModifiers;
  recentLog: HeadToHeadBattleLogEntry[];
  incomingAttackLabel: string | null;
  winnerId: HeadToHeadCombatantId | null;
  finishedReason: string | null;
}

export interface HeadToHeadAudioHooks {
  attack: string;
  defense: string;
  warning: string;
  scoreMilestone: string;
  momentum: string;
  victory: string;
  defeat: string;
}

export interface HeadToHeadSolveSample {
  durationMs: number;
  comboValue: number;
  matchedTiles: number;
  movesLeft: number;
  flawless: boolean;
  sourceState?: NeonRivalsGameState;
}

export interface HeadToHeadControllerOptions {
  presetId: HeadToHeadPresetId;
  playerName: string;
  opponentName?: string;
  seedHint: number;
  history: ArenaRotationHistoryEntry[];
  currentMode?: NeonRivalsRunMode | null;
  onSnapshot?: (snapshot: HeadToHeadSnapshot) => void;
  onAudioCue?: (cue: keyof HeadToHeadAudioHooks) => void;
}
