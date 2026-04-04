import {
  HEAD_TO_HEAD_LIVE_DURATION_MS,
  HEAD_TO_HEAD_LIVE_TARGET_SCORE,
  isHeadToHeadArenaPuzzleType,
} from "../../../shared/head-to-head-arena.ts";
import type { MatchPlayablePuzzleType } from "./puzzle.ts";

const RAPID_FIRE_TYPES = new Set<MatchPlayablePuzzleType>([
  "circuit_clash",
  "pattern_match",
  "word_scramble",
  "crossword_mini",
  "word_search",
  "matching_pairs",
  "spatial_reasoning",
  "riddle_choice",
  "wordle_guess",
  "logic_sequence",
  "trivia_blitz",
  "geography_quiz",
  "science_quiz",
  "math_race",
  "code_breaker",
  "analogies",
  "deduction_grid",
  "vocabulary_duel",
  "pathfinder",
  "glyph_rush",
]);

export const RAPID_FIRE_CUTOFF_MS = 5_000;
export const DEFAULT_LIVE_DURATION_MS = 90_000;

export function isRapidFirePuzzleType(
  puzzleType: string | null | undefined,
): puzzleType is MatchPlayablePuzzleType {
  if (!puzzleType) {
    return false;
  }

  return RAPID_FIRE_TYPES.has(puzzleType as MatchPlayablePuzzleType);
}

export function isHeadToHeadPuzzleType(
  puzzleType: string | null | undefined,
): puzzleType is MatchPlayablePuzzleType {
  return isHeadToHeadArenaPuzzleType(puzzleType);
}

export function isLiveScoreRacePuzzle(
  mode: string | null | undefined,
  puzzleType: string | null | undefined,
): puzzleType is MatchPlayablePuzzleType {
  if (mode === "head_to_head") {
    return isHeadToHeadPuzzleType(puzzleType);
  }

  return isRapidFirePuzzleType(puzzleType);
}

export function getLiveDurationMs(mode: string | null | undefined) {
  return mode === "head_to_head"
    ? HEAD_TO_HEAD_LIVE_DURATION_MS
    : DEFAULT_LIVE_DURATION_MS;
}

export function getLiveTargetScore(mode: string | null | undefined) {
  return mode === "head_to_head" ? HEAD_TO_HEAD_LIVE_TARGET_SCORE : null;
}

export function createVariantSeed(
  baseSeed: number,
  userId: string,
  variantIndex: number,
) {
  if (variantIndex <= 0) {
    return normalizeSeed(baseSeed);
  }

  let hash = normalizeSeed(baseSeed);
  const signature = `${userId}:${variantIndex}`;
  for (const char of signature) {
    hash = (hash * 48271 + char.charCodeAt(0) * 97) % 2147483647;
  }

  if (hash === normalizeSeed(baseSeed)) {
    hash = (hash + variantIndex * 131) % 2147483647;
  }

  return normalizeSeed(hash);
}

export function getSolveScore(solveMs: number) {
  const seconds = Math.max(1, Math.ceil(solveMs / 1000));
  const speedBonus = Math.max(0, 36 - seconds * 2);
  return 100 + speedBonus;
}

export function getHeadToHeadSolveScore(input: {
  solveMs: number;
  currentCompletions: number;
  currentScore: number;
  targetScore?: number;
}) {
  const targetScore = input.targetScore ?? HEAD_TO_HEAD_LIVE_TARGET_SCORE;
  const solveMs = Math.max(0, Math.floor(input.solveMs));
  const currentCompletions = Math.max(0, Math.floor(input.currentCompletions));
  const currentScore = Math.max(0, Math.floor(input.currentScore));

  const baseScore = 5;
  const fastSolveBonus = solveMs <= 12_000 ? 2 : solveMs <= 16_000 ? 1 : 0;
  const comboBonus = Math.min(3, currentCompletions);
  const momentumBonus = currentCompletions >= 7 ? 2 : currentCompletions >= 4 ? 1 : 0;
  const solveScore = baseScore + fastSolveBonus + comboBonus + momentumBonus;
  return Math.max(0, Math.min(targetScore, currentScore + solveScore) - currentScore);
}

function normalizeSeed(seed: number) {
  const value = Math.floor(seed) % 2147483647;
  if (value <= 0) {
    return 1;
  }

  return value;
}
