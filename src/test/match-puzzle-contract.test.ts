import { describe, expect, it } from "vitest";
import {
  buildMaze,
  buildMemoryGrid,
  buildPathfinder,
  buildWordle,
  getMazeProgress,
} from "@/lib/match-puzzle-contract";
import {
  buildMaze as buildBackendMaze,
  buildMemoryGrid as buildBackendMemoryGrid,
  buildPathfinder as buildBackendPathfinder,
  buildWordle as buildBackendWordle,
  getMazeProgress as getBackendMazeProgress,
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
});
