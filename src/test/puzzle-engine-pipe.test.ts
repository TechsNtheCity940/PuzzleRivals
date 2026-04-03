import { describe, expect, it } from "vitest";
import {
  checkPipeConnections,
  generatePipePuzzle,
  rotatePipeCell,
  type PipeCell,
} from "@/lib/puzzle-engine";

function cloneGrid(grid: PipeCell[][]) {
  return grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      connections: [...cell.connections],
    })),
  );
}

function hasSolvedConfiguration(grid: PipeCell[][]) {
  const positions = grid.flatMap((row, rowIndex) =>
    row.flatMap((cell, colIndex) =>
      cell.isSource || cell.isSink ? [] : [{ row: rowIndex, col: colIndex }],
    ),
  );

  function search(index: number, currentGrid: PipeCell[][]): boolean {
    if (index >= positions.length) {
      const checked = checkPipeConnections(cloneGrid(currentGrid));
      return checked.flat().every((cell) => cell.isConnected);
    }

    const { row, col } = positions[index];
    let candidate = { ...currentGrid[row][col], connections: [...currentGrid[row][col].connections] };
    for (let turns = 0; turns < 4; turns += 1) {
      const nextGrid = cloneGrid(currentGrid);
      nextGrid[row][col] = candidate;
      if (search(index + 1, nextGrid)) {
        return true;
      }
      candidate = rotatePipeCell(candidate);
    }

    return false;
  }

  return search(0, cloneGrid(grid));
}

describe("pipe puzzle engine", () => {
  it("rotates regular pipe cells clockwise and keeps locked endpoints fixed", () => {
    const freeCell: PipeCell = {
      type: "end",
      rotation: 0,
      connections: [true, false, false, false],
      isConnected: false,
    };
    const sourceCell: PipeCell = {
      ...freeCell,
      isSource: true,
    };

    const rotated = rotatePipeCell(freeCell);
    const locked = rotatePipeCell(sourceCell);

    expect(rotated.rotation).toBe(90);
    expect(rotated.connections).toEqual([false, true, false, false]);
    expect(locked.rotation).toBe(0);
    expect(locked.connections).toEqual([true, false, false, false]);
  });

  it("creates a source-to-sink pipe board with fixed endpoint tiles", () => {
    const grid = generatePipePuzzle(42, 4);
    const source = grid[0][0];
    const sink = grid[3][3];

    expect(source.isSource).toBe(true);
    expect(source.type).toBe("end");
    expect(source.connections.filter(Boolean)).toHaveLength(1);
    expect(sink.isSink).toBe(true);
    expect(sink.type).toBe("end");
    expect(sink.connections.filter(Boolean)).toHaveLength(1);
    expect(grid.flat().every((cell) => cell.type !== "empty")).toBe(true);
  });

  it("generates a solvable conduit network", () => {
    const grid = generatePipePuzzle(19, 3);
    expect(hasSolvedConfiguration(grid)).toBe(true);
  });
});
