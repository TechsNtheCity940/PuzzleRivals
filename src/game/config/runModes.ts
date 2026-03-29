import type { NeonRivalsGameState, NeonRivalsRunMode } from "@/game/types";
import { BOARD_ASSET_ROOT, TILE_TYPES, type TileTextureKey } from "@/game/utils/constants";

export interface NeonRivalsRunModeOption {
  id: NeonRivalsRunMode;
  label: string;
  kicker: string;
  description: string;
}

export interface NeonRivalsObjectiveConfig {
  mode: NeonRivalsRunMode;
  title: string;
  label: string;
  description: string;
  targetValue: number;
  targetScore: number;
  startingMoves: number;
  targetColor?: TileTextureKey;
  targetColorLabel?: string;
}

const COLOR_LABELS: Record<TileTextureKey, string> = {
  tile_red: "Crimson",
  tile_blue: "Cyan",
  tile_green: "Volt",
  tile_yellow: "Solar",
  tile_purple: "Violet",
};

export const NEON_RIVALS_RUN_MODE_OPTIONS: NeonRivalsRunModeOption[] = [
  {
    id: "score_attack",
    label: "Score Attack",
    kicker: "Classic clear lane",
    description: "Build clean cascades and hit the score benchmark before the board runs dry.",
  },
  {
    id: "combo_rush",
    label: "Combo Rush",
    kicker: "Chain-reaction lane",
    description: "Spike a huge peak combo and keep the board alive long enough to trigger it.",
  },
  {
    id: "color_hunt",
    label: "Color Hunt",
    kicker: "Target-burn lane",
    description: "Lock onto a live neon color and burn down that tile count before the last move.",
  },
  {
    id: "clear_rush",
    label: "Clear Rush",
    kicker: "Pressure lane",
    description: "Clear a full volume of tiles under a tighter move budget to finish the run.",
  },
];

export const NEON_RIVALS_ASSET_MANIFEST = [
  `${BOARD_ASSET_ROOT}/board/board_bg_far.png`,
  `${BOARD_ASSET_ROOT}/board/board_bg_mid.png`,
  `${BOARD_ASSET_ROOT}/board/board_frame_base.png`,
  `${BOARD_ASSET_ROOT}/board/board_frame_glow.png`,
  `${BOARD_ASSET_ROOT}/board/board_grid_base.png`,
  `${BOARD_ASSET_ROOT}/fx/combo_burst.png`,
  `${BOARD_ASSET_ROOT}/fx/impact_ring.png`,
  `${BOARD_ASSET_ROOT}/fx/particles_soft.png`,
  ...TILE_TYPES.map((tileType) => `${BOARD_ASSET_ROOT}/tiles/${tileType}.png`),
] as const;

function seededIndex(seed: number, mod: number) {
  const normalized = Math.abs(Math.imul(seed | 0, 2654435761)) >>> 0;
  return normalized % mod;
}

export function buildNeonRivalsObjective(mode: NeonRivalsRunMode, seed: number): NeonRivalsObjectiveConfig {
  if (mode === "combo_rush") {
    return {
      mode,
      title: "Combo Rush",
      label: "Hit a peak combo of x4 before the board runs out of moves.",
      description: "Chain reactions matter more than raw score here. Build one explosive turn instead of steady singles.",
      targetValue: 4,
      targetScore: 1800,
      startingMoves: 16,
    };
  }

  if (mode === "color_hunt") {
    const targetColor = TILE_TYPES[seededIndex(seed, TILE_TYPES.length)] as TileTextureKey;
    return {
      mode,
      title: `${COLOR_LABELS[targetColor]} Hunt`,
      label: `Clear 24 ${COLOR_LABELS[targetColor].toLowerCase()} tiles before the move limit collapses.`,
      description: "Read the board for the active neon color and redirect every swap toward that target lane.",
      targetValue: 24,
      targetScore: 1650,
      startingMoves: 17,
      targetColor,
      targetColorLabel: COLOR_LABELS[targetColor],
    };
  }

  if (mode === "clear_rush") {
    return {
      mode,
      title: "Clear Rush",
      label: "Clear 42 total tiles before the last move expires.",
      description: "Fast clears beat perfect setup here. Keep the board moving and stay ahead of the move clock.",
      targetValue: 42,
      targetScore: 2000,
      startingMoves: 14,
    };
  }

  return {
    mode: "score_attack",
    title: "Score Attack",
    label: "Reach 2,400 score in 18 moves.",
    description: "The cleanest Neon Rivals lane. Build stable cascades and push raw score to the finish line.",
    targetValue: 2400,
    targetScore: 2400,
    startingMoves: 18,
  };
}

export function getObjectiveValue(
  objective: NeonRivalsObjectiveConfig,
  state: Pick<NeonRivalsGameState, "score" | "maxCombo" | "matchedTiles" | "clearedByColor">,
) {
  if (objective.mode === "combo_rush") {
    return state.maxCombo;
  }

  if (objective.mode === "color_hunt") {
    return objective.targetColor ? Number(state.clearedByColor[objective.targetColor] ?? 0) : 0;
  }

  if (objective.mode === "clear_rush") {
    return state.matchedTiles;
  }

  return state.score;
}

export function getObjectiveProgressPercent(currentValue: number, targetValue: number) {
  if (targetValue <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((currentValue / targetValue) * 100)));
}

function emptyColorProgress() {
  return TILE_TYPES.reduce((accumulator, tileType) => {
    accumulator[tileType] = 0;
    return accumulator;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

export function createInitialGameState(mode: NeonRivalsRunMode, seed: number): NeonRivalsGameState {
  const objective = buildNeonRivalsObjective(mode, seed);

  return {
    status: "booting",
    mode: objective.mode,
    score: 0,
    combo: 0,
    maxCombo: 0,
    movesLeft: objective.startingMoves,
    targetScore: objective.targetScore,
    matchedTiles: 0,
    objectiveTitle: objective.title,
    objectiveLabel: objective.label,
    objectiveDescription: objective.description,
    objectiveValue: 0,
    objectiveTarget: objective.targetValue,
    objectiveProgressPercent: 0,
    targetColor: objective.targetColor,
    targetColorLabel: objective.targetColorLabel,
    clearedByColor: emptyColorProgress(),
    durationMs: 0,
    seed,
  };
}
