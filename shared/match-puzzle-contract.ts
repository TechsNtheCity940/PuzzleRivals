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

export interface NumberGridPuzzle {
  size: number;
  grid: (number | null)[];
  solution: number[];
  rowSums: number[];
  colSums: number[];
}

export interface CrosswordEntry {
  clue: string;
  answer: string;
}

export interface MatchingPair {
  pairId: number;
  left: string;
  right: string;
}

export interface TilePuzzle {
  size: number;
  tiles: number[];
}

export type PatternShape = "circle" | "square" | "triangle" | "diamond";

export interface PatternItem {
  shape: PatternShape;
  color: string;
}

export interface PatternRound {
  pattern: PatternItem[];
  missingIndex: number;
  options: PatternItem[];
  correctOption: number;
}

export type ShapeCells = Array<[number, number]>;

export interface SpatialRound {
  base: ShapeCells;
  options: ShapeCells[];
  correctOption: number;
  instruction: string;
}

export interface SudokuPuzzle {
  puzzle: (number | null)[];
  solution: number[];
}

export interface WordSearchPlacement {
  word: string;
  start: number;
  end: number;
  cells: number[];
}

export interface WordSearchPuzzle {
  size: number;
  grid: string[];
  placements: WordSearchPlacement[];
}

const WORDLE_BANK = ["SPARK", "BRAIN", "QUEST", "PRISM", "CROWN", "ORBIT", "GLINT", "SHARD"];
const WORD_BANK = [
  "BRAIN", "SPEED", "QUICK", "FLASH", "POWER", "SMART", "BLAZE", "STORM",
  "CLASH", "RIVAL", "CROWN", "DREAM", "FLAME", "GLEAM", "HEART", "JOLTS",
  "KNACK", "LEMON", "MANGO", "NERVE", "ORBIT", "PRISM", "QUEST", "REIGN",
  "PIXEL", "DRIFT", "SPARK", "CHASE", "PULSE", "TIGER", "GIANT", "NOBLE",
];
const CROSSWORD_BANK: CrosswordEntry[] = [
  { clue: "Fast-thinking organ", answer: "BRAIN" },
  { clue: "A clue-solving contest can feel like a ____", answer: "RACE" },
  { clue: "A hidden way through a puzzle grid", answer: "PATH" },
  { clue: "A collection of letters that forms a word", answer: "ANAGRAM" },
  { clue: "A board game with rooks and bishops", answer: "CHESS" },
  { clue: "A puzzle hint might narrow the ____", answer: "FIELD" },
  { clue: "A dead-end corridor inside a labyrinth", answer: "MAZE" },
  { clue: "A relation between two similar ideas", answer: "ANALOGY" },
  { clue: "What you do to a jumbled word", answer: "UNSCRAMBLE" },
  { clue: "A shape turned around in space", answer: "ROTATION" },
  { clue: "A list of facts that leads to one answer", answer: "LOGIC" },
  { clue: "The hidden answer inside a riddle", answer: "SOLUTION" },
];
const MATCHING_PAIR_BANK = [
  ["Mercury", "Planet closest to the sun"],
  ["Rook", "Chess piece that moves in straight lines"],
  ["Anagram", "Word made by rearranging letters"],
  ["Seismograph", "Tool that records earthquakes"],
  ["Ottawa", "Capital of Canada"],
  ["Opposition", "Key king-and-pawn endgame concept"],
  ["Diagonal", "A line that slants across a grid"],
  ["Square", "Shape with four equal sides"],
  ["Cipher", "Secret code system"],
  ["Vertex", "Corner point of a shape"],
  ["Sahara", "Largest hot desert in Africa"],
  ["Canberra", "Capital of Australia"],
];
const SPATIAL_BASE_SHAPES: ShapeCells[] = [
  [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[1, 0], [0, 1], [1, 1], [1, 2]],
];
const PATTERN_SHAPES: PatternShape[] = ["circle", "square", "triangle", "diamond"];
const PATTERN_COLORS = [
  "hsl(72 100% 50%)",
  "hsl(269 100% 58%)",
  "hsl(0 100% 65%)",
  "hsl(200 100% 60%)",
  "hsl(45 100% 55%)",
];
const WORD_SEARCH_WORD_BANK = [
  "BRAIN", "QUEST", "SPARK", "GRID", "LOGIC", "MAZE", "ROOK", "CROWN",
  "TRACE", "MATCH", "CLUE", "SWIFT", "SHAPE", "TILES", "TOKEN", "PATH",
];

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

export function normalizeSegment(start: number, end: number) {
  return start <= end ? `${start}:${end}` : `${end}:${start}`;
}

export function buildWordSearch(seed: number, difficulty: number): WordSearchPuzzle {
  const rng = new SeededRandom(seed);
  const size = difficulty >= 4 ? 7 : 6;
  const totalWords = Math.min(4, Math.max(3, difficulty));
  const words = rng.shuffle(WORD_SEARCH_WORD_BANK.filter((word) => word.length <= size)).slice(0, totalWords);
  const grid = Array.from({ length: size * size }, () => "");
  const placements: WordSearchPlacement[] = [];
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (const word of words) {
    let placed = false;
    for (let attempt = 0; attempt < 80 && !placed; attempt += 1) {
      const direction = directions[rng.nextInt(0, directions.length - 1)];
      const startRow = rng.nextInt(0, size - 1);
      const startCol = rng.nextInt(0, size - 1);
      const endRow = startRow + direction.dr * (word.length - 1);
      const endCol = startCol + direction.dc * (word.length - 1);
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;

      const cells: number[] = [];
      let valid = true;
      for (let step = 0; step < word.length; step += 1) {
        const row = startRow + direction.dr * step;
        const col = startCol + direction.dc * step;
        const index = row * size + col;
        const letter = word[step];
        if (grid[index] && grid[index] !== letter) {
          valid = false;
          break;
        }
        cells.push(index);
      }
      if (!valid) continue;

      cells.forEach((index, step) => {
        grid[index] = word[step];
      });
      placements.push({ word, start: cells[0], end: cells[cells.length - 1], cells });
      placed = true;
    }
  }

  for (let index = 0; index < grid.length; index += 1) {
    if (!grid[index]) {
      grid[index] = String.fromCharCode(65 + rng.nextInt(0, 25));
    }
  }

  return { size, grid, placements };
}

export function buildSudokuMini(seed: number, difficulty: number): SudokuPuzzle {
  const rng = new SeededRandom(seed);
  const solution = new Array(16).fill(0);

  function isValid(grid: number[], position: number, value: number) {
    const row = Math.floor(position / 4);
    const col = position % 4;

    for (let c = 0; c < 4; c += 1) {
      if (grid[row * 4 + c] === value) return false;
    }

    for (let r = 0; r < 4; r += 1) {
      if (grid[r * 4 + col] === value) return false;
    }

    const boxRow = Math.floor(row / 2) * 2;
    const boxCol = Math.floor(col / 2) * 2;
    for (let r = boxRow; r < boxRow + 2; r += 1) {
      for (let c = boxCol; c < boxCol + 2; c += 1) {
        if (grid[r * 4 + c] === value) return false;
      }
    }

    return true;
  }

  function fill(position: number): boolean {
    if (position === 16) return true;
    const numbers = rng.shuffle([1, 2, 3, 4]);

    for (const value of numbers) {
      if (isValid(solution, position, value)) {
        solution[position] = value;
        if (fill(position + 1)) return true;
        solution[position] = 0;
      }
    }

    return false;
  }

  fill(0);

  const givens = Math.max(6, 10 - difficulty);
  const removable = rng.shuffle(Array.from({ length: 16 }, (_, index) => index)).slice(0, 16 - givens);
  const removableSet = new Set(removable);
  const puzzle = solution.map((value, index) => (removableSet.has(index) ? null : value));
  return { puzzle, solution };
}

export function buildNumberGrid(seed: number, difficulty: number): NumberGridPuzzle {
  const rng = new SeededRandom(seed);
  const size = 3;
  const solution = rng.shuffle(Array.from({ length: 9 }, (_, index) => index + 1));
  const rowSums = Array.from({ length: size }, (_, row) =>
    solution.slice(row * size, row * size + size).reduce((sum, value) => sum + value, 0),
  );
  const colSums = Array.from({ length: size }, (_, col) =>
    Array.from({ length: size }, (_, row) => solution[row * size + col]).reduce((sum, value) => sum + value, 0),
  );
  const removeCount = Math.min(6, 3 + difficulty);
  const blankIndices = rng.shuffle(Array.from({ length: size * size }, (_, index) => index)).slice(0, removeCount);
  const blankSet = new Set(blankIndices);
  const grid = solution.map((value, index) => (blankSet.has(index) ? null : value));

  return { size, grid, solution, rowSums, colSums };
}

export function buildWordScramble(seed: number, difficulty: number) {
  const rng = new SeededRandom(seed);
  const minLength = difficulty >= 4 ? 6 : 5;
  const candidateWords = WORD_BANK.filter((word) => word.length >= minLength);
  const targetWord = candidateWords[rng.nextInt(0, candidateWords.length - 1)];
  const letters = targetWord.split("");
  let scrambled = rng.shuffle(letters);

  if (scrambled.join("") === targetWord) {
    scrambled = [...scrambled];
    [scrambled[0], scrambled[1]] = [scrambled[1], scrambled[0]];
  }

  return { targetWord, scrambled };
}

export function buildCrosswordMini(seed: number, difficulty: number) {
  const rng = new SeededRandom(seed);
  const totalEntries = Math.min(5, Math.max(3, difficulty));
  return rng.shuffle(CROSSWORD_BANK).slice(0, totalEntries);
}

export function buildMatchingPairs(seed: number, difficulty: number): MatchingPair[] {
  const rng = new SeededRandom(seed);
  const totalPairs = Math.min(5, Math.max(3, difficulty));
  return rng.shuffle(MATCHING_PAIR_BANK).slice(0, totalPairs).map(([left, right], index) => ({ pairId: index, left, right }));
}

function buildPatternRound(rng: SeededRandom): PatternRound {
  const rowShapes = rng.shuffle([...PATTERN_SHAPES]).slice(0, 3);
  const colColors = rng.shuffle([...PATTERN_COLORS]).slice(0, 3);
  const pattern: PatternItem[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      pattern.push({ shape: rowShapes[row], color: colColors[col] });
    }
  }

  const missingIndex = rng.nextInt(0, pattern.length - 1);
  const correct = pattern[missingIndex];
  const options: PatternItem[] = [correct];

  while (options.length < 4) {
    const candidate = {
      shape: PATTERN_SHAPES[rng.nextInt(0, PATTERN_SHAPES.length - 1)],
      color: PATTERN_COLORS[rng.nextInt(0, PATTERN_COLORS.length - 1)],
    };

    if (!options.some((option) => option.shape === candidate.shape && option.color === candidate.color)) {
      options.push(candidate);
    }
  }

  const shuffledOptions = rng.shuffle(options);
  const correctOption = shuffledOptions.findIndex(
    (option) => option.shape === correct.shape && option.color === correct.color,
  );

  return {
    pattern,
    missingIndex,
    options: shuffledOptions,
    correctOption,
  };
}

export function buildPatternRounds(seed: number, difficulty: number) {
  const rng = new SeededRandom(seed);
  const totalRounds = Math.min(5, Math.max(3, difficulty + 1));
  return Array.from({ length: totalRounds }, () => buildPatternRound(rng));
}

function normalizeShapeCells(cells: ShapeCells) {
  const minRow = Math.min(...cells.map(([row]) => row));
  const minCol = Math.min(...cells.map(([, col]) => col));
  return cells
    .map(([row, col]) => [row - minRow, col - minCol] as [number, number])
    .sort((left, right) => (left[0] - right[0]) || (left[1] - right[1]));
}

function rotateShapeCells(cells: ShapeCells) {
  return normalizeShapeCells(cells.map(([row, col]) => [col, -row] as [number, number]));
}

function mirrorShapeCells(cells: ShapeCells) {
  return normalizeShapeCells(cells.map(([row, col]) => [row, -col] as [number, number]));
}

function shapeCellsEqual(left: ShapeCells, right: ShapeCells) {
  return JSON.stringify(normalizeShapeCells(left)) === JSON.stringify(normalizeShapeCells(right));
}

export function buildSpatialRounds(seed: number, difficulty: number): SpatialRound[] {
  const rng = new SeededRandom(seed);
  const totalRounds = Math.min(5, Math.max(3, difficulty));
  return Array.from({ length: totalRounds }, () => {
    const base = normalizeShapeCells(SPATIAL_BASE_SHAPES[rng.nextInt(0, SPATIAL_BASE_SHAPES.length - 1)]);
    const instructionMode = rng.nextInt(0, 2);
    const correct =
      instructionMode === 0
        ? rotateShapeCells(base)
        : instructionMode === 1
          ? rotateShapeCells(rotateShapeCells(base))
          : mirrorShapeCells(base);
    const pool = [
      base,
      rotateShapeCells(base),
      rotateShapeCells(rotateShapeCells(base)),
      rotateShapeCells(rotateShapeCells(rotateShapeCells(base))),
      mirrorShapeCells(base),
      mirrorShapeCells(rotateShapeCells(base)),
    ];

    const options: ShapeCells[] = [correct];
    for (const candidate of rng.shuffle(pool)) {
      if (options.some((entry) => shapeCellsEqual(entry, candidate))) continue;
      options.push(candidate);
      if (options.length === 4) break;
    }

    const shuffled = rng.shuffle(options);
    return {
      base,
      options: shuffled,
      correctOption: shuffled.findIndex((option) => shapeCellsEqual(option, correct)),
      instruction:
        instructionMode === 0
          ? "Rotate 90 degrees clockwise"
          : instructionMode === 1
            ? "Rotate 180 degrees"
            : "Mirror across a vertical line",
    };
  });
}

export function buildTilePuzzle(seed: number, difficulty: number): TilePuzzle {
  const rng = new SeededRandom(seed);
  const size = 3;
  const tiles = [...Array.from({ length: size * size - 1 }, (_, index) => index + 1), 0];
  let emptyIndex = tiles.length - 1;
  const scrambleMoves = 24 + difficulty * 8;

  for (let step = 0; step < scrambleMoves; step += 1) {
    const row = Math.floor(emptyIndex / size);
    const col = emptyIndex % size;
    const neighbors: number[] = [];

    if (row > 0) neighbors.push(emptyIndex - size);
    if (row < size - 1) neighbors.push(emptyIndex + size);
    if (col > 0) neighbors.push(emptyIndex - 1);
    if (col < size - 1) neighbors.push(emptyIndex + 1);

    const swapIndex = neighbors[rng.nextInt(0, neighbors.length - 1)];
    [tiles[emptyIndex], tiles[swapIndex]] = [tiles[swapIndex], tiles[emptyIndex]];
    emptyIndex = swapIndex;
  }

  return { size, tiles };
}

export function isTilePuzzleSolved(tiles: number[]) {
  for (let index = 0; index < tiles.length - 1; index += 1) {
    if (tiles[index] !== index + 1) return false;
  }

  return tiles[tiles.length - 1] === 0;
}
