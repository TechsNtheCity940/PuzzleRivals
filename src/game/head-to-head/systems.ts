import { HEAD_TO_HEAD_BALANCE } from "@/game/head-to-head/config";
import type {
  HeadToHeadAttackId,
  HeadToHeadCombatantState,
  HeadToHeadDefenseId,
  HeadToHeadModeDefinition,
  HeadToHeadMomentumTier,
  HeadToHeadSolveSample,
  HeadToHeadStatusEffect,
} from "@/game/head-to-head/types";

export interface HeadToHeadSolveOutcome {
  scoreDelta: number;
  momentumDelta: number;
  attackChargeDelta: number;
  defenseChargeDelta: number;
  comboStepDelta: number;
  fastSolve: boolean;
  perfectSolve: boolean;
}

export interface HeadToHeadAttackResolution {
  blocked: boolean;
  cleansed: boolean;
  ignored: boolean;
  durationMs: number;
  log: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getMomentumTier(value: number): HeadToHeadMomentumTier {
  if (value >= HEAD_TO_HEAD_BALANCE.momentum.thresholds.high) return "high";
  if (value >= HEAD_TO_HEAD_BALANCE.momentum.thresholds.medium) return "medium";
  return "low";
}

export function getMomentumMultiplier(tier: HeadToHeadMomentumTier) {
  return HEAD_TO_HEAD_BALANCE.momentum.multiplier[tier];
}

export function updateMomentum(current: number, delta: number) {
  return clamp(
    Math.round(current + delta),
    HEAD_TO_HEAD_BALANCE.momentum.min,
    HEAD_TO_HEAD_BALANCE.momentum.max,
  );
}

export function nextCharge(current: number, delta: number) {
  return clamp(Math.round(current + delta), 0, HEAD_TO_HEAD_BALANCE.charge.threshold);
}

function getComboSteps(sample: HeadToHeadSolveSample, boardFamily: HeadToHeadModeDefinition["boardFamily"]) {
  if (boardFamily === "match3") {
    return clamp(sample.comboValue - 1, 0, HEAD_TO_HEAD_BALANCE.score.comboBonusCap);
  }

  return clamp(Math.floor(sample.matchedTiles / 2), 0, HEAD_TO_HEAD_BALANCE.score.comboBonusCap);
}

export function scoreSolve(
  mode: HeadToHeadModeDefinition,
  sample: HeadToHeadSolveSample,
  currentTier: HeadToHeadMomentumTier,
  scoreGap: number,
): HeadToHeadSolveOutcome {
  const comboSteps = getComboSteps(sample, mode.boardFamily);
  const fastSolve = sample.durationMs <= mode.fastSolveThresholdMs;
  const perfectSolve = sample.flawless && sample.movesLeft >= 2;
  const trailing = scoreGap < 0 && Math.abs(scoreGap) >= HEAD_TO_HEAD_BALANCE.trailingDefenseThreshold;

  const baseScore = HEAD_TO_HEAD_BALANCE.score.basicCorrect
    + (fastSolve ? HEAD_TO_HEAD_BALANCE.score.fastSolveBonus : 0)
    + comboSteps * HEAD_TO_HEAD_BALANCE.score.comboBonusPerStep
    + (perfectSolve ? HEAD_TO_HEAD_BALANCE.score.perfectSpecial : 0);

  const scoreDelta = Math.max(1, Math.round(baseScore * getMomentumMultiplier(currentTier)));
  const momentumDelta = HEAD_TO_HEAD_BALANCE.momentum.gain.solve
    + (fastSolve ? HEAD_TO_HEAD_BALANCE.momentum.gain.fast : 0)
    + comboSteps * HEAD_TO_HEAD_BALANCE.momentum.gain.comboStep
    + (perfectSolve ? HEAD_TO_HEAD_BALANCE.momentum.gain.perfect : 0);

  return {
    scoreDelta,
    momentumDelta,
    attackChargeDelta:
      HEAD_TO_HEAD_BALANCE.charge.attack.solve
      + (fastSolve ? HEAD_TO_HEAD_BALANCE.charge.attack.fast : 0)
      + comboSteps * HEAD_TO_HEAD_BALANCE.charge.attack.comboStep
      + (perfectSolve ? HEAD_TO_HEAD_BALANCE.charge.attack.perfect : 0)
      + (trailing ? HEAD_TO_HEAD_BALANCE.charge.attack.trailingBoost : 0),
    defenseChargeDelta:
      HEAD_TO_HEAD_BALANCE.charge.defense.solve
      + (fastSolve ? HEAD_TO_HEAD_BALANCE.charge.defense.fast : 0)
      + comboSteps * HEAD_TO_HEAD_BALANCE.charge.defense.comboStep
      + (perfectSolve ? HEAD_TO_HEAD_BALANCE.charge.defense.perfect : 0)
      + (trailing ? HEAD_TO_HEAD_BALANCE.charge.defense.trailingBoost : 0),
    comboStepDelta: comboSteps,
    fastSolve,
    perfectSolve,
  };
}

export function isControlAttack(attackId: HeadToHeadAttackId) {
  return attackId === "reverse_input" || attackId === "mini_scramble" || attackId === "freeze_pulse";
}

export function getAttackLabel(attackId: HeadToHeadAttackId) {
  switch (attackId) {
    case "reverse_input":
      return "Reverse Input";
    case "fog_tiles":
      return "Fog Tiles";
    case "mini_scramble":
      return "Mini Scramble";
    case "freeze_pulse":
      return "Freeze Pulse";
  }
}

export function getDefenseLabel(defenseId: HeadToHeadDefenseId) {
  switch (defenseId) {
    case "cleanse":
      return "Cleanse";
    case "shield":
      return "Shield";
    case "focus_mode":
      return "Focus Mode";
    case "anchor":
      return "Anchor";
  }
}

export function hasActiveStatus(
  player: HeadToHeadCombatantState,
  abilityId: HeadToHeadAttackId | HeadToHeadDefenseId,
  now: number,
) {
  return player.activeStatuses.some(
    (status) => status.abilityId === abilityId && status.endsAtMs > now,
  );
}

export function createStatusEffect(input: {
  id: string;
  abilityId: HeadToHeadAttackId | HeadToHeadDefenseId;
  kind: "attack" | "defense";
  label: string;
  target: "player" | "opponent";
  startedAtMs: number;
  endsAtMs: number;
  severity?: number;
}): HeadToHeadStatusEffect {
  return {
    id: input.id,
    abilityId: input.abilityId,
    kind: input.kind,
    label: input.label,
    target: input.target,
    startedAtMs: input.startedAtMs,
    endsAtMs: input.endsAtMs,
    severity: input.severity ?? 1,
  };
}

export function resolveAttackDuration(
  target: HeadToHeadCombatantState,
  attackId: HeadToHeadAttackId,
  now: number,
) {
  const base = HEAD_TO_HEAD_BALANCE.attackDurationsMs[attackId];
  const recentControlHits = isControlAttack(attackId)
    ? target.activeStatuses.filter(
        (status) =>
          status.kind === "attack" &&
          isControlAttack(status.abilityId as HeadToHeadAttackId) &&
          now - status.startedAtMs <= HEAD_TO_HEAD_BALANCE.diminishingReturnsWindowMs,
      ).length
    : 0;
  const diminishing = isControlAttack(attackId)
    ? HEAD_TO_HEAD_BALANCE.controlDiminishingMultipliers[
        clamp(recentControlHits, 0, HEAD_TO_HEAD_BALANCE.controlDiminishingMultipliers.length - 1)
      ]
    : 1;
  const focused = hasActiveStatus(target, "focus_mode", now)
    ? HEAD_TO_HEAD_BALANCE.focusReduction
    : 1;
  return Math.max(5000, Math.round(base * diminishing * focused));
}

export function resolveIncomingAttack(input: {
  target: HeadToHeadCombatantState;
  attackId: HeadToHeadAttackId;
  now: number;
}): HeadToHeadAttackResolution {
  const { target, attackId, now } = input;

  if (hasActiveStatus(target, "shield", now)) {
    return {
      blocked: true,
      cleansed: false,
      ignored: false,
      durationMs: 0,
      log: `${target.displayName} blocked ${getAttackLabel(attackId)} with Shield.`,
    };
  }

  if ((attackId === "reverse_input" || attackId === "mini_scramble") && hasActiveStatus(target, "anchor", now)) {
    return {
      blocked: false,
      cleansed: false,
      ignored: true,
      durationMs: 0,
      log: `${target.displayName} held steady with Anchor.`,
    };
  }

  return {
    blocked: false,
    cleansed: false,
    ignored: false,
    durationMs: resolveAttackDuration(target, attackId, now),
    log: `${getAttackLabel(attackId)} hit ${target.displayName}.`,
  };
}

export function removeExpiredStatuses(statuses: HeadToHeadStatusEffect[], now: number) {
  return statuses.filter((status) => status.endsAtMs > now);
}

export function applyDisruptionPenalty(player: HeadToHeadCombatantState) {
  return {
    momentum: updateMomentum(player.momentum, -HEAD_TO_HEAD_BALANCE.momentum.loss.disruption),
    comboStreak: 0,
  };
}

export function applyMistakePenalty(player: HeadToHeadCombatantState) {
  return {
    momentum: updateMomentum(player.momentum, -HEAD_TO_HEAD_BALANCE.momentum.loss.mistake),
    comboStreak: 0,
  };
}
