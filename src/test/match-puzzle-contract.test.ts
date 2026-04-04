import { describe, expect, it } from "vitest";
import {
  buildCrosswordMini,
  buildLinkLock,
  buildMatchingPairs,
  buildMaze,
  buildMirrorMaze,
  buildMemoryGrid,
  buildNumberGrid,
  buildPathfinder,
  buildPatternRounds,
  buildSpatialRounds,
  buildSudokuMini,
  evaluateLinkLockPaths,
  evaluateMirrorMazeState,
  buildTilePuzzle,
  buildWordScramble,
  buildWordSearch,
  buildWordle,
  getMazeProgress,
  isTilePuzzleSolved,
  normalizeSegment,
  traceMirrorBeam,
} from "@/lib/match-puzzle-contract";
import {
  buildCrosswordMini as buildBackendCrosswordMini,
  buildLinkLock as buildBackendLinkLock,
  buildMatchingPairs as buildBackendMatchingPairs,
  buildMaze as buildBackendMaze,
  buildMirrorMaze as buildBackendMirrorMaze,
  buildMemoryGrid as buildBackendMemoryGrid,
  buildNumberGrid as buildBackendNumberGrid,
  buildPathfinder as buildBackendPathfinder,
  buildPatternRounds as buildBackendPatternRounds,
  buildSpatialRounds as buildBackendSpatialRounds,
  buildSudokuMini as buildBackendSudokuMini,
  evaluateLinkLockPaths as evaluateBackendLinkLockPaths,
  evaluateMirrorMazeState as evaluateBackendMirrorMazeState,
  buildTilePuzzle as buildBackendTilePuzzle,
  buildWordScramble as buildBackendWordScramble,
  buildWordSearch as buildBackendWordSearch,
  buildWordle as buildBackendWordle,
  getMazeProgress as getBackendMazeProgress,
  isTilePuzzleSolved as isBackendTilePuzzleSolved,
  normalizeSegment as normalizeBackendSegment,
  traceMirrorBeam as traceBackendMirrorBeam,
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

  it("matches the authoritative backend pattern and spatial contracts", () => {
    expect(buildPatternRounds(48211, 4)).toEqual(buildBackendPatternRounds(48211, 4));
    expect(buildSpatialRounds(71643, 3)).toEqual(buildBackendSpatialRounds(71643, 3));
  });

  it("matches the authoritative backend tile-slide contract and solved-state logic", () => {
    const clientPuzzle = buildTilePuzzle(55412, 4);
    const backendPuzzle = buildBackendTilePuzzle(55412, 4);

    expect(clientPuzzle).toEqual(backendPuzzle);
    expect(isTilePuzzleSolved([1, 2, 3, 4, 5, 6, 7, 8, 0])).toBe(true);
    expect(isTilePuzzleSolved(clientPuzzle.tiles)).toBe(isBackendTilePuzzleSolved(backendPuzzle.tiles));
  });

  it("normalizes word-search segments the same way as the backend", () => {
    expect(normalizeSegment(12, 4)).toBe(normalizeBackendSegment(12, 4));
    expect(normalizeSegment(4, 12)).toBe("4:12");
  });

  it("matches the authoritative backend link-lock contract and path evaluation", () => {
    const clientPuzzle = buildLinkLock(81231, 4);
    const backendPuzzle = buildBackendLinkLock(81231, 4);

    expect(clientPuzzle).toEqual(backendPuzzle);

    const submission = clientPuzzle.pairs.map((pair) => ({
      pairId: pair.pairId,
      cells: [...pair.guidePath],
    }));

    expect(evaluateLinkLockPaths(clientPuzzle, submission)).toEqual(
      evaluateBackendLinkLockPaths(backendPuzzle, submission),
    );
    expect(evaluateLinkLockPaths(clientPuzzle, submission).solved).toBe(true);
  });

  it("matches the authoritative backend mirror-maze contract and beam tracing", () => {
    const clientPuzzle = buildMirrorMaze(54001, 4);
    const backendPuzzle = buildBackendMirrorMaze(54001, 4);

    expect(clientPuzzle).toEqual(backendPuzzle);
    expect(traceMirrorBeam(clientPuzzle)).toEqual(traceBackendMirrorBeam(backendPuzzle));

    const solvedRotations = clientPuzzle.cells.map((cell) => cell.rotation);
    expect(evaluateMirrorMazeState(clientPuzzle, solvedRotations)).toEqual(
      evaluateBackendMirrorMazeState(backendPuzzle, solvedRotations),
    );
  });
});
