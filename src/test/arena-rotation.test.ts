import { describe, expect, it } from "vitest";
import {
  appendArenaHistory,
  createArenaHistoryEntry,
  createFreshArenaSeed,
  pickNextArenaMode,
} from "@/game/config/arenaRotation";

describe("Arena rotation", () => {
  it("stores recent history with most-recent-first ordering", () => {
    const history = appendArenaHistory(
      [
        createArenaHistoryEntry("maze_rush", 2, 2),
        createArenaHistoryEntry("pipe_rush", 1, 1),
      ],
      createArenaHistoryEntry("memory_flash", 3, 3),
    );

    expect(history[0]?.mode).toBe("memory_flash");
    expect(history[1]?.mode).toBe("maze_rush");
  });

  it("biases the next board away from immediate repeats and same-family spam", () => {
    const history = [
      createArenaHistoryEntry("trivia_blitz", 101, 101),
      createArenaHistoryEntry("science_spark", 102, 102),
      createArenaHistoryEntry("riddle_relay", 103, 103),
      createArenaHistoryEntry("chess_shot", 104, 104),
    ];

    const nextMode = pickNextArenaMode({
      currentMode: "trivia_blitz",
      history,
      seedHint: 9001,
    });

    expect(nextMode).not.toBe("trivia_blitz");
    expect(["trivia_blitz", "science_spark", "riddle_relay"]).not.toContain(nextMode);
  });

  it("creates a fresh seed outside the recent seed window", () => {
    const history = [
      createArenaHistoryEntry("score_attack", 5000, 1),
      createArenaHistoryEntry("maze_rush", 5001, 2),
      createArenaHistoryEntry("tile_shift", 5002, 3),
    ];

    const freshSeed = createFreshArenaSeed(history, 5001);

    expect(freshSeed).not.toBe(5000);
    expect(freshSeed).not.toBe(5001);
    expect(freshSeed).not.toBe(5002);
  });
});
