import { NEON_RIVALS_RUN_MODE_OPTIONS } from "@/game/config/runModes";
import type { ArenaRotationHistoryEntry, NeonRivalsRunMode } from "@/game/types";
import type {
  HeadToHeadAttackId,
  HeadToHeadAudioHooks,
  HeadToHeadDefenseId,
  HeadToHeadModeDefinition,
  HeadToHeadPresetConfig,
  HeadToHeadPresetId,
} from "@/game/head-to-head/types";

export const HEAD_TO_HEAD_PRESETS: Record<HeadToHeadPresetId, HeadToHeadPresetConfig> = {
  quick_match: {
    id: "quick_match",
    label: "Quick Match",
    targetScore: 75,
    description: "Shorter score race with faster swings and tighter finishes.",
  },
  ranked: {
    id: "ranked",
    label: "Ranked",
    targetScore: 100,
    description: "Balanced competitive score race tuned for the core Head 2 Head format.",
  },
  extended: {
    id: "extended",
    label: "Extended",
    targetScore: 125,
    description: "Longer duel with more room for counterplay, adaptation, and momentum swings.",
  },
};

const MODE_LOOKUP = new Map(
  (Array.isArray(NEON_RIVALS_RUN_MODE_OPTIONS) ? NEON_RIVALS_RUN_MODE_OPTIONS : []).map((option) => [option.id, option]),
);

function resolveMode(
  mode: NeonRivalsRunMode,
  baseDifficulty: 1 | 2 | 3 | 4 | 5,
  fastSolveThresholdMs: number,
): HeadToHeadModeDefinition {
  const option = MODE_LOOKUP.get(mode);
  if (!option) {
    throw new Error(`Missing run mode definition for ${mode}`);
  }

  return {
    mode,
    boardFamily: option.boardFamily,
    label: option.label,
    description: option.description,
    baseDifficulty,
    fastSolveThresholdMs,
  };
}

export const HEAD_TO_HEAD_MODE_POOL: HeadToHeadModeDefinition[] = [
  resolveMode("score_attack", 2, 20000),
  resolveMode("combo_rush", 2, 18000),
  resolveMode("color_hunt", 2, 19000),
  resolveMode("clear_rush", 2, 18000),
  resolveMode("maze_rush", 2, 17000),
  resolveMode("circuit_clash", 2, 18500),
  resolveMode("link_lock", 2, 19500),
  resolveMode("mirror_maze", 2, 18200),
  resolveMode("tile_shift", 2, 22000),
  resolveMode("number_crunch", 2, 19000),
  resolveMode("spatial_spin", 2, 16000),
  resolveMode("memory_flash", 2, 15000),
];

export const HEAD_TO_HEAD_ATTACK_ROTATION: HeadToHeadAttackId[] = [
  "reverse_input",
  "fog_tiles",
  "mini_scramble",
  "freeze_pulse",
];

export const HEAD_TO_HEAD_DEFENSE_ROTATION: HeadToHeadDefenseId[] = [
  "cleanse",
  "shield",
  "focus_mode",
  "anchor",
];

export const HEAD_TO_HEAD_AUDIO_HOOKS: HeadToHeadAudioHooks = {
  attack: "h2h_attack_activate",
  defense: "h2h_defense_activate",
  warning: "h2h_attack_warning",
  scoreMilestone: "h2h_score_milestone",
  momentum: "h2h_momentum_shift",
  victory: "h2h_win",
  defeat: "h2h_lose",
};

export const HEAD_TO_HEAD_BALANCE = {
  countdownMs: 2400,
  roundDifficultyRampEvery: 2,
  maxDifficulty: 5,
  score: {
    basicCorrect: 5,
    fastSolveBonus: 2,
    comboBonusPerStep: 1,
    comboBonusCap: 4,
    perfectSpecial: 8,
    milestoneStep: 25,
  },
  momentum: {
    min: 0,
    max: 100,
    thresholds: {
      medium: 34,
      high: 68,
    },
    multiplier: {
      low: 1,
      medium: 1.08,
      high: 1.16,
    },
    gain: {
      solve: 11,
      fast: 8,
      comboStep: 4,
      perfect: 10,
      recovery: 6,
    },
    loss: {
      mistake: 18,
      disruption: 12,
    },
  },
  charge: {
    threshold: 100,
    attack: {
      solve: 16,
      fast: 14,
      comboStep: 6,
      perfect: 10,
      trailingBoost: 8,
    },
    defense: {
      solve: 12,
      fast: 4,
      comboStep: 2,
      perfect: 18,
      trailingBoost: 12,
    },
  },
  defenseDurationsMs: {
    shield: 8000,
    focus_mode: 7000,
    anchor: 6500,
  },
  attackDurationsMs: {
    reverse_input: 5600,
    fog_tiles: 6200,
    mini_scramble: 5400,
    freeze_pulse: 5200,
  },
  freezePulse: {
    cycleMs: 1500,
    lockMs: 520,
  },
  diminishingReturnsWindowMs: 12000,
  focusReduction: 0.65,
  controlDiminishingMultipliers: [1, 0.72, 0.48],
  trailingDefenseThreshold: 15,
  bot: {
    baseSolveWindowMs: {
      match3: 8800,
      maze: 7600,
      pipe: 9500,
      link: 9200,
      mirror: 9000,
      tile: 10400,
      number: 8900,
      spatial: 7200,
      memory: 6900,
    } as const,
    minimumSolveMs: 2600,
    roundVarianceMs: 2400,
    mistakeChanceBase: 0.12,
    abilityUseChance: 0.6,
  },
} as const;

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

function getModeWeight(
  candidate: HeadToHeadModeDefinition,
  currentMode: NeonRivalsRunMode | null,
  history: ArenaRotationHistoryEntry[],
) {
  const recentHistory = history.filter((entry) => HEAD_TO_HEAD_MODE_POOL.some((mode) => mode.mode === entry.mode)).slice(0, 6);
  const immediate = recentHistory[0];
  let weight = 100;

  if (currentMode === candidate.mode) weight -= 24;
  if (immediate?.mode === candidate.mode) weight -= 62;
  if (immediate?.boardFamily === candidate.boardFamily) weight -= 28;

  const sameModeCount = recentHistory.filter((entry) => entry.mode === candidate.mode).length;
  const sameFamilyCount = recentHistory.filter((entry) => entry.boardFamily === candidate.boardFamily).length;
  weight -= sameModeCount * 22;
  weight -= sameFamilyCount * 12;

  if (!recentHistory.some((entry) => entry.mode === candidate.mode)) weight += 18;
  if (!recentHistory.some((entry) => entry.boardFamily === candidate.boardFamily)) weight += 18;

  return Math.max(4, weight);
}

export function pickHeadToHeadMode(input: {
  seedHint: number;
  history: ArenaRotationHistoryEntry[];
  currentMode?: NeonRivalsRunMode | null;
}) {
  let seed = normalizedSeed(input.seedHint);
  const weightedPool = HEAD_TO_HEAD_MODE_POOL.map((mode) => ({
    mode,
    weight: getModeWeight(mode, input.currentMode ?? null, input.history),
  }));
  const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return HEAD_TO_HEAD_MODE_POOL[0];
  }

  seed = nextSeedValue(seed);
  let cursor = seededUnitFloat(seed) * totalWeight;
  for (const entry of weightedPool) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return entry.mode;
    }
  }

  return weightedPool[weightedPool.length - 1]?.mode ?? HEAD_TO_HEAD_MODE_POOL[0];
}
