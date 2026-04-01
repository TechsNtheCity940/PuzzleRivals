import type {
  ArenaRotationHistoryEntry,
  NeonRivalsBoardFamily,
  NeonRivalsRunMode,
} from "@/game/types";
import { NEON_RIVALS_RUN_MODE_OPTIONS } from "@/game/config/runModes";

const MODE_LOOKUP = new Map(
  NEON_RIVALS_RUN_MODE_OPTIONS.map((option) => [option.id, option]),
);

export const MAX_ARENA_HISTORY = 12;

function normalizedSeed(seedHint: number) {
  const seed = Math.abs(Math.floor(seedHint)) || 1;
  return seed % 2147483647;
}

function nextSeedValue(seed: number) {
  return (seed * 48271) % 2147483647;
}

function seededUnitFloat(seed: number) {
  return (seed - 1) / 2147483646;
}

function getBoardFamily(mode: NeonRivalsRunMode): NeonRivalsBoardFamily {
  return MODE_LOOKUP.get(mode)?.boardFamily ?? "match3";
}

export function createArenaHistoryEntry(
  mode: NeonRivalsRunMode,
  seed: number,
  playedAt = Date.now(),
): ArenaRotationHistoryEntry {
  return {
    mode,
    boardFamily: getBoardFamily(mode),
    seed,
    playedAt,
  };
}

export function appendArenaHistory(
  history: ArenaRotationHistoryEntry[],
  nextEntry: ArenaRotationHistoryEntry,
) {
  const merged = [nextEntry, ...history.filter(
    (entry) => !(entry.mode === nextEntry.mode && entry.seed === nextEntry.seed),
  )];
  return merged.slice(0, MAX_ARENA_HISTORY);
}

function getModeWeight(
  mode: NeonRivalsRunMode,
  currentMode: NeonRivalsRunMode,
  history: ArenaRotationHistoryEntry[],
) {
  const family = getBoardFamily(mode);
  const recentHistory = history.slice(0, 6);
  const immediate = history[0];
  let weight = 100;

  if (mode === currentMode) {
    weight -= 26;
  }

  if (immediate?.mode === mode) {
    weight -= 62;
  }

  if (immediate?.boardFamily === family) {
    weight -= 28;
  }

  const sameModeCount = recentHistory.filter((entry) => entry.mode === mode).length;
  const sameFamilyCount = recentHistory.filter((entry) => entry.boardFamily === family).length;
  weight -= sameModeCount * 24;
  weight -= sameFamilyCount * 12;

  if (!recentHistory.some((entry) => entry.mode === mode)) {
    weight += 18;
  }

  if (!recentHistory.some((entry) => entry.boardFamily === family)) {
    weight += 22;
  }

  return Math.max(4, weight);
}

export function pickNextArenaMode(input: {
  currentMode: NeonRivalsRunMode;
  history: ArenaRotationHistoryEntry[];
  seedHint: number;
}) {
  let seed = normalizedSeed(input.seedHint);
  const candidates = NEON_RIVALS_RUN_MODE_OPTIONS.map((option) => ({
    mode: option.id,
    weight: getModeWeight(option.id, input.currentMode, input.history),
  }));
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);

  if (totalWeight <= 0) {
    return input.currentMode;
  }

  seed = nextSeedValue(seed);
  let cursor = seededUnitFloat(seed) * totalWeight;
  for (const candidate of candidates) {
    cursor -= candidate.weight;
    if (cursor <= 0) {
      return candidate.mode;
    }
  }

  return candidates[candidates.length - 1]?.mode ?? input.currentMode;
}

export function createFreshArenaSeed(
  history: ArenaRotationHistoryEntry[],
  seedHint = Date.now(),
) {
  let seed = Math.max(1, Math.floor(seedHint));
  const recentSeeds = new Set(history.slice(0, 8).map((entry) => entry.seed));
  while (recentSeeds.has(seed)) {
    seed += 7919;
  }
  return seed;
}
