import { describe, expect, it } from "vitest";
import { resolveIncomingAttack, scoreSolve } from "@/game/head-to-head/systems";
import type {
  HeadToHeadCombatantState,
  HeadToHeadModeDefinition,
} from "@/game/head-to-head/types";

function createCombatant(): HeadToHeadCombatantState {
  return {
    id: "player",
    displayName: "Ace",
    score: 0,
    comboStreak: 0,
    comboTotal: 0,
    momentum: 0,
    momentumTier: "low",
    attackCharge: 0,
    defenseCharge: 0,
    nextAttack: "reverse_input",
    nextDefense: "shield",
    roundsSolved: 0,
    mistakes: 0,
    lastSolveMs: null,
    targetReachedAtMs: null,
    activeStatuses: [],
  };
}

const MATCH_MODE: HeadToHeadModeDefinition = {
  mode: "score_attack",
  boardFamily: "match3",
  label: "Score Attack",
  description: "Classic clear lane.",
  baseDifficulty: 2,
  fastSolveThresholdMs: 20000,
};

describe("head to head systems", () => {
  it("boosts charge generation when the player is trailing", () => {
    const neutral = scoreSolve(
      MATCH_MODE,
      {
        durationMs: 16000,
        comboValue: 3,
        matchedTiles: 8,
        movesLeft: 4,
        flawless: true,
      },
      "low",
      0,
    );
    const trailing = scoreSolve(
      MATCH_MODE,
      {
        durationMs: 16000,
        comboValue: 3,
        matchedTiles: 8,
        movesLeft: 4,
        flawless: true,
      },
      "low",
      -24,
    );

    expect(trailing.attackChargeDelta).toBeGreaterThan(neutral.attackChargeDelta);
    expect(trailing.defenseChargeDelta).toBeGreaterThan(neutral.defenseChargeDelta);
  });

  it("lets shield block incoming attacks", () => {
    const target = createCombatant();
    target.activeStatuses.push({
      id: "shield:1",
      abilityId: "shield",
      kind: "defense",
      label: "Shield",
      target: "player",
      startedAtMs: 0,
      endsAtMs: 9999,
      severity: 1,
    });

    const resolution = resolveIncomingAttack({
      target,
      attackId: "fog_tiles",
      now: 100,
    });

    expect(resolution.blocked).toBe(true);
    expect(resolution.durationMs).toBe(0);
  });

  it("lets anchor ignore movement control attacks", () => {
    const target = createCombatant();
    target.activeStatuses.push({
      id: "anchor:1",
      abilityId: "anchor",
      kind: "defense",
      label: "Anchor",
      target: "player",
      startedAtMs: 0,
      endsAtMs: 9999,
      severity: 1,
    });

    const resolution = resolveIncomingAttack({
      target,
      attackId: "mini_scramble",
      now: 100,
    });

    expect(resolution.ignored).toBe(true);
    expect(resolution.durationMs).toBe(0);
  });
});
