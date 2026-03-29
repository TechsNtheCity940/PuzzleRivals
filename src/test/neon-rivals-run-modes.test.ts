import { describe, expect, it } from "vitest";
import {
  buildNeonRivalsObjective,
  createInitialGameState,
  getObjectiveProgressPercent,
  getObjectiveValue,
} from "@/game/config/runModes";

describe("Neon Rivals run modes", () => {
  it("creates deterministic color-hunt targets from the seed", () => {
    const first = buildNeonRivalsObjective("color_hunt", 101);
    const second = buildNeonRivalsObjective("color_hunt", 101);

    expect(first.targetColor).toBe(second.targetColor);
    expect(first.targetColorLabel).toBe(second.targetColorLabel);
  });

  it("tracks combo-rush progress from the peak combo instead of score", () => {
    const objective = buildNeonRivalsObjective("combo_rush", 22);
    const progress = getObjectiveValue(objective, {
      score: 3200,
      maxCombo: 4,
      matchedTiles: 30,
      clearedByColor: {},
    });

    expect(progress).toBe(4);
    expect(getObjectiveProgressPercent(progress, objective.targetValue)).toBe(100);
  });

  it("hydrates initial game state from the selected run mode", () => {
    const state = createInitialGameState("clear_rush", 44);

    expect(state.mode).toBe("clear_rush");
    expect(state.movesLeft).toBe(14);
    expect(state.objectiveTarget).toBe(42);
    expect(state.status).toBe("booting");
  });
});
