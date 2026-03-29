import type { NeonRivalsBoardFamily, NeonRivalsGameState, NeonRivalsRunMode } from "@/game/types";
import { BOARD_ASSET_ROOT, TILE_TYPES, type TileTextureKey } from "@/game/utils/constants";

export interface NeonRivalsRunModeOption {
  id: NeonRivalsRunMode;
  boardFamily: NeonRivalsBoardFamily;
  label: string;
  kicker: string;
  description: string;
}

export interface NeonRivalsObjectiveConfig {
  mode: NeonRivalsRunMode;
  boardFamily: NeonRivalsBoardFamily;
  title: string;
  label: string;
  description: string;
  targetValue: number;
  targetScore: number;
  startingMoves: number;
  resourceLabel: string;
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
    boardFamily: "match3",
    label: "Score Attack",
    kicker: "Classic clear lane",
    description: "Build clean cascades and hit the score benchmark before the board runs dry.",
  },
  {
    id: "combo_rush",
    boardFamily: "match3",
    label: "Combo Rush",
    kicker: "Chain-reaction lane",
    description: "Spike a huge peak combo and keep the board alive long enough to trigger it.",
  },
  {
    id: "color_hunt",
    boardFamily: "match3",
    label: "Color Hunt",
    kicker: "Target-burn lane",
    description: "Lock onto a live neon color and burn down that tile count before the last move.",
  },
  {
    id: "clear_rush",
    boardFamily: "match3",
    label: "Clear Rush",
    kicker: "Pressure lane",
    description: "Clear a full volume of tiles under a tighter move budget to finish the run.",
  },
  {
    id: "maze_rush",
    boardFamily: "maze",
    label: "Maze Rush",
    kicker: "Route-trace lane",
    description: "Push the neon runner through a live maze, stay on legal turns, and hit the exit node before the route budget collapses.",
  },
  {
    id: "pipe_rush",
    boardFamily: "pipe",
    label: "Pipe Pulse",
    kicker: "Conduit lane",
    description: "Rotate the conduit grid until the source floods the network and the full neon circuit lights up.",
  },
  {
    id: "tile_shift",
    boardFamily: "tile",
    label: "Tile Shift",
    kicker: "Sliding lane",
    description: "Slide numbered tiles back into order and lock the solved board before the move budget expires.",
  },
  {
    id: "number_crunch",
    boardFamily: "number",
    label: "Number Crunch",
    kicker: "Logic-grid lane",
    description: "Fill the live number grid, satisfy every row and column rail, and lock the board before the move budget collapses.",
  },
  {
    id: "spatial_spin",
    boardFamily: "spatial",
    label: "Spatial Spin",
    kicker: "Transform lane",
    description: "Read the rotation or mirror rule, then snap the right silhouette before the next shape drops in.",
  },
  {
    id: "chess_shot",
    boardFamily: "strategy",
    label: "Chess Shot",
    kicker: "Tactics lane",
    description: "Read the tactical prompt, then fire the winning move by tapping the live board target.",
  },
  {
    id: "checkers_trap",
    boardFamily: "strategy",
    label: "Checkers Trap",
    kicker: "Capture lane",
    description: "Spot the strongest jump lane and trigger the best continuation straight from the animated board.",
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
      boardFamily: "match3",
      title: "Combo Rush",
      label: "Hit a peak combo of x4 before the board runs out of moves.",
      description: "Chain reactions matter more than raw score here. Build one explosive turn instead of steady singles.",
      targetValue: 4,
      targetScore: 1800,
      startingMoves: 16,
      resourceLabel: "moves",
    };
  }

  if (mode === "color_hunt") {
    const targetColor = TILE_TYPES[seededIndex(seed, TILE_TYPES.length)] as TileTextureKey;
    return {
      mode,
      boardFamily: "match3",
      title: `${COLOR_LABELS[targetColor]} Hunt`,
      label: `Clear 24 ${COLOR_LABELS[targetColor].toLowerCase()} tiles before the move limit collapses.`,
      description: "Read the board for the active neon color and redirect every swap toward that target lane.",
      targetValue: 24,
      targetScore: 1650,
      startingMoves: 17,
      resourceLabel: "moves",
      targetColor,
      targetColorLabel: COLOR_LABELS[targetColor],
    };
  }

  if (mode === "clear_rush") {
    return {
      mode,
      boardFamily: "match3",
      title: "Clear Rush",
      label: "Clear 42 total tiles before the last move expires.",
      description: "Fast clears beat perfect setup here. Keep the board moving and stay ahead of the move clock.",
      targetValue: 42,
      targetScore: 2000,
      startingMoves: 14,
      resourceLabel: "moves",
    };
  }

  if (mode === "maze_rush") {
    return {
      mode,
      boardFamily: "maze",
      title: "Maze Rush",
      label: "Reach the exit core before the route step budget burns out.",
      description: "Trace legal turns only. Start and goal nodes pulse live, dead turns spark red, and clean routing finishes the run instantly.",
      targetValue: 100,
      targetScore: 1800,
      startingMoves: 22,
      resourceLabel: "steps",
    };
  }

  if (mode === "pipe_rush") {
    return {
      mode,
      boardFamily: "pipe",
      title: "Pipe Pulse",
      label: "Flood the full conduit grid before the move budget collapses.",
      description: "Rotate neon conduit tiles, push the source flow deeper every turn, and light the whole network cleanly.",
      targetValue: 100,
      targetScore: 1750,
      startingMoves: 20,
      resourceLabel: "moves",
    };
  }

  if (mode === "tile_shift") {
    return {
      mode,
      boardFamily: "tile",
      title: "Tile Shift",
      label: "Slide the board back into order before the last move expires.",
      description: "Use the blank slot efficiently, lock rows cleanly, and finish the solved board under pressure.",
      targetValue: 100,
      targetScore: 1700,
      startingMoves: 28,
      resourceLabel: "moves",
    };
  }

  if (mode === "number_crunch") {
    return {
      mode,
      boardFamily: "number",
      title: "Number Crunch",
      label: "Seal every blank so the row and column sum rails lock cleanly.",
      description: "Pick an empty cell, fire a digit into place, and watch solved rails light up as the board stabilizes.",
      targetValue: 100,
      targetScore: 1725,
      startingMoves: 18,
      resourceLabel: "moves",
    };
  }

  if (mode === "spatial_spin") {
    return {
      mode,
      boardFamily: "spatial",
      title: "Spatial Spin",
      label: "Read each transform and snap the correct silhouette before the round queue empties.",
      description: "Track anchor blocks mentally. One clean read should light the next board immediately.",
      targetValue: 100,
      targetScore: 1680,
      startingMoves: 12,
      resourceLabel: "moves",
    };
  }

  if (mode === "chess_shot") {
    return {
      mode,
      boardFamily: "strategy",
      title: "Chess Shot",
      label: "Read the tactic and tap the winning board target before the move budget folds.",
      description: "Checks, captures, and threats. The live board target is the answer surface now, not a side list.",
      targetValue: 100,
      targetScore: 1780,
      startingMoves: 10,
      resourceLabel: "moves",
    };
  }

  if (mode === "checkers_trap") {
    return {
      mode,
      boardFamily: "strategy",
      title: "Checkers Trap",
      label: "Read the jump lane and trigger the strongest continuation from the board itself.",
      description: "Track the capture route, pressure promotion lanes, and bank each solved board before the clock dries up.",
      targetValue: 100,
      targetScore: 1700,
      startingMoves: 10,
      resourceLabel: "moves",
    };
  }

  return {
    mode: "score_attack",
    boardFamily: "match3",
    title: "Score Attack",
    label: "Reach 2,400 score in 18 moves.",
    description: "The cleanest Neon Rivals lane. Build stable cascades and push raw score to the finish line.",
    targetValue: 2400,
    targetScore: 2400,
    startingMoves: 18,
    resourceLabel: "moves",
  };
}

export function getObjectiveValue(
  objective: NeonRivalsObjectiveConfig,
  state: Pick<NeonRivalsGameState, "score" | "maxCombo" | "matchedTiles" | "clearedByColor" | "objectiveValue">,
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

  if (objective.boardFamily !== "match3") {
    return state.objectiveValue;
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
    boardFamily: objective.boardFamily,
    score: 0,
    combo: 0,
    maxCombo: 0,
    movesLeft: objective.startingMoves,
    resourceLabel: objective.resourceLabel,
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

