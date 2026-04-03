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
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = this.nextInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

// Pipe puzzle types
export type PipeDirection = "up" | "right" | "down" | "left";
export type PipeType = "straight" | "corner" | "tee" | "cross" | "end" | "empty";

type DirectionIndex = 0 | 1 | 2 | 3;

const DIRECTION_STEPS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

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
    case "straight":
      return [true, false, true, false];
    case "corner":
      return [true, true, false, false];
    case "tee":
      return [true, true, false, true];
    case "cross":
      return [true, true, true, true];
    case "end":
      return [true, false, false, false];
    case "empty":
      return [false, false, false, false];
  }
}

function rotateConnections(connections: boolean[], rotation: number): boolean[] {
  const steps = ((rotation / 90) % 4 + 4) % 4;
  const rotated = [...connections];
  for (let i = 0; i < steps; i += 1) {
    rotated.unshift(rotated.pop()!);
  }
  return rotated;
}

function connectionsEqual(left: boolean[], right: boolean[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function oppositeDirection(direction: DirectionIndex): DirectionIndex {
  return ((direction + 2) % 4) as DirectionIndex;
}

function createSolvedConnections(size: number) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [false, false, false, false] as boolean[]),
  );
}

function keyForCell(row: number, col: number) {
  return `${row},${col}`;
}

function inBounds(size: number, row: number, col: number) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

function addEdge(
  solvedConnections: boolean[][][],
  row: number,
  col: number,
  direction: DirectionIndex,
) {
  const [rowDelta, colDelta] = DIRECTION_STEPS[direction];
  const nextRow = row + rowDelta;
  const nextCol = col + colDelta;
  if (!inBounds(solvedConnections.length, nextRow, nextCol)) {
    return;
  }

  solvedConnections[row][col][direction] = true;
  solvedConnections[nextRow][nextCol][oppositeDirection(direction)] = true;
}

function buildRandomSourceToSinkPath(size: number, rng: SeededRandom) {
  const targetRow = size - 1;
  const targetCol = size - 1;
  const visited = new Set<string>([keyForCell(0, 0)]);
  const path: Array<[number, number]> = [[0, 0]];

  function dfs(row: number, col: number): boolean {
    if (row === targetRow && col === targetCol) {
      return true;
    }

    const candidates = rng
      .shuffle(
        DIRECTION_STEPS.map(([rowDelta, colDelta], direction) => ({
          direction: direction as DirectionIndex,
          nextRow: row + rowDelta,
          nextCol: col + colDelta,
        })),
      )
      .filter(({ nextRow, nextCol }) => {
        if (!inBounds(size, nextRow, nextCol)) {
          return false;
        }
        return !visited.has(keyForCell(nextRow, nextCol));
      })
      .sort((left, right) => {
        const leftDistance = Math.abs(targetRow - left.nextRow) + Math.abs(targetCol - left.nextCol);
        const rightDistance = Math.abs(targetRow - right.nextRow) + Math.abs(targetCol - right.nextCol);
        return leftDistance - rightDistance;
      });

    for (const candidate of candidates) {
      visited.add(keyForCell(candidate.nextRow, candidate.nextCol));
      path.push([candidate.nextRow, candidate.nextCol]);
      if (dfs(candidate.nextRow, candidate.nextCol)) {
        return true;
      }
      path.pop();
      visited.delete(keyForCell(candidate.nextRow, candidate.nextCol));
    }

    return false;
  }

  dfs(0, 0);
  return path;
}

function getPipeTypeForConnections(connections: boolean[]): PipeType {
  const count = connections.filter(Boolean).length;
  if (count <= 0) {
    return "empty";
  }
  if (count === 1) {
    return "end";
  }
  if (count === 2) {
    return connections[0] === connections[2] || connections[1] === connections[3]
      ? "straight"
      : "corner";
  }
  if (count === 3) {
    return "tee";
  }
  return "cross";
}

function getSolvedRotation(type: PipeType, solvedConnections: boolean[]) {
  const baseConnections = getBaseConnections(type);
  for (const rotation of [0, 90, 180, 270]) {
    if (connectionsEqual(rotateConnections(baseConnections, rotation), solvedConnections)) {
      return rotation;
    }
  }
  return 0;
}

function getScrambledRotation(
  rng: SeededRandom,
  type: PipeType,
  solvedConnections: boolean[],
  lockRotation: boolean,
) {
  const solvedRotation = getSolvedRotation(type, solvedConnections);
  if (lockRotation) {
    return solvedRotation;
  }

  const baseConnections = getBaseConnections(type);
  const candidates = [0, 90, 180, 270].filter(
    (rotation) => !connectionsEqual(rotateConnections(baseConnections, rotation), solvedConnections),
  );

  if (candidates.length === 0) {
    return solvedRotation;
  }

  return candidates[rng.nextInt(0, candidates.length - 1)];
}

export function generatePipePuzzle(seed: number, size: number): PipeCell[][] {
  const rng = new SeededRandom(seed);
  const solvedConnections = createSolvedConnections(size);
  const path = buildRandomSourceToSinkPath(size, rng);
  const visited = new Set<string>();

  for (let index = 0; index < path.length; index += 1) {
    const [row, col] = path[index];
    visited.add(keyForCell(row, col));
    if (index < path.length - 1) {
      const [nextRow, nextCol] = path[index + 1];
      const direction = DIRECTION_STEPS.findIndex(
        ([rowDelta, colDelta]) => row + rowDelta === nextRow && col + colDelta === nextCol,
      ) as DirectionIndex;
      addEdge(solvedConnections, row, col, direction);
    }
  }

  while (visited.size < size * size) {
    const preferredFrontier: Array<[number, number, DirectionIndex]> = [];
    const endpointFrontier: Array<[number, number, DirectionIndex]> = [];

    for (const key of visited) {
      const [rowText, colText] = key.split(",");
      const row = Number(rowText);
      const col = Number(colText);
      const isEndpoint = (row === 0 && col === 0) || (row === size - 1 && col === size - 1);

      DIRECTION_STEPS.forEach(([rowDelta, colDelta], direction) => {
        const nextRow = row + rowDelta;
        const nextCol = col + colDelta;
        if (!inBounds(size, nextRow, nextCol)) {
          return;
        }
        if (visited.has(keyForCell(nextRow, nextCol))) {
          return;
        }

        const edge: [number, number, DirectionIndex] = [row, col, direction as DirectionIndex];
        if (isEndpoint) {
          endpointFrontier.push(edge);
        } else {
          preferredFrontier.push(edge);
        }
      });
    }

    const pool = preferredFrontier.length > 0 ? preferredFrontier : endpointFrontier;
    const [row, col, direction] = pool[rng.nextInt(0, pool.length - 1)];
    const [rowDelta, colDelta] = DIRECTION_STEPS[direction];
    const nextRow = row + rowDelta;
    const nextCol = col + colDelta;

    addEdge(solvedConnections, row, col, direction);
    visited.add(keyForCell(nextRow, nextCol));
  }

  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => {
      const solvedCellConnections = solvedConnections[row][col];
      const type = getPipeTypeForConnections(solvedCellConnections);
      const isSource = row === 0 && col === 0;
      const isSink = row === size - 1 && col === size - 1;
      const rotation = getScrambledRotation(rng, type, solvedCellConnections, isSource || isSink);

      return {
        type,
        rotation,
        connections: rotateConnections(getBaseConnections(type), rotation),
        isConnected: false,
        isSource,
        isSink,
      } satisfies PipeCell;
    }),
  );
}

export function rotatePipeCell(cell: PipeCell): PipeCell {
  if (cell.isSource || cell.isSink) {
    return { ...cell };
  }

  const newRotation = (cell.rotation + 90) % 360;
  const baseConnections = getBaseConnections(cell.type);
  const newConnections = rotateConnections(baseConnections, newRotation);
  return { ...cell, rotation: newRotation, connections: newConnections };
}

export function checkPipeConnections(grid: PipeCell[][]): PipeCell[][] {
  const size = grid.length;
  const visited = new Set<string>();
  const connected = new Set<string>();

  function flood(row: number, col: number) {
    const key = keyForCell(row, col);
    if (visited.has(key)) {
      return;
    }
    if (!inBounds(size, row, col)) {
      return;
    }

    visited.add(key);
    connected.add(key);

    const cell = grid[row][col];
    DIRECTION_STEPS.forEach(([rowDelta, colDelta], direction) => {
      const nextRow = row + rowDelta;
      const nextCol = col + colDelta;
      const opposite = oppositeDirection(direction as DirectionIndex);

      if (!cell.connections[direction]) {
        return;
      }
      if (!inBounds(size, nextRow, nextCol)) {
        return;
      }
      if (!grid[nextRow][nextCol].connections[opposite]) {
        return;
      }

      flood(nextRow, nextCol);
    });
  }

  flood(0, 0);

  return grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      ...cell,
      isConnected: connected.has(keyForCell(rowIndex, colIndex)),
    })),
  );
}
