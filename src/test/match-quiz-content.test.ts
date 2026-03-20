import { describe, expect, it } from "vitest";
import { buildGeneratedQuizRounds } from "@/lib/match-quiz-content";
import { buildGeneratedQuizRounds as buildBackendGeneratedQuizRounds } from "../../supabase/functions/_shared/match-quiz-content.ts";

describe("match quiz generation", () => {
  it("builds more than three rounds for quiz puzzle types", () => {
    const rounds = buildGeneratedQuizRounds("trivia_blitz", 14829, 3);

    expect(rounds).toHaveLength(4);
    expect(new Set(rounds.map((round) => round.prompt)).size).toBe(rounds.length);
  });

  it("is deterministic for the same seed and difficulty", () => {
    const first = buildGeneratedQuizRounds("geography_quiz", 88421, 4);
    const second = buildGeneratedQuizRounds("geography_quiz", 88421, 4);

    expect(second).toEqual(first);
    expect(first).toHaveLength(5);
  });

  it("matches the authoritative backend quiz contract for the same seed", () => {
    const clientRounds = buildGeneratedQuizRounds("logic_sequence", 55421, 4);
    const backendRounds = buildBackendGeneratedQuizRounds("logic_sequence", 55421, 4);

    expect(clientRounds).toEqual(backendRounds);
  });
});
