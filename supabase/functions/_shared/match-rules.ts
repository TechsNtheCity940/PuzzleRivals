import type { MatchPlayablePuzzleType } from "./puzzle.ts";

const RAPID_FIRE_TYPES = new Set<MatchPlayablePuzzleType>([
  "pattern_match",
  "word_scramble",
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
]);

export const RAPID_FIRE_CUTOFF_MS = 5_000;

export function isRapidFirePuzzleType(puzzleType: string | null | undefined): puzzleType is MatchPlayablePuzzleType {
  if (!puzzleType) {
    return false;
  }

  return RAPID_FIRE_TYPES.has(puzzleType as MatchPlayablePuzzleType);
}

export function createVariantSeed(baseSeed: number, userId: string, variantIndex: number) {
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

function normalizeSeed(seed: number) {
  const value = Math.floor(seed) % 2147483647;
  if (value <= 0) {
    return 1;
  }

  return value;
}
