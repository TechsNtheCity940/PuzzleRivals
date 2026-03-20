import { describe, expect, it } from "vitest";
import {
  buildCrosswordMini,
  buildMatchingPairs,
  buildMaze,
  buildMemoryGrid,
  buildNumberGrid,
  buildPathfinder,
  buildSudokuMini,
  buildWordScramble,
  buildWordSearch,
  buildWordle,
  getMazeProgress,
  normalizeSegment,
} from "@/lib/match-puzzle-contract";
import {
  buildCrosswordMini as buildBackendCrosswordMini,
  buildMatchingPairs as buildBackendMatchingPairs,
  buildMaze as buildBackendMaze,
  buildMemoryGrid as buildBackendMemoryGrid,
  buildNumberGrid as buildBackendNumberGrid,
  buildPathfinder as buildBackendPathfinder,
  buildSudokuMini as buildBackendSudokuMini,
  buildWordScramble as buildBackendWordScramble,
  buildWordSearch as buildBackendWordSearch,
  buildWordle as buildBackendWordle,
  getMazeProgress as getBackendMazeProgress,
  normalizeSegment as normalizeBackendSegment,
} from "../../supabase/functions/_shared/match-puzzle-contract.ts";

describe("match puzzle contract", () => {
  it("matches the authoritative backend maze contract and progress scoring", () => {
    const clientMaze = buildMaze(44921, 4);
    const backendMaze = buildBackendMaze(44921, 4);

    expect(clientMaze).toEqual(backendMaze);
    expect(getMazeProgress(clientMaze, 0)).toBe(0);
    expect(getMazeProgress(clientMaze, clientMaze.goalIndex)).toBe(100);
    expect(getMazeProgress(clientMaze, clientMaze.goalIndex)).toBe(
      getBackendMazeProgress(backendMaze, backendMaze.goalIndex),
    );
  });

  it("matches the authoritative backend pathfinder and memory contracts", () => {
    expect(buildPathfinder(66112, 3)).toEqual(buildBackendPathfinder(66112, 3));
    expect(buildMemoryGrid(77102, 2)).toEqual(buildBackendMemoryGrid(77102, 2));
  });

  it("matches the authoritative backend word target for wordle rounds", () => {
    expect(buildWordle(98231)).toBe(buildBackendWordle(98231));
  });

  it("matches the authoritative backend word-search and sudoku contracts", () => {
    expect(buildWordSearch(28371, 4)).toEqual(buildBackendWordSearch(28371, 4));
    expect(buildSudokuMini(11827, 3)).toEqual(buildBackendSudokuMini(11827, 3));
  });

  it("matches the authoritative backend number, scramble, crossword, and pair contracts", () => {
    expect(buildNumberGrid(21543, 4)).toEqual(buildBackendNumberGrid(21543, 4));
    expect(buildWordScramble(61521, 3)).toEqual(buildBackendWordScramble(61521, 3));
    expect(buildCrosswordMini(93125, 4)).toEqual(buildBackendCrosswordMini(93125, 4));
    expect(buildMatchingPairs(81124, 3)).toEqual(buildBackendMatchingPairs(81124, 3));
  });

  it("normalizes word-search segments the same way as the backend", () => {
    expect(normalizeSegment(12, 4)).toBe(normalizeBackendSegment(12, 4));
    expect(normalizeSegment(4, 12)).toBe("4:12");
  });
});
