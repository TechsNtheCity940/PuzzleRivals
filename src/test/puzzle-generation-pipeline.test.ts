import { RANKED_ARENA_PUZZLE_TYPES } from "../../shared/ranked-arena.ts";
import { createAuthoritativePuzzleSelection } from "../../supabase/functions/_shared/puzzle.ts";
import { generatePuzzleTemplate } from "../../supabase/functions/_shared/puzzle-generator.ts";

function createPlayer(overrides: Partial<Parameters<typeof generatePuzzleTemplate>[0]["players"][number]> = {}) {
  return {
    userId: "player-1",
    bestPuzzleType: "maze",
    worstPuzzleType: "rotate_pipes",
    rivalUserId: null,
    averageProgressByType: {
      rotate_pipes: 42,
      maze: 71,
      number_grid: 64,
    },
    matchesPlayedByType: {
      rotate_pipes: 8,
      maze: 5,
      number_grid: 3,
    },
    ...overrides,
  };
}

describe("supabase puzzle generation pipeline", () => {
  it("penalizes heavily repeated recent puzzle types", () => {
    const template = generatePuzzleTemplate({
      mode: "ranked",
      averageElo: 1800,
      players: [
        createPlayer(),
        createPlayer({ userId: "player-2", bestPuzzleType: "number_grid", worstPuzzleType: "pattern_match" }),
      ],
      recentPuzzleTypes: ["rotate_pipes", "rotate_pipes", "rotate_pipes", "maze"],
      selectionSeed: "lobby-ranked-seed",
    });

    expect(template.weights.rotate_pipes).toBeLessThan(template.weights.number_grid);
    expect(template.rationale.some((entry) => entry.includes("recent puzzle history"))).toBe(true);
  });

  it("adds a stronger cooldown for puzzle types recently used in the same mode", () => {
    const template = generatePuzzleTemplate({
      mode: "ranked",
      averageElo: 1800,
      players: [
        createPlayer(),
        createPlayer({ userId: "player-2", bestPuzzleType: "number_grid", worstPuzzleType: "pattern_match" }),
      ],
      recentPuzzleTypes: ["rotate_pipes", "maze"],
      sameModeRecentPuzzleTypes: ["rotate_pipes", "rotate_pipes", "number_grid"],
      selectionSeed: "ranked-mode-cooldown",
    });

    expect(template.weights.rotate_pipes).toBe(0);
    expect(template.weights.rotate_pipes).toBeLessThan(template.weights.number_grid);
    expect(template.rationale.some((entry) => entry.includes("same-mode cooldown"))).toBe(true);
  });

  it("keeps ranked primary selections inside the live arena pool", () => {
    const template = generatePuzzleTemplate({
      mode: "ranked",
      averageElo: 1900,
      players: [
        createPlayer(),
        createPlayer({ userId: "player-2", bestPuzzleType: "number_grid", worstPuzzleType: "pattern_match" }),
      ],
      recentPuzzleTypes: ["chess_tactic", "maze", "tile_slide"],
      sameModeRecentPuzzleTypes: ["chess_tactic", "maze", "tile_slide"],
      selectionSeed: "ranked-live-pool",
    });

    expect(RANKED_ARENA_PUZZLE_TYPES).toContain(template.primaryType);
    expect(template.weights.word_scramble).toBe(0);
    expect(template.weights.pattern_match).toBe(0);
  });

  it("produces the same template for the same seeded context", () => {
    const context = {
      mode: "challenge",
      averageElo: 1600,
      players: [
        createPlayer(),
        createPlayer({ userId: "player-2", bestPuzzleType: "number_grid", worstPuzzleType: "pattern_match" }),
      ],
      recentPuzzleTypes: ["rotate_pipes", "maze"],
      selectionSeed: "challenge-seed",
    } as const;

    const first = generatePuzzleTemplate(context);
    const second = generatePuzzleTemplate(context);

    expect(first).toEqual(second);
  });

  it("creates deterministic authoritative seeds for the same selection key", () => {
    const first = createAuthoritativePuzzleSelection(1900, "ranked", "maze", "lobby-1-round-2");
    const second = createAuthoritativePuzzleSelection(1900, "ranked", "maze", "lobby-1-round-2");

    expect(first.practiceSeed).toBe(second.practiceSeed);
    expect(first.liveSeed).toBe(second.liveSeed);
    expect(first.liveSeed).not.toBe(first.practiceSeed);
    expect(first.puzzleType).toBe("maze");
  });
});

