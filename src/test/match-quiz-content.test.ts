import { describe, expect, it } from "vitest";
import { buildGeneratedQuizRounds } from "@/lib/match-quiz-content";
import { buildGeneratedQuizRounds as buildBackendGeneratedQuizRounds } from "../../supabase/functions/_shared/match-quiz-content.ts";

describe("match quiz generation", () => {
  it("builds ten rounds for quiz puzzle types without repeats in the same match", () => {
    const rounds = buildGeneratedQuizRounds("trivia_blitz", 14829, 3);

    expect(rounds.length).toBe(10);
    expect(new Set(rounds.map((round) => round.prompt)).size).toBe(rounds.length);
  });

  it("creates a large deterministic prompt pool across different seeds", () => {
    const prompts = new Set<string>();

    for (let seed = 100; seed < 140; seed += 1) {
      for (const round of buildGeneratedQuizRounds("trivia_blitz", seed, 4)) {
        prompts.add(round.prompt);
      }
    }

    expect(prompts.size).toBeGreaterThan(25);
  });

  it("is deterministic for the same seed and difficulty", () => {
    const first = buildGeneratedQuizRounds("geography_quiz", 88421, 4);
    const second = buildGeneratedQuizRounds("geography_quiz", 88421, 4);

    expect(second).toEqual(first);
    expect(first.length).toBe(10);
  });

  it("builds a full ten-round fixed strategy bank without prompt repeats", () => {
    const rounds = buildGeneratedQuizRounds("chess_mate_net", 44771, 4);

    expect(rounds.length).toBe(10);
    expect(new Set(rounds.map((round) => round.prompt)).size).toBe(10);
  });

  it("matches the authoritative backend quiz contract for the same seed", () => {
    const clientRounds = buildGeneratedQuizRounds("logic_sequence", 55421, 4);
    const backendRounds = buildBackendGeneratedQuizRounds("logic_sequence", 55421, 4);

    expect(clientRounds).toEqual(backendRounds);
  });
});
