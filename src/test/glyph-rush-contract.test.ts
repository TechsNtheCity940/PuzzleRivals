import { describe, expect, it } from "vitest";
import {
  buildGlyphRushRounds,
  evaluateGlyphRushAnswers,
} from "../../shared/match-puzzle-contract";

describe("glyph rush contract", () => {
  it("builds deterministic glyph rounds from the same seed", () => {
    const first = buildGlyphRushRounds(441, 4);
    const second = buildGlyphRushRounds(441, 4);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThanOrEqual(7);
  });

  it("scores exact glyph reconstructions above partial attempts", () => {
    const rounds = buildGlyphRushRounds(512, 3);
    const perfectAnswers = rounds.map((round) => [...round.targets]);
    const partialAnswers = rounds.map((round, index) =>
      index === 0 ? [...round.targets.slice(0, Math.max(1, round.targets.length - 1))] : [],
    );

    expect(evaluateGlyphRushAnswers(rounds, perfectAnswers)).toBe(100);
    expect(evaluateGlyphRushAnswers(rounds, partialAnswers)).toBeLessThan(100);
    expect(evaluateGlyphRushAnswers(rounds, partialAnswers)).toBeGreaterThanOrEqual(0);
  });
});
