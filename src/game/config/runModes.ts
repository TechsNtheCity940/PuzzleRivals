import type {
  NeonRivalsBoardFamily,
  NeonRivalsGameState,
  NeonRivalsRunMode,
} from "@/game/types";
import {
  BOARD_ASSET_ROOT,
  TILE_TYPES,
  type TileTextureKey,
} from "@/game/utils/constants";

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

type ObjectivePreset = Omit<NeonRivalsObjectiveConfig, "mode" | "targetColor" | "targetColorLabel">;

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
    id: "riddle_relay",
    boardFamily: "quiz",
    label: "Riddle Relay",
    kicker: "Prompt lane",
    description: "Read the clue, pressure the answer panels, and keep the relay alive across the whole quiz board.",
  },
  {
    id: "trivia_blitz",
    boardFamily: "quiz",
    label: "Trivia Blitz",
    kicker: "Fact lane",
    description: "Burn through fast fact boards and bank clean answer streaks before the timer feel collapses.",
  },
  {
    id: "geography_dash",
    boardFamily: "quiz",
    label: "Geography Dash",
    kicker: "Map lane",
    description: "Read capitals, landmarks, and countries from the animated board and fire the correct panel fast.",
  },
  {
    id: "science_spark",
    boardFamily: "quiz",
    label: "Science Spark",
    kicker: "Lab lane",
    description: "Work through live science prompts, symbol recalls, and system clues under a tighter solve pace.",
  },
  {
    id: "analogy_arc",
    boardFamily: "quiz",
    label: "Analogy Arc",
    kicker: "Reasoning lane",
    description: "Track the relation pattern and snap the cleanest parallel before the panel arc resets.",
  },
  {
    id: "vocabulary_duel",
    boardFamily: "quiz",
    label: "Vocabulary Duel",
    kicker: "Word lane",
    description: "Read word meaning and synonym pressure boards, then lock the strongest answer route quickly.",
  },
  {
    id: "memory_flash",
    boardFamily: "memory",
    label: "Memory Flash",
    kicker: "Recall lane",
    description: "Watch the live memory pulse, hold the sequence, and tap the glowing cells back into place.",
  },
];

const OBJECTIVE_PRESETS: Record<Exclude<NeonRivalsRunMode, "color_hunt" | "combo_rush">, ObjectivePreset> = {
  score_attack: {
    boardFamily: "match3",
    title: "Score Attack",
    label: "Reach 2,400 score in 18 moves.",
    description: "The cleanest Neon Rivals lane. Build stable cascades and push raw score to the finish line.",
    targetValue: 2400,
    targetScore: 2400,
    startingMoves: 18,
    resourceLabel: "moves",
  },
  clear_rush: {
    boardFamily: "match3",
    title: "Clear Rush",
    label: "Clear 42 total tiles before the last move expires.",
    description: "Fast clears beat perfect setup here. Keep the board moving and stay ahead of the move clock.",
    targetValue: 42,
    targetScore: 2000,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  maze_rush: {
    boardFamily: "maze",
    title: "Maze Rush",
    label: "Reach the exit core before the route step budget burns out.",
    description: "Trace legal turns only. Start and goal nodes pulse live, dead turns spark red, and clean routing finishes the run instantly.",
    targetValue: 100,
    targetScore: 1800,
    startingMoves: 22,
    resourceLabel: "steps",
  },
  pipe_rush: {
    boardFamily: "pipe",
    title: "Pipe Pulse",
    label: "Flood the full conduit grid before the move budget collapses.",
    description: "Rotate neon conduit tiles, push the source flow deeper every turn, and light the whole network cleanly.",
    targetValue: 100,
    targetScore: 1750,
    startingMoves: 20,
    resourceLabel: "moves",
  },
  tile_shift: {
    boardFamily: "tile",
    title: "Tile Shift",
    label: "Slide the board back into order before the last move expires.",
    description: "Use the blank slot efficiently, lock rows cleanly, and finish the solved board under pressure.",
    targetValue: 100,
    targetScore: 1700,
    startingMoves: 28,
    resourceLabel: "moves",
  },
  number_crunch: {
    boardFamily: "number",
    title: "Number Crunch",
    label: "Seal every blank so the row and column sum rails lock cleanly.",
    description: "Pick an empty cell, fire a digit into place, and watch solved rails light up as the board stabilizes.",
    targetValue: 100,
    targetScore: 1725,
    startingMoves: 18,
    resourceLabel: "moves",
  },
  spatial_spin: {
    boardFamily: "spatial",
    title: "Spatial Spin",
    label: "Read each transform and snap the correct silhouette before the round queue empties.",
    description: "Track anchor blocks mentally. One clean read should light the next board immediately.",
    targetValue: 100,
    targetScore: 1680,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  riddle_relay: {
    boardFamily: "quiz",
    title: "Riddle Relay",
    label: "Solve every relay clue before the answer lanes dry up.",
    description: "Read the prompt, pulse the right answer lane, and keep the board streak alive across the whole relay.",
    targetValue: 100,
    targetScore: 1660,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  trivia_blitz: {
    boardFamily: "quiz",
    title: "Trivia Blitz",
    label: "Burn through every fact board and keep the answer streak intact.",
    description: "Facts arrive fast here. Clean streaks bank better rewards than late recoveries.",
    targetValue: 100,
    targetScore: 1690,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  geography_dash: {
    boardFamily: "quiz",
    title: "Geography Dash",
    label: "Lock the right capital or country lane before the next map prompt drops.",
    description: "Read the globe board fast. Capitals, countries, and landmarks share the same pressure clock.",
    targetValue: 100,
    targetScore: 1680,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  science_spark: {
    boardFamily: "quiz",
    title: "Science Spark",
    label: "Trigger clean lab reads and keep the solve chain lit across the board.",
    description: "Elements, systems, and core science facts cycle in under the same live answer pressure.",
    targetValue: 100,
    targetScore: 1700,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  analogy_arc: {
    boardFamily: "quiz",
    title: "Analogy Arc",
    label: "Read the relation and snap the matching parallel before the arc resets.",
    description: "Pattern reading beats guessing. One clean analogy keeps the chain moving.",
    targetValue: 100,
    targetScore: 1670,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  vocabulary_duel: {
    boardFamily: "quiz",
    title: "Vocabulary Duel",
    label: "Win the word lane by locking the best meaning or synonym panel every round.",
    description: "Read fast, but do not rush. Close distractors punish loose taps here.",
    targetValue: 100,
    targetScore: 1710,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  memory_flash: {
    boardFamily: "memory",
    title: "Memory Flash",
    label: "Repeat the live neon memory pattern before the attempt count collapses.",
    description: "Watch the pulse sequence, hold the full shape, and replay it without drifting into decoys.",
    targetValue: 100,
    targetScore: 1685,
    startingMoves: 12,
    resourceLabel: "attempts",
  },
  chess_shot: {
    boardFamily: "strategy",
    title: "Chess Shot",
    label: "Read the tactic and tap the winning board target before the move budget folds.",
    description: "Checks, captures, and threats. The live board target is the answer surface now, not a side list.",
    targetValue: 100,
    targetScore: 1780,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  checkers_trap: {
    boardFamily: "strategy",
    title: "Checkers Trap",
    label: "Read the jump lane and trigger the strongest continuation from the board itself.",
    description: "Track the capture route, pressure promotion lanes, and bank each solved board before the clock dries up.",
    targetValue: 100,
    targetScore: 1700,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  chess_endgame: {
    boardFamily: "strategy",
    title: "Chess Endgame",
    label: "Convert the ending by tapping the winning square before the move budget fades.",
    description: "Opposition, rook activity, and passed pawns. Endgame details decide the board here.",
    targetValue: 100,
    targetScore: 1760,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  chess_opening: {
    boardFamily: "strategy",
    title: "Chess Opening",
    label: "Find the strongest developing continuation from the live board before the route resets.",
    description: "Principles matter here: development, king safety, and center control over flashy nonsense.",
    targetValue: 100,
    targetScore: 1740,
    startingMoves: 14,
    resourceLabel: "moves",
  },
  chess_mate_net: {
    boardFamily: "strategy",
    title: "Mate Net",
    label: "Close the forcing net and tap the key mating square before the move budget expires.",
    description: "Remove escape squares, force checks, and finish the line cleanly while the board stays live.",
    targetValue: 100,
    targetScore: 1790,
    startingMoves: 14,
    resourceLabel: "moves",
  },
};

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

export function buildNeonRivalsObjective(
  mode: NeonRivalsRunMode,
  seed: number,
): NeonRivalsObjectiveConfig {
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
    const targetColor = TILE_TYPES[
      seededIndex(seed, TILE_TYPES.length)
    ] as TileTextureKey;
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

  const preset = OBJECTIVE_PRESETS[mode as keyof typeof OBJECTIVE_PRESETS] ?? OBJECTIVE_PRESETS.score_attack;
  return {
    mode,
    ...preset,
  };
}

export function getObjectiveValue(
  objective: NeonRivalsObjectiveConfig,
  state: Pick<
    NeonRivalsGameState,
    "score" | "maxCombo" | "matchedTiles" | "objectiveValue" | "clearedByColor"
  >,
) {
  if (objective.mode === "combo_rush") {
    return state.maxCombo;
  }

  if (objective.mode === "color_hunt") {
    return objective.targetColor
      ? Number(state.clearedByColor[objective.targetColor] ?? 0)
      : 0;
  }

  if (objective.mode === "clear_rush") {
    return state.matchedTiles;
  }

  if (objective.boardFamily !== "match3") {
    return state.objectiveValue;
  }

  return state.score;
}

export function getObjectiveProgressPercent(
  currentValue: number,
  targetValue: number,
) {
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

export function createInitialGameState(
  mode: NeonRivalsRunMode,
  seed: number,
): NeonRivalsGameState {
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
