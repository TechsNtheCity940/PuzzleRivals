import { describe, expect, it } from "vitest";
import {
  buildNeonRivalsObjective,
  createInitialGameState,
  getObjectiveProgressPercent,
  getObjectiveValue,
} from "@/game/config/runModes";

describe("Neon Rivals run modes", () => {
  it("creates deterministic color-hunt targets from the seed", () => {
    const first = buildNeonRivalsObjective("color_hunt", 101);
    const second = buildNeonRivalsObjective("color_hunt", 101);

    expect(first.targetColor).toBe(second.targetColor);
    expect(first.targetColorLabel).toBe(second.targetColorLabel);
  });

  it("tracks combo-rush progress from the peak combo instead of score", () => {
    const objective = buildNeonRivalsObjective("combo_rush", 22);
    const progress = getObjectiveValue(objective, {
      score: 3200,
      maxCombo: 4,
      matchedTiles: 30,
      objectiveValue: 0,
      clearedByColor: {},
    });

    expect(progress).toBe(4);
    expect(getObjectiveProgressPercent(progress, objective.targetValue)).toBe(100);
  });

  it("hydrates initial game state from the selected run mode", () => {
    const state = createInitialGameState("clear_rush", 44);

    expect(state.mode).toBe("clear_rush");
    expect(state.movesLeft).toBe(14);
    expect(state.objectiveTarget).toBe(42);
    expect(state.status).toBe("booting");
  });

  it("creates maze-rush state with a maze board family and step budget", () => {
    const objective = buildNeonRivalsObjective("maze_rush", 73);
    const state = createInitialGameState("maze_rush", 73);

    expect(objective.boardFamily).toBe("maze");
    expect(objective.resourceLabel).toBe("steps");
    expect(state.boardFamily).toBe("maze");
    expect(state.movesLeft).toBe(objective.startingMoves);
    expect(state.objectiveTarget).toBe(100);
  });

  it("creates pipe and tile arena states with their own board families", () => {
    const pipeObjective = buildNeonRivalsObjective("pipe_rush", 91);
    const circuitObjective = buildNeonRivalsObjective("circuit_clash", 93);
    const tileState = createInitialGameState("tile_shift", 88);

    expect(pipeObjective.boardFamily).toBe("pipe");
    expect(pipeObjective.targetValue).toBe(100);
    expect(circuitObjective.boardFamily).toBe("pipe");
    expect(circuitObjective.title).toBe("Circuit Clash");
    expect(tileState.boardFamily).toBe("tile");
    expect(tileState.movesLeft).toBe(28);
  });

  it("creates link and mirror arena states with dedicated board families", () => {
    const linkObjective = buildNeonRivalsObjective("link_lock", 84);
    const mirrorState = createInitialGameState("mirror_maze", 71);

    expect(linkObjective.boardFamily).toBe("link");
    expect(linkObjective.startingMoves).toBe(16);
    expect(linkObjective.targetValue).toBe(100);
    expect(mirrorState.boardFamily).toBe("mirror");
    expect(mirrorState.movesLeft).toBe(14);
    expect(mirrorState.objectiveTarget).toBe(100);
  });

  it("creates number and spatial arena states with dedicated board families", () => {
    const numberObjective = buildNeonRivalsObjective("number_crunch", 35);
    const spatialState = createInitialGameState("spatial_spin", 19);

    expect(numberObjective.boardFamily).toBe("number");
    expect(numberObjective.startingMoves).toBe(18);
    expect(numberObjective.targetValue).toBe(100);
    expect(spatialState.boardFamily).toBe("spatial");
    expect(spatialState.movesLeft).toBe(14);
    expect(spatialState.objectiveTarget).toBe(100);
  });

  it("creates strategy arena states for chess and checkers lanes", () => {
    const chessObjective = buildNeonRivalsObjective("chess_shot", 77);
    const checkersState = createInitialGameState("checkers_trap", 91);

    expect(chessObjective.boardFamily).toBe("strategy");
    expect(chessObjective.startingMoves).toBe(14);
    expect(checkersState.boardFamily).toBe("strategy");
    expect(checkersState.movesLeft).toBe(14);
    expect(checkersState.objectiveTarget).toBe(100);
  });

  it("creates additional strategy, quiz, memory, and glyph states", () => {
    const endgameObjective = buildNeonRivalsObjective("chess_endgame", 52);
    const quizObjective = buildNeonRivalsObjective("science_spark", 44);
    const memoryState = createInitialGameState("memory_flash", 61);
    const glyphObjective = buildNeonRivalsObjective("glyph_rush", 63);

    expect(endgameObjective.boardFamily).toBe("strategy");
    expect(endgameObjective.title).toBe("Chess Endgame");
    expect(quizObjective.boardFamily).toBe("quiz");
    expect(quizObjective.startingMoves).toBe(14);
    expect(memoryState.boardFamily).toBe("memory");
    expect(memoryState.resourceLabel).toBe("attempts");
    expect(glyphObjective.boardFamily).toBe("glyph");
    expect(glyphObjective.startingMoves).toBe(14);
    expect(glyphObjective.targetScore).toBe(1840);
  });
});
