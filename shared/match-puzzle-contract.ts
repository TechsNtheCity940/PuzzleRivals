export interface MazeCell {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface MazePuzzle {
  size: number;
  cells: MazeCell[];
  goalIndex: number;
}

export interface PathfinderPuzzle {
  size: number;
  blocked: number[];
  solutionPath: number[];
}

export interface MemoryGridPuzzle {
  size: number;
  targets: number[];
}

const WORDLE_BANK = ["SPARK", "BRAIN", "QUEST", "PRISM", "CROWN", "ORBIT", "GLINT", "SHARD"];

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(items: T[]) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(0, index);
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildPathfinder(seed: number, difficulty: number): PathfinderPuzzle {
  const rng = new SeededRandom(seed);
  const size = difficulty >= 4 ? 7 : 6;
  const pathLength = size + 3 + difficulty;
  const blocked = new Set<number>();
  const solutionPath = [0];
  let current = 0;

  while (solutionPath.length < pathLength && current !== size * size - 1) {
    const row = Math.floor(current / size);
    const col = current % size;
    const candidates = rng.shuffle([
      row < size - 1 ? current + size : -1,
      col < size - 1 ? current + 1 : -1,
      row > 0 ? current - size : -1,
      col > 0 ? current - 1 : -1,
    ]).filter((next) => next >= 0 && !solutionPath.includes(next));

    if (candidates.length === 0) break;

    current = candidates[0];
    solutionPath.push(current);
  }

  if (solutionPath[solutionPath.length - 1] !== size * size - 1) {
    let cursor = solutionPath[solutionPath.length - 1];
    while (cursor % size < size - 1) {
      cursor += 1;
      if (!solutionPath.includes(cursor)) solutionPath.push(cursor);
    }
    while (cursor < size * (size - 1)) {
      cursor += size;
      if (!solutionPath.includes(cursor)) solutionPath.push(cursor);
    }
  }

  for (let index = 0; index < size * size; index += 1) {
    if (!solutionPath.includes(index) && rng.next() > 0.28) {
      blocked.add(index);
    }
  }

  blocked.delete(0);
  blocked.delete(size * size - 1);
  return { size, blocked: [...blocked], solutionPath };
}

export function buildMaze(seed: number, difficulty: number): MazePuzzle {
  const rng = new SeededRandom(seed);
  const size = Math.min(7, Math.max(5, difficulty + 3));
  const cells = Array.from({ length: size * size }, () => ({ top: true, right: true, bottom: true, left: true }));
  const visited = new Set<number>();

  function carve(index: number) {
    visited.add(index);
    const row = Math.floor(index / size);
    const col = index % size;
    const neighbors = rng.shuffle([
      { next: row > 0 ? index - size : -1, wall: "top", opposite: "bottom" },
      { next: col < size - 1 ? index + 1 : -1, wall: "right", opposite: "left" },
      { next: row < size - 1 ? index + size : -1, wall: "bottom", opposite: "top" },
      { next: col > 0 ? index - 1 : -1, wall: "left", opposite: "right" },
    ]);

    for (const neighbor of neighbors) {
      if (neighbor.next < 0 || visited.has(neighbor.next)) continue;
      cells[index][neighbor.wall as keyof MazeCell] = false;
      cells[neighbor.next][neighbor.opposite as keyof MazeCell] = false;
      carve(neighbor.next);
    }
  }

  carve(0);
  return { size, cells, goalIndex: size * size - 1 };
}

export function canMoveInMaze(maze: MazePuzzle, fromIndex: number, toIndex: number) {
  const from = maze.cells[fromIndex];
  const delta = toIndex - fromIndex;
  if (delta === -maze.size) return !from.top;
  if (delta === 1) return !from.right;
  if (delta === maze.size) return !from.bottom;
  if (delta === -1) return !from.left;
  return false;
}

export function getMazeProgress(maze: MazePuzzle, position: number) {
  if (position < 0 || position >= maze.cells.length) return 0;
  const visited = new Set<number>([0]);
  const queue = [{ index: 0, distance: 0 }];
  let distanceToGoal = 0;
  let distanceToPosition: number | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.index === maze.goalIndex) distanceToGoal = current.distance;
    if (current.index === position) distanceToPosition = current.distance;

    for (const nextIndex of [current.index - maze.size, current.index + 1, current.index + maze.size, current.index - 1]) {
      if (nextIndex < 0 || nextIndex >= maze.cells.length || visited.has(nextIndex)) continue;
      if (!canMoveInMaze(maze, current.index, nextIndex)) continue;
      visited.add(nextIndex);
      queue.push({ index: nextIndex, distance: current.distance + 1 });
    }
  }

  if (distanceToPosition === null || distanceToGoal === 0) return 0;
  return clampProgress((distanceToPosition / distanceToGoal) * 100);
}

export function buildMemoryGrid(seed: number, difficulty: number): MemoryGridPuzzle {
  const rng = new SeededRandom(seed);
  return {
    size: 4,
    targets: rng.shuffle(Array.from({ length: 16 }, (_, index) => index)).slice(0, Math.min(7, Math.max(4, difficulty + 2))),
  };
}

export function buildWordle(seed: number) {
  const rng = new SeededRandom(seed);
  return WORDLE_BANK[rng.nextInt(0, WORDLE_BANK.length - 1)];
}
