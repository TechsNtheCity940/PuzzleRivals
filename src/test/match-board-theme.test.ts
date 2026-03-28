import { describe, expect, it } from "vitest";
import type { MatchPlayablePuzzleType } from "@/lib/backend";
import {
  getNeonPuzzleThemeCategory,
  getNeonPuzzleThemeDefinition,
  NEON_PUZZLE_THEME_DEFINITIONS,
  PUZZLE_THEME_CATEGORY_BY_TYPE,
} from "@/lib/match-board-theme";

const ALL_PUZZLE_TYPES: MatchPlayablePuzzleType[] = [
  "rotate_pipes",
  "number_grid",
  "pattern_match",
  "word_scramble",
  "crossword_mini",
  "tile_slide",
  "sudoku_mini",
  "word_search",
  "matching_pairs",
  "spatial_reasoning",
  "maze",
  "pathfinder",
  "memory_grid",
  "riddle_choice",
  "wordle_guess",
  "chess_tactic",
  "checkers_tactic",
  "logic_sequence",
  "trivia_blitz",
  "geography_quiz",
  "science_quiz",
  "math_race",
  "code_breaker",
  "analogies",
  "deduction_grid",
  "chess_endgame",
  "chess_opening",
  "chess_mate_net",
  "vocabulary_duel",
];

describe("neon puzzle board theme registry", () => {
  it("maps every playable puzzle type into a neon board category", () => {
    for (const puzzleType of ALL_PUZZLE_TYPES) {
      expect(PUZZLE_THEME_CATEGORY_BY_TYPE[puzzleType]).toBeTruthy();
      expect(getNeonPuzzleThemeDefinition(puzzleType).puzzleTypes).toContain(puzzleType);
    }
  });

  it("keeps the requested category placements for season 1 boards", () => {
    expect(getNeonPuzzleThemeCategory("rotate_pipes")).toBe("pipe-path");
    expect(getNeonPuzzleThemeCategory("number_grid")).toBe("number-logic-grid");
    expect(getNeonPuzzleThemeCategory("pattern_match")).toBe("pattern-match");
    expect(getNeonPuzzleThemeCategory("word_scramble")).toBe("word-letter-grid");
    expect(getNeonPuzzleThemeCategory("tile_slide")).toBe("sliding-spatial");
    expect(getNeonPuzzleThemeCategory("maze")).toBe("maze-route");
    expect(getNeonPuzzleThemeCategory("memory_grid")).toBe("memory-recall");
    expect(getNeonPuzzleThemeCategory("riddle_choice")).toBe("quiz-choice");
    expect(getNeonPuzzleThemeCategory("code_breaker")).toBe("code-deduction");
    expect(getNeonPuzzleThemeCategory("chess_tactic")).toBe("chess-strategy");
  });

  it("exposes all ten reusable Neon Rivals board categories", () => {
    expect(Object.keys(NEON_PUZZLE_THEME_DEFINITIONS)).toHaveLength(10);
  });
});
