export const MATCH_HINT_COOLDOWN_MS = 12_000;

function clampNonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export function getMatchHintPenalty(useCount: number) {
  const normalized = Math.max(1, Math.floor(useCount));
  const escalationIndex = normalized - 1;
  return 60 + escalationIndex * 55 + Math.max(0, escalationIndex * (escalationIndex - 1)) * 20;
}

export function getEffectiveMatchScore(rawScore: number, penaltyTotal: number) {
  return Math.max(0, clampNonNegativeInteger(rawScore) - clampNonNegativeInteger(penaltyTotal));
}
