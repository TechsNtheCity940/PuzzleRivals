import type { MatchPlayablePuzzleType } from "./puzzle.ts";

export interface PuzzleGeneratorPlayerProfile {
  userId: string;
  bestPuzzleType: MatchPlayablePuzzleType | null;
  worstPuzzleType: MatchPlayablePuzzleType | null;
  rivalUserId: string | null;
  averageProgressByType: Partial<Record<MatchPlayablePuzzleType, number>>;
  matchesPlayedByType: Partial<Record<MatchPlayablePuzzleType, number>>;
}

export interface PuzzleGeneratorContext {
  mode: string;
  averageElo: number;
  players: PuzzleGeneratorPlayerProfile[];
  lastLossByUserId?: Partial<Record<string, MatchPlayablePuzzleType>>;
}

export interface GeneratedPuzzleTemplate {
  strategy: "balanced" | "revenge" | "training" | "random";
  primaryType: MatchPlayablePuzzleType;
  weights: Record<MatchPlayablePuzzleType, number>;
  rationale: string[];
  parameters: {
    volatility: number;
    logicLoad: number;
    memoryLoad: number;
  };
}

const ALL_PUZZLE_TYPES: MatchPlayablePuzzleType[] = [
  "rotate_pipes",
  "number_grid",
  "pattern_match",
  "word_scramble",
  "crossword_mini",
  "tile_slide",
  "sudoku_mini",
  "word_search",
  "matching_pairs",
  "spatial_reasoning",
  "maze",
  "pathfinder",
  "memory_grid",
  "riddle_choice",
  "wordle_guess",
  "chess_tactic",
  "checkers_tactic",
  "logic_sequence",
  "trivia_blitz",
  "geography_quiz",
  "science_quiz",
  "math_race",
  "code_breaker",
  "analogies",
  "deduction_grid",
  "chess_endgame",
  "chess_opening",
  "chess_mate_net",
  "vocabulary_duel",
];

function createWeightMap(baseWeight = 1) {
  return Object.fromEntries(
    ALL_PUZZLE_TYPES.map((type) => [type, baseWeight]),
  ) as Record<MatchPlayablePuzzleType, number>;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function weightedPick(weights: Record<MatchPlayablePuzzleType, number>) {
  const entries = ALL_PUZZLE_TYPES.map((type) => [type, Math.max(0, weights[type] ?? 0)] as const);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);

  if (total <= 0) {
    return ALL_PUZZLE_TYPES[Math.floor(Math.random() * ALL_PUZZLE_TYPES.length)];
  }

  let cursor = Math.random() * total;
  for (const [type, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return type;
  }

  return entries[entries.length - 1][0];
}

function weakestTypes(profile: PuzzleGeneratorPlayerProfile) {
  return [...ALL_PUZZLE_TYPES]
    .map((type) => {
      const matches = profile.matchesPlayedByType[type] ?? 0;
      const progress = profile.averageProgressByType[type] ?? (matches > 0 ? 50 : 0);
      return { type, progress, matches };
    })
    .sort((left, right) => {
      if (left.progress !== right.progress) return left.progress - right.progress;
      return right.matches - left.matches;
    });
}

function buildBalancedWeights(context: PuzzleGeneratorContext) {
  const weights = createWeightMap(1);

  for (const type of ALL_PUZZLE_TYPES) {
    const lobbyMatches = context.players.reduce(
      (sum, player) => sum + (player.matchesPlayedByType[type] ?? 0),
      0,
    );
    const averageMatches = lobbyMatches / Math.max(context.players.length, 1);
    weights[type] += clamp(4 - averageMatches, 0, 3) * 0.65;
  }

  return weights;
}

function buildChallengeWeights(context: PuzzleGeneratorContext) {
  const weights = createWeightMap(0.35);
  const rationale: string[] = [];

  const targets = new Map<MatchPlayablePuzzleType, number>();
  for (const player of context.players) {
    const weakest = weakestTypes(player).slice(0, 3);
    weakest.forEach((entry, index) => {
      const bonus = [7, 4, 2][index] ?? 1;
      targets.set(entry.type, (targets.get(entry.type) ?? 0) + bonus);
    });
  }

  for (const [type, bonus] of targets.entries()) {
    weights[type] += bonus;
  }

  if (targets.size > 0) {
    rationale.push("challenge mode prioritizes recorded weak puzzle types");
  } else {
    rationale.push("challenge mode fell back to a broad training mix");
  }

  return { weights, rationale };
}

function buildRevengeWeights(context: PuzzleGeneratorContext) {
  const weights = createWeightMap(0.2);
  const rationale: string[] = [];

  for (const player of context.players) {
    const opponent =
      context.players.find((candidate) => candidate.userId === player.rivalUserId) ??
      context.players.find((candidate) => candidate.userId !== player.userId) ??
      null;

    if (player.worstPuzzleType) {
      weights[player.worstPuzzleType] += 5;
      rationale.push(`targets ${player.userId}'s weakest puzzle`);
    }

    if (opponent?.bestPuzzleType) {
      weights[opponent.bestPuzzleType] += 4;
      rationale.push(`leans into ${opponent.userId}'s strongest puzzle`);
    }

    const lastLossType = context.lastLossByUserId?.[player.userId];
    if (lastLossType) {
      weights[lastLossType] += 6;
      rationale.push(`repeats the last puzzle that beat ${player.userId}`);
    }
  }

  return { weights, rationale };
}

export function generatePuzzleTemplate(context: PuzzleGeneratorContext): GeneratedPuzzleTemplate {
  if (context.mode === "revenge") {
    const revenge = buildRevengeWeights(context);
    return {
      strategy: "revenge",
      primaryType: weightedPick(revenge.weights),
      weights: revenge.weights,
      rationale: revenge.rationale,
      parameters: {
        volatility: 0.8,
        logicLoad: clamp(0.45 + context.averageElo / 5000, 0.35, 1),
        memoryLoad: 0.55,
      },
    };
  }

  if (context.mode === "challenge") {
    const challenge = buildChallengeWeights(context);
    return {
      strategy: "training",
      primaryType: weightedPick(challenge.weights),
      weights: challenge.weights,
      rationale: challenge.rationale,
      parameters: {
        volatility: 0.35,
        logicLoad: clamp(0.4 + context.averageElo / 6000, 0.3, 0.9),
        memoryLoad: 0.65,
      },
    };
  }

  if (context.mode === "ranked") {
    const weights = buildBalancedWeights(context);
    return {
      strategy: "balanced",
      primaryType: weightedPick(weights),
      weights,
      rationale: ["ranked mode balances variety against overplayed puzzle types"],
      parameters: {
        volatility: 0.55,
        logicLoad: clamp(0.5 + context.averageElo / 5500, 0.4, 1),
        memoryLoad: 0.5,
      },
    };
  }

  const weights = createWeightMap(1);
  return {
    strategy: "random",
    primaryType: weightedPick(weights),
    weights,
    rationale: ["non-ranked modes default to a broad procedural mix"],
    parameters: {
      volatility: 0.45,
      logicLoad: 0.5,
      memoryLoad: 0.5,
    },
  };
}
