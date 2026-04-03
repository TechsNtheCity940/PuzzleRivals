import { describe, expect, it } from "vitest";
import {
  HEAD_TO_HEAD_MODE_POOL,
  HEAD_TO_HEAD_PRESETS,
  pickHeadToHeadMode,
} from "@/game/head-to-head/config";

describe("head to head config", () => {
  it("uses the requested score targets for each preset", () => {
    expect(HEAD_TO_HEAD_PRESETS.quick_match.targetScore).toBe(75);
    expect(HEAD_TO_HEAD_PRESETS.ranked.targetScore).toBe(100);
    expect(HEAD_TO_HEAD_PRESETS.extended.targetScore).toBe(125);
  });

  it("keeps the duel pool limited to continuously solvable board families", () => {
    expect(HEAD_TO_HEAD_MODE_POOL.length).toBeGreaterThan(0);
    expect(
      HEAD_TO_HEAD_MODE_POOL.every(
        (entry) => entry.boardFamily !== "quiz" && entry.boardFamily !== "strategy",
      ),
    ).toBe(true);
  });

  it("picks only supported head to head modes", () => {
    const picked = pickHeadToHeadMode({
      seedHint: 1441,
      history: [],
      currentMode: null,
    });

    expect(HEAD_TO_HEAD_MODE_POOL.some((entry) => entry.mode === picked.mode)).toBe(true);
  });
});
