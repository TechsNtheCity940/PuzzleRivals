import { HEAD_TO_HEAD_BALANCE } from "@/game/head-to-head/config";
import type {
  HeadToHeadAttackId,
  HeadToHeadCombatantState,
  HeadToHeadModeDefinition,
  HeadToHeadSolveSample,
} from "@/game/head-to-head/types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeSeed(seedHint: number) {
  const seed = Math.abs(Math.floor(seedHint)) || 1;
  return seed % 2147483647;
}

export function nextBotSeed(seedHint: number) {
  const seed = normalizeSeed(seedHint);
  return (seed * 48271) % 2147483647;
}

function seededUnit(seedHint: number) {
  return (nextBotSeed(seedHint) - 1) / 2147483646;
}

function boardComboBase(mode: HeadToHeadModeDefinition, difficulty: number, seedHint: number) {
  const roll = seededUnit(seedHint + difficulty * 17);

  if (mode.boardFamily === "match3") {
    return clamp(2 + Math.round(roll * 3), 2, 5);
  }

  if (mode.boardFamily === "memory" || mode.boardFamily === "glyph" || mode.boardFamily === "spatial") {
    return clamp(1 + Math.round(roll * 2), 1, 3);
  }

  return clamp(1 + Math.round(roll * 2), 1, 3);
}

function boardMatchValue(mode: HeadToHeadModeDefinition, difficulty: number, seedHint: number) {
  const roll = seededUnit(seedHint + difficulty * 29);

  switch (mode.boardFamily) {
    case "match3":
      return clamp(5 + Math.round(roll * 8), 5, 14);
    case "memory":
    case "glyph":
      return clamp(3 + Math.round(roll * 4), 3, 7);
    case "maze":
      return clamp(4 + Math.round(roll * 5), 4, 9);
    default:
      return clamp(4 + Math.round(roll * 4), 4, 8);
  }
}

export function getBotResolveAt(input: {
  now: number;
  mode: HeadToHeadModeDefinition;
  difficulty: 1 | 2 | 3 | 4 | 5;
  combatant: HeadToHeadCombatantState;
  seedHint: number;
}) {
  const baseWindow = HEAD_TO_HEAD_BALANCE.bot.baseSolveWindowMs[input.mode.boardFamily];
  const seededVariance = Math.round(
    (seededUnit(input.seedHint + input.combatant.roundsSolved * 43 + input.combatant.mistakes * 19) - 0.5)
      * 2
      * HEAD_TO_HEAD_BALANCE.bot.roundVarianceMs,
  );
  const momentumOffset =
    input.combatant.momentumTier === "high"
      ? -700
      : input.combatant.momentumTier === "medium"
        ? -320
        : 0;
  const statusDelay = input.combatant.activeStatuses.reduce((delay, status) => {
    if (status.abilityId === "freeze_pulse") {
      return delay + Math.max(400, status.endsAtMs - input.now);
    }

    if (status.abilityId === "fog_tiles") {
      return delay + 420;
    }

    if (status.abilityId === "reverse_input") {
      return delay + 300;
    }

    if (status.abilityId === "mini_scramble") {
      return delay + 520;
    }

    return delay;
  }, 0);

  const resolveWindow = clamp(
    baseWindow + (input.difficulty - 1) * 420 + seededVariance + momentumOffset + statusDelay,
    HEAD_TO_HEAD_BALANCE.bot.minimumSolveMs,
    24000,
  );

  return input.now + resolveWindow;
}

export function buildBotSolveSample(input: {
  mode: HeadToHeadModeDefinition;
  difficulty: 1 | 2 | 3 | 4 | 5;
  combatant: HeadToHeadCombatantState;
  seedHint: number;
}): { mistake: boolean; sample: HeadToHeadSolveSample } {
  const mistakeRoll = seededUnit(input.seedHint + input.combatant.roundsSolved * 97 + input.difficulty * 13);
  const disruptionPenalty = input.combatant.activeStatuses.length > 0 ? 0.07 : 0;
  const momentumReduction = input.combatant.momentumTier === "high" ? 0.04 : 0;
  const mistakeChance = clamp(
    HEAD_TO_HEAD_BALANCE.bot.mistakeChanceBase + disruptionPenalty - momentumReduction,
    0.04,
    0.42,
  );
  const mistake = mistakeRoll <= mistakeChance;

  const durationBase = HEAD_TO_HEAD_BALANCE.bot.baseSolveWindowMs[input.mode.boardFamily];
  const durationRoll = seededUnit(input.seedHint + input.combatant.score * 7 + input.difficulty * 31);
  const durationMs = clamp(
    Math.round(
      durationBase
        - input.combatant.momentum * 14
        + (durationRoll - 0.5) * HEAD_TO_HEAD_BALANCE.bot.roundVarianceMs,
    ),
    HEAD_TO_HEAD_BALANCE.bot.minimumSolveMs,
    20000,
  );

  return {
    mistake,
    sample: {
      durationMs,
      comboValue: boardComboBase(input.mode, input.difficulty, input.seedHint),
      matchedTiles: boardMatchValue(input.mode, input.difficulty, input.seedHint),
      movesLeft: clamp(6 + input.difficulty - Math.round(durationRoll * 4), 1, 12),
      flawless: !mistake && durationRoll > 0.32,
    },
  };
}

export function shouldBotUseAttack(input: {
  attacker: HeadToHeadCombatantState;
  defender: HeadToHeadCombatantState;
  seedHint: number;
}) {
  if (input.attacker.attackCharge < 100) {
    return false;
  }

  const roll = seededUnit(input.seedHint + input.attacker.roundsSolved * 59 + input.defender.score);
  const aggressivePressure = input.attacker.score <= input.defender.score ? 0.14 : 0;
  const defenderShielded = input.defender.activeStatuses.some(
    (status) => status.kind === "defense" && status.abilityId === "shield",
  );

  return roll <= HEAD_TO_HEAD_BALANCE.bot.abilityUseChance + aggressivePressure && !defenderShielded;
}

export function shouldBotUseDefense(input: {
  combatant: HeadToHeadCombatantState;
  opponentAttack?: HeadToHeadAttackId | null;
  seedHint: number;
}) {
  if (input.combatant.defenseCharge < 100) {
    return false;
  }

  const activeAttackCount = input.combatant.activeStatuses.filter((status) => status.kind === "attack").length;
  const roll = seededUnit(input.seedHint + input.combatant.mistakes * 41 + activeAttackCount * 13);
  const underPressure = activeAttackCount > 0 || Boolean(input.opponentAttack);

  return underPressure ? roll <= 0.84 : roll <= 0.28;
}
