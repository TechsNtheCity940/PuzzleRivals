// Seeded PRNG for deterministic puzzle generation
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

// Pipe puzzle types
export type PipeDirection = "up" | "right" | "down" | "left";
export type PipeType = "straight" | "corner" | "tee" | "cross" | "end" | "empty";

export interface PipeCell {
  type: PipeType;
  rotation: number; // 0, 90, 180, 270
  connections: boolean[]; // [up, right, down, left] after rotation
  isSource?: boolean;
  isSink?: boolean;
  isConnected: boolean;
}

function getBaseConnections(type: PipeType): boolean[] {
  switch (type) {
    case "straight": return [true, false, true, false];
    case "corner": return [true, true, false, false];
    case "tee": return [true, true, false, true];
    case "cross": return [true, true, true, true];
    case "end": return [true, false, false, false];
    case "empty": return [false, false, false, false];
  }
}

function rotateConnections(conns: boolean[], rotation: number): boolean[] {
  const steps = (rotation / 90) % 4;
  const r = [...conns];
  for (let i = 0; i < steps; i++) {
    r.unshift(r.pop()!);
  }
  return r;
}

export function generatePipePuzzle(seed: number, size: number): PipeCell[][] {
  const rng = new SeededRandom(seed);
  const types: PipeType[] = ["straight", "corner", "tee", "end"];

  const grid: PipeCell[][] = [];
  for (let r = 0; r < size; r++) {
    const row: PipeCell[] = [];
    for (let c = 0; c < size; c++) {
      const type = types[rng.nextInt(0, types.length - 1)];
      const solvedRotation = rng.nextInt(0, 3) * 90;
      // Scramble rotation for the puzzle
      const scramble = rng.nextInt(0, 3) * 90;
      const baseConns = getBaseConnections(type);
      const conns = rotateConnections(baseConns, scramble);

      row.push({
        type,
        rotation: scramble,
        connections: conns,
        isConnected: false,
        isSource: r === 0 && c === 0,
        isSink: r === size - 1 && c === size - 1,
      });
    }
    grid.push(row);
  }

  return grid;
}

export function rotatePipeCell(cell: PipeCell): PipeCell {
  const newRotation = (cell.rotation + 90) % 360;
  const baseConns = getBaseConnections(cell.type);
  const newConns = rotateConnections(baseConns, newRotation);
  return { ...cell, rotation: newRotation, connections: newConns };
}

export function checkPipeConnections(grid: PipeCell[][]): PipeCell[][] {
  const size = grid.length;
  const visited = new Set<string>();
  const connected = new Set<string>();

  function flood(r: number, c: number) {
    const key = `${r},${c}`;
    if (visited.has(key)) return;
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    visited.add(key);
    connected.add(key);

    const cell = grid[r][c];
    const dirs = [[-1, 0, 0, 2], [0, 1, 1, 3], [1, 0, 2, 0], [0, -1, 3, 1]]; // [dr, dc, myDir, theirDir]
    for (const [dr, dc, myDir, theirDir] of dirs) {
      if (cell.connections[myDir]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (grid[nr][nc].connections[theirDir]) {
            flood(nr, nc);
          }
        }
      }
    }
  }

  // Start from source
  flood(0, 0);

  return grid.map((row, r) =>
    row.map((cell, c) => ({
      ...cell,
      isConnected: connected.has(`${r},${c}`),
    }))
  );
}
