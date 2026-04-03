import { describe, expect, it } from "vitest";
import {
  buildStrategyRounds,
  getStrategyLegalMoves,
  isStrategySolutionMove,
} from "@/lib/strategy-puzzle-content";
import { evaluatePuzzleSubmission } from "../../supabase/functions/_shared/puzzle.ts";

const STRATEGY_KINDS = [
  "chess_tactic",
  "checkers_tactic",
  "chess_endgame",
  "chess_opening",
  "chess_mate_net",
] as const;

describe("strategy puzzle content", () => {
  it("builds deterministic ten-round authored strategy sets", () => {
    for (const kind of STRATEGY_KINDS) {
      const first = buildStrategyRounds(kind, 88421, 4);
      const second = buildStrategyRounds(kind, 88421, 4);

      expect(first).toEqual(second);
      expect(first).toHaveLength(10);
      expect(new Set(first.map((round) => round.id)).size).toBe(10);
    }
  });

  it("guarantees every authored solution is legal on its board state", () => {
    for (const kind of STRATEGY_KINDS) {
      const rounds = buildStrategyRounds(kind, 55129, 4);

      for (const round of rounds) {
        const legalMoves = getStrategyLegalMoves(round);
        for (const solution of round.solutions) {
          expect(legalMoves.some((move) => isStrategySolutionMove(round, move) && move.from === solution.from && move.to === solution.to)).toBe(true);
        }
      }
    }
  });

  it("scores strategy progress from authored move sequences instead of quiz answer indices", () => {
    const rounds = buildStrategyRounds("chess_tactic", 77124, 4);
    const progress = evaluatePuzzleSubmission("chess_tactic", 77124, 4, {
      kind: "chess_tactic",
      moves: rounds.slice(0, 2).map((round) => ({
        from: round.solutions[0].from,
        to: round.solutions[0].to,
      })),
    });

    expect(progress).toBe(20);
  });

  it("stops counting strategy progress at the first wrong legal move", () => {
    const rounds = buildStrategyRounds("chess_opening", 44012, 4);
    const wrongMove = getStrategyLegalMoves(rounds[1]).find((move) => !isStrategySolutionMove(rounds[1], move));

    expect(wrongMove).toBeDefined();

    const progress = evaluatePuzzleSubmission("chess_opening", 44012, 4, {
      kind: "chess_opening",
      moves: [
        { from: rounds[0].solutions[0].from, to: rounds[0].solutions[0].to },
        { from: wrongMove!.from, to: wrongMove!.to },
      ],
    });

    expect(progress).toBe(10);
  });
});
