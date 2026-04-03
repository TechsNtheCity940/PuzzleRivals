import { HEAD_TO_HEAD_ARENA_PUZZLE_TYPES } from "../../../shared/head-to-head-arena.ts";
import { RANKED_ARENA_PUZZLE_TYPES } from "../../../shared/ranked-arena.ts";
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
  recentPuzzleTypes?: MatchPlayablePuzzleType[];
  sameModeRecentPuzzleTypes?: MatchPlayablePuzzleType[];
  selectionSeed?: string;
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

const MIN_WEIGHT = 0.05;
const RANKED_ONLY_PUZZLE_TYPES = [...RANKED_ARENA_PUZZLE_TYPES] as MatchPlayablePuzzleType[];
const HEAD_TO_HEAD_ONLY_PUZZLE_TYPES = [...HEAD_TO_HEAD_ARENA_PUZZLE_TYPES] as MatchPlayablePuzzleType[];

class DeterministicRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed > 0 ? seed : 1;
  }

  next() {
    this.seed = (this.seed * 48271) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

function createWeightMap(
  baseWeight = 1,
  eligibleTypes: MatchPlayablePuzzleType[] = ALL_PUZZLE_TYPES,
) {
  const eligibleTypeSet = new Set(eligibleTypes);
  return Object.fromEntries(
    ALL_PUZZLE_TYPES.map((type) => [type, eligibleTypeSet.has(type) ? baseWeight : 0]),
  ) as Record<MatchPlayablePuzzleType, number>;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function seedFromString(value: string) {
  let seed = 0;
  for (const character of value) {
    seed = (seed * 31 + character.charCodeAt(0)) % 2147483647;
  }
  return seed || 1;
}

function createRandomSource(selectionSeed?: string) {
  if (!selectionSeed) {
    return () => Math.random();
  }

  const rng = new DeterministicRandom(seedFromString(selectionSeed));
  return () => rng.next();
}

function weightedPick(weights: Record<MatchPlayablePuzzleType, number>, selectionSeed?: string) {
  const entries = ALL_PUZZLE_TYPES.map((type) => [type, Math.max(0, weights[type] ?? 0)] as const);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const nextRandom = createRandomSource(selectionSeed);

  if (total <= 0) {
    return ALL_PUZZLE_TYPES[Math.floor(nextRandom() * ALL_PUZZLE_TYPES.length)];
  }

  let cursor = nextRandom() * total;
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

function applyReplayPrevention(
  weights: Record<MatchPlayablePuzzleType, number>,
  recentPuzzleTypes: MatchPlayablePuzzleType[] | undefined,
  rationale: string[],
) {
  if (!recentPuzzleTypes || recentPuzzleTypes.length === 0) {
    return weights;
  }

  const nextWeights = { ...weights };
  const repeatCounts = new Map<MatchPlayablePuzzleType, number>();

  recentPuzzleTypes.slice(0, 6).forEach((type, index) => {
    const priorRepeats = repeatCounts.get(type) ?? 0;
    const recencyPenalty = clamp(4.5 - index * 0.6, 1.25, 4.5);
    const repeatPenalty = priorRepeats * 1.4;
    const currentWeight = nextWeights[type] ?? 0;
    if (currentWeight <= 0) return;
    nextWeights[type] = Math.max(MIN_WEIGHT, currentWeight - recencyPenalty - repeatPenalty);
    repeatCounts.set(type, priorRepeats + 1);
  });

  const repeatedRecentTypes = [...repeatCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([type, count]) => `${type} x${count}`);

  rationale.push(
    repeatedRecentTypes.length > 0
      ? `recent puzzle history penalizes repeats (${repeatedRecentTypes.join(", ")})`
      : "recent puzzle history penalizes immediate repeats",
  );

  return nextWeights;
}

function applyModeCooldown(
  weights: Record<MatchPlayablePuzzleType, number>,
  sameModeRecentPuzzleTypes: MatchPlayablePuzzleType[] | undefined,
  rationale: string[],
) {
  if (!sameModeRecentPuzzleTypes || sameModeRecentPuzzleTypes.length === 0) {
    return weights;
  }

  const nextWeights = { ...weights };
  const cooldownWindow = sameModeRecentPuzzleTypes.slice(0, 5);
  const recentlyBlocked = new Set(cooldownWindow.slice(0, 2));

  for (const [index, type] of cooldownWindow.entries()) {
    const currentWeight = nextWeights[type] ?? 0;
    if (currentWeight <= 0) continue;

    if (index === 0) {
      nextWeights[type] = 0;
      continue;
    }

    if (recentlyBlocked.has(type)) {
      nextWeights[type] = MIN_WEIGHT;
      continue;
    }

    const cooldownPenalty = clamp(3.25 - index * 0.45, 1.1, 3.25);
    nextWeights[type] = Math.max(MIN_WEIGHT, currentWeight - cooldownPenalty);
  }

  rationale.push("same-mode cooldown blocks the immediate repeat and strongly suppresses puzzle types used in this queue recently");
  return nextWeights;
}

function buildBalancedWeights(
  context: PuzzleGeneratorContext,
  eligibleTypes: MatchPlayablePuzzleType[] = RANKED_ONLY_PUZZLE_TYPES,
  rationaleLabel = "ranked mode balances variety across the live ranked arena puzzle pool",
) {
  const baseWeights = createWeightMap(1, eligibleTypes);
  const rationale = [rationaleLabel];

  for (const type of eligibleTypes) {
    const lobbyMatches = context.players.reduce(
      (sum, player) => sum + (player.matchesPlayedByType[type] ?? 0),
      0,
    );
    const averageMatches = lobbyMatches / Math.max(context.players.length, 1);
    baseWeights[type] += clamp(4 - averageMatches, 0, 3) * 0.65;
  }

  const replayAdjusted = applyReplayPrevention(baseWeights, context.recentPuzzleTypes, rationale);
  return {
    weights: applyModeCooldown(replayAdjusted, context.sameModeRecentPuzzleTypes, rationale),
    rationale,
  };
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

  const replayAdjusted = applyReplayPrevention(weights, context.recentPuzzleTypes, rationale);
  return {
    weights: applyModeCooldown(replayAdjusted, context.sameModeRecentPuzzleTypes, rationale),
    rationale,
  };
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

  const replayAdjusted = applyReplayPrevention(weights, context.recentPuzzleTypes, rationale);
  return {
    weights: applyModeCooldown(replayAdjusted, context.sameModeRecentPuzzleTypes, rationale),
    rationale,
  };
}

export function generatePuzzleTemplate(context: PuzzleGeneratorContext): GeneratedPuzzleTemplate {
  if (context.mode === "revenge") {
    const revenge = buildRevengeWeights(context);
    return {
      strategy: "revenge",
      primaryType: weightedPick(revenge.weights, context.selectionSeed),
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
      primaryType: weightedPick(challenge.weights, context.selectionSeed),
      weights: challenge.weights,
      rationale: challenge.rationale,
      parameters: {
        volatility: 0.35,
        logicLoad: clamp(0.4 + context.averageElo / 6000, 0.3, 0.9),
        memoryLoad: 0.65,
      },
    };
  }

  if (context.mode === "head_to_head") {
    const balanced = buildBalancedWeights(
      context,
      HEAD_TO_HEAD_ONLY_PUZZLE_TYPES,
      "head to head balances variety across the live duel arena puzzle pool",
    );
    return {
      strategy: "balanced",
      primaryType: weightedPick(balanced.weights, context.selectionSeed),
      weights: balanced.weights,
      rationale: balanced.rationale,
      parameters: {
        volatility: 0.5,
        logicLoad: clamp(0.45 + context.averageElo / 5750, 0.35, 0.95),
        memoryLoad: 0.55,
      },
    };
  }

  if (context.mode === "ranked") {
    const balanced = buildBalancedWeights(context);
    return {
      strategy: "balanced",
      primaryType: weightedPick(balanced.weights, context.selectionSeed),
      weights: balanced.weights,
      rationale: balanced.rationale,
      parameters: {
        volatility: 0.55,
        logicLoad: clamp(0.5 + context.averageElo / 5500, 0.4, 1),
        memoryLoad: 0.5,
      },
    };
  }

  const rationale = ["non-ranked modes default to a broad procedural mix"];
  const replayAdjusted = applyReplayPrevention(createWeightMap(1), context.recentPuzzleTypes, rationale);
  const weights = applyModeCooldown(replayAdjusted, context.sameModeRecentPuzzleTypes, rationale);
  return {
    strategy: "random",
    primaryType: weightedPick(weights, context.selectionSeed),
    weights,
    rationale,
    parameters: {
      volatility: 0.45,
      logicLoad: 0.5,
      memoryLoad: 0.5,
    },
  };
}
