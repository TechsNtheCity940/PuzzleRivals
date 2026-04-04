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

export interface GlyphRushRound {
  size: number;
  glyphs: string[];
  targets: number[];
  previewMs: number;
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
const GLYPH_RUNE_BANK = [
  "?", "?", "?", "?", "?", "?", "?", "?",
  "?", "?", "?", "?", "?", "?", "?", "?",
  "?", "?", "?", "?", "?", "?", "?", "?",
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

function buildGlyphRuneSet(rng: SeededRandom, total: number) {
  const pool = rng.shuffle(GLYPH_RUNE_BANK);
  return Array.from({ length: total }, (_, index) => pool[index % pool.length]);
}

export function buildGlyphRushRounds(seed: number, difficulty: number): GlyphRushRound[] {
  const rng = new SeededRandom(seed);
  const size = 4;
  const totalRounds = Math.min(10, Math.max(7, difficulty + 5));

  return Array.from({ length: totalRounds }, (_, roundIndex) => {
    const targetFloor = 3 + Math.floor(roundIndex / 2);
    const targetCount = Math.min(8, Math.max(3, targetFloor + rng.nextInt(0, 1)));
    const targets = rng
      .shuffle(Array.from({ length: size * size }, (_, index) => index))
      .slice(0, targetCount)
      .sort((left, right) => left - right);
    const previewMs = Math.max(650, 1450 - roundIndex * 70 - difficulty * 40 + rng.nextInt(-50, 50));

    return {
      size,
      glyphs: buildGlyphRuneSet(rng, size * size),
      targets,
      previewMs,
    };
  });
}

export function evaluateGlyphRushAnswers(rounds: GlyphRushRound[], answers: number[][]) {
  if (rounds.length === 0) {
    return 0;
  }

  const totalScore = rounds.reduce((sum, round, roundIndex) => {
    const answer = Array.isArray(answers[roundIndex])
      ? [...new Set(answers[roundIndex].filter((value) => Number.isInteger(value) && value >= 0 && value < round.size * round.size))]
      : [];
    const expected = new Set(round.targets);
    const correct = answer.filter((value) => expected.has(value)).length;
    const extras = Math.max(0, answer.length - correct);

    if (correct === round.targets.length && extras === 0) {
      return sum + 1;
    }

    const partial = Math.max(0, (correct - extras * 0.65) / Math.max(round.targets.length, 1));
    return sum + Math.min(0.92, partial);
  }, 0);

  return clampProgress((totalScore / rounds.length) * 100);
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


export interface LinkLockPair {
  pairId: number;
  color: string;
  endpoints: [number, number];
  guidePath: number[];
}

export interface LinkLockPuzzle {
  size: number;
  pairs: LinkLockPair[];
}

export interface LinkLockPathSubmission {
  pairId: number;
  cells: number[];
}

interface LinkLockTemplate {
  size: number;
  paths: Array<Array<[number, number]>>;
}

const LINK_LOCK_PALETTE = [
  '#5fe2ff',
  '#c8ff4d',
  '#ff86d3',
  '#ffc95e',
] as const;

const LINK_LOCK_TEMPLATES: LinkLockTemplate[] = [
  {
    size: 5,
    paths: [
      [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
      [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]],
      [[4, 0], [3, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
    ],
  },
  {
    size: 6,
    paths: [
      [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [2, 3]],
      [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5]],
      [[5, 0], [4, 0], [3, 0], [3, 1], [3, 2], [4, 2], [5, 2]],
      [[1, 3], [1, 4], [2, 4], [3, 4], [4, 4]],
    ],
  },
];

function toGridIndex(size: number, row: number, col: number) {
  return row * size + col;
}

function areOrthogonallyAdjacent(size: number, left: number, right: number) {
  const leftRow = Math.floor(left / size);
  const leftCol = left % size;
  const rightRow = Math.floor(right / size);
  const rightCol = right % size;
  return Math.abs(leftRow - rightRow) + Math.abs(leftCol - rightCol) === 1;
}

function transformSquareCoord(
  size: number,
  coord: [number, number],
  rotationSteps: number,
  mirrored: boolean,
): [number, number] {
  let [row, col] = coord;

  for (let step = 0; step < rotationSteps; step += 1) {
    [row, col] = [col, size - 1 - row];
  }

  if (mirrored) {
    col = size - 1 - col;
  }

  return [row, col];
}

function transformSquareIndex(
  size: number,
  index: number,
  rotationSteps: number,
  mirrored: boolean,
) {
  const row = Math.floor(index / size);
  const col = index % size;
  const [nextRow, nextCol] = transformSquareCoord(size, [row, col], rotationSteps, mirrored);
  return toGridIndex(size, nextRow, nextCol);
}

function normalizeEndpointPath(path: number[], endpoints: [number, number]) {
  if (path[0] === endpoints[0] && path[path.length - 1] === endpoints[1]) {
    return path;
  }

  if (path[0] === endpoints[1] && path[path.length - 1] === endpoints[0]) {
    return [...path].reverse();
  }

  return path;
}

export function buildLinkLock(seed: number, difficulty: number): LinkLockPuzzle {
  const rng = new SeededRandom(seed + difficulty * 97);
  const targetSize = difficulty >= 4 ? 6 : 5;
  const templates = LINK_LOCK_TEMPLATES.filter((template) => template.size === targetSize);
  const template = templates[rng.nextInt(0, templates.length - 1)] ?? LINK_LOCK_TEMPLATES[0];
  const rotationSteps = rng.nextInt(0, 3);
  const mirrored = rng.next() > 0.5;
  const colors = rng.shuffle([...LINK_LOCK_PALETTE]);

  const paths = template.paths.map((path) =>
    path.map(([row, col]) => {
      const [nextRow, nextCol] = transformSquareCoord(
        template.size,
        [row, col],
        rotationSteps,
        mirrored,
      );
      return toGridIndex(template.size, nextRow, nextCol);
    }),
  );

  return {
    size: template.size,
    pairs: paths.map((path, index) => ({
      pairId: index + 1,
      color: colors[index % colors.length],
      endpoints: [path[0], path[path.length - 1]],
      guidePath: path,
    })),
  };
}

export function evaluateLinkLockPaths(
  puzzle: LinkLockPuzzle,
  submittedPaths: LinkLockPathSubmission[],
) {
  const pairById = new Map(puzzle.pairs.map((pair) => [pair.pairId, pair] as const));
  const endpointOwners = new Map<number, number>();
  const occupied = new Map<number, number>();
  const validPairIds: number[] = [];
  const seenPairs = new Set<number>();

  for (const pair of puzzle.pairs) {
    endpointOwners.set(pair.endpoints[0], pair.pairId);
    endpointOwners.set(pair.endpoints[1], pair.pairId);
  }

  for (const submittedPath of submittedPaths) {
    const pair = pairById.get(submittedPath.pairId);
    if (!pair || seenPairs.has(pair.pairId) || submittedPath.cells.length < 2) {
      continue;
    }

    const cells = normalizeEndpointPath(submittedPath.cells, pair.endpoints);
    const [start, end] = pair.endpoints;
    if (cells[0] != start || cells[cells.length - 1] != end) {
      continue;
    }

    const visited = new Set<number>();
    let valid = true;

    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      if (!Number.isInteger(cell) || cell < 0 || cell >= puzzle.size * puzzle.size) {
        valid = false;
        break;
      }
      if (visited.has(cell)) {
        valid = false;
        break;
      }
      if (index > 0 && !areOrthogonallyAdjacent(puzzle.size, cells[index - 1], cell)) {
        valid = false;
        break;
      }

      const isOwnEndpoint = cell === start || cell === end;
      const endpointOwner = endpointOwners.get(cell);
      if (!isOwnEndpoint && endpointOwner !== undefined) {
        valid = false;
        break;
      }

      const occupiedBy = occupied.get(cell);
      if (occupiedBy !== undefined && occupiedBy !== pair.pairId) {
        valid = false;
        break;
      }

      visited.add(cell);
    }

    if (!valid) {
      continue;
    }

    seenPairs.add(pair.pairId);
    validPairIds.push(pair.pairId);
    for (const cell of cells) {
      occupied.set(cell, pair.pairId);
    }
  }

  const completedPairs = validPairIds.length;
  return {
    completedPairs,
    validPairIds,
    progress: clampProgress((completedPairs / Math.max(puzzle.pairs.length, 1)) * 100),
    solved: completedPairs === puzzle.pairs.length,
  };
}

export type MirrorBeamDirection = 0 | 1 | 2 | 3;

export interface MirrorMazeCell {
  type: 'empty' | 'mirror';
  rotation: number;
  locked?: boolean;
}

export interface MirrorMazePuzzle {
  size: number;
  sourceIndex: number;
  sourceDirection: MirrorBeamDirection;
  targets: number[];
  cells: MirrorMazeCell[];
}

interface MirrorMazeTemplate {
  size: number;
  sourceIndex: number;
  sourceDirection: MirrorBeamDirection;
  targets: number[];
  mirrors: Array<{
    index: number;
    solvedRotation: number;
    locked?: boolean;
  }>;
}

const MIRROR_MAZE_TEMPLATES: MirrorMazeTemplate[] = [
  {
    size: 5,
    sourceIndex: toGridIndex(5, 4, 0),
    sourceDirection: 1,
    targets: [toGridIndex(5, 2, 3), toGridIndex(5, 0, 4)],
    mirrors: [
      { index: toGridIndex(5, 4, 2), solvedRotation: 90 },
      { index: toGridIndex(5, 2, 2), solvedRotation: 0 },
      { index: toGridIndex(5, 2, 4), solvedRotation: 90 },
    ],
  },
  {
    size: 6,
    sourceIndex: toGridIndex(6, 5, 0),
    sourceDirection: 1,
    targets: [toGridIndex(6, 4, 4), toGridIndex(6, 1, 5), toGridIndex(6, 0, 2)],
    mirrors: [
      { index: toGridIndex(6, 5, 2), solvedRotation: 90 },
      { index: toGridIndex(6, 3, 2), solvedRotation: 0 },
      { index: toGridIndex(6, 3, 4), solvedRotation: 90 },
      { index: toGridIndex(6, 1, 4), solvedRotation: 0 },
      { index: toGridIndex(6, 1, 2), solvedRotation: 90 },
    ],
  },
];

function rotateBeamDirection(direction: MirrorBeamDirection, rotationSteps: number) {
  return ((direction + rotationSteps) % 4) as MirrorBeamDirection;
}

function mirrorBeamDirection(direction: MirrorBeamDirection) {
  if (direction === 1) return 3;
  if (direction === 3) return 1;
  return direction;
}

function normalizeMirrorRotation(rotation: number) {
  const normalized = ((rotation % 180) + 180) % 180;
  return normalized >= 90 ? 90 : 0;
}

function transformMirrorRotation(rotation: number, rotationSteps: number, mirrored: boolean) {
  let nextRotation = normalizeMirrorRotation(rotation);
  if (rotationSteps % 2 !== 0) {
    nextRotation = nextRotation === 0 ? 90 : 0;
  }
  if (mirrored) {
    nextRotation = nextRotation === 0 ? 90 : 0;
  }
  return nextRotation;
}

function reflectMirrorBeam(direction: MirrorBeamDirection, rotation: number) {
  const normalizedRotation = normalizeMirrorRotation(rotation);

  if (normalizedRotation === 0) {
    switch (direction) {
      case 0:
        return 3;
      case 1:
        return 2;
      case 2:
        return 1;
      case 3:
        return 0;
    }
  }

  switch (direction) {
    case 0:
      return 1;
    case 1:
      return 0;
    case 2:
      return 3;
    case 3:
      return 2;
  }
}

function nextBeamIndex(size: number, index: number, direction: MirrorBeamDirection) {
  const row = Math.floor(index / size);
  const col = index % size;
  if (direction === 0 && row > 0) return index - size;
  if (direction === 1 && col < size - 1) return index + 1;
  if (direction === 2 && row < size - 1) return index + size;
  if (direction === 3 && col > 0) return index - 1;
  return null;
}

export function buildMirrorMaze(seed: number, difficulty: number): MirrorMazePuzzle {
  const rng = new SeededRandom(seed + difficulty * 131);
  const targetSize = difficulty >= 4 ? 6 : 5;
  const templates = MIRROR_MAZE_TEMPLATES.filter((template) => template.size === targetSize);
  const template = templates[rng.nextInt(0, templates.length - 1)] ?? MIRROR_MAZE_TEMPLATES[0];
  const rotationSteps = rng.nextInt(0, 3);
  const mirrored = rng.next() > 0.5;
  const cells = Array.from({ length: template.size * template.size }, () => ({
    type: 'empty',
    rotation: 0,
  } as MirrorMazeCell));

  let scrambledMirrorCount = 0;
  for (const mirror of template.mirrors) {
    const index = transformSquareIndex(
      template.size,
      mirror.index,
      rotationSteps,
      mirrored,
    );
    const solvedRotation = transformMirrorRotation(
      mirror.solvedRotation,
      rotationSteps,
      mirrored,
    );
    let rotation = solvedRotation;
    if (!mirror.locked && rng.next() > 0.2) {
      rotation = solvedRotation === 0 ? 90 : 0;
      scrambledMirrorCount += 1;
    }

    cells[index] = {
      type: 'mirror',
      rotation,
      locked: mirror.locked ?? false,
    };
  }

  if (scrambledMirrorCount === 0) {
    const mutableMirrorIndex = cells.findIndex((cell) => cell.type === 'mirror' && !cell.locked);
    if (mutableMirrorIndex >= 0) {
      cells[mutableMirrorIndex] = {
        ...cells[mutableMirrorIndex],
        rotation: cells[mutableMirrorIndex].rotation === 0 ? 90 : 0,
      };
    }
  }

  return {
    size: template.size,
    sourceIndex: transformSquareIndex(template.size, template.sourceIndex, rotationSteps, mirrored),
    sourceDirection: mirrored
      ? mirrorBeamDirection(rotateBeamDirection(template.sourceDirection, rotationSteps))
      : rotateBeamDirection(template.sourceDirection, rotationSteps),
    targets: template.targets.map((target) =>
      transformSquareIndex(template.size, target, rotationSteps, mirrored),
    ),
    cells,
  };
}

export function traceMirrorBeam(puzzle: MirrorMazePuzzle, overrideRotations?: number[]) {
  const cells = puzzle.cells.map((cell, index) => {
    if (cell.type !== 'mirror' || !overrideRotations || overrideRotations.length !== puzzle.cells.length) {
      return { ...cell, rotation: normalizeMirrorRotation(cell.rotation) };
    }

    return {
      ...cell,
      rotation: normalizeMirrorRotation(overrideRotations[index] ?? cell.rotation),
    };
  });
  const hitTargets = new Set<number>();
  const beamCells = [puzzle.sourceIndex];
  const visitedStates = new Set<string>();
  let currentIndex = puzzle.sourceIndex;
  let direction = puzzle.sourceDirection;

  for (let step = 0; step < puzzle.cells.length * 8; step += 1) {
    const stateKey = `${currentIndex}:${direction}`;
    if (visitedStates.has(stateKey)) {
      return {
        beamCells,
        hitTargets: [...hitTargets],
        terminated: 'loop' as const,
      };
    }
    visitedStates.add(stateKey);

    if (puzzle.targets.includes(currentIndex)) {
      hitTargets.add(currentIndex);
    }

    const cell = cells[currentIndex];
    if (cell.type === 'mirror') {
      direction = reflectMirrorBeam(direction, cell.rotation);
    }

    const nextIndex = nextBeamIndex(puzzle.size, currentIndex, direction);
    if (nextIndex === null) {
      return {
        beamCells,
        hitTargets: [...hitTargets],
        terminated: 'edge' as const,
      };
    }

    beamCells.push(nextIndex);
    currentIndex = nextIndex;
  }

  return {
    beamCells,
    hitTargets: [...hitTargets],
    terminated: 'loop' as const,
  };
}

export function evaluateMirrorMazeState(
  puzzle: MirrorMazePuzzle,
  overrideRotations?: number[],
) {
  const beam = traceMirrorBeam(puzzle, overrideRotations);
  const litTargetCount = beam.hitTargets.filter((target) => puzzle.targets.includes(target)).length;
  return {
    ...beam,
    litTargetCount,
    progress: clampProgress((litTargetCount / Math.max(puzzle.targets.length, 1)) * 100),
    solved: litTargetCount === puzzle.targets.length,
  };
}
