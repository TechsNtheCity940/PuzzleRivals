import type {
  MatchPlayablePuzzleType,
  PatternMatchSubmission,
  PuzzleSubmission,
  RotatePipesSubmission,
  TileSlideSubmission,
} from "../types.js";

type PipeType = "straight" | "corner" | "tee" | "cross" | "end" | "empty";
type PatternShape = "circle" | "square" | "triangle" | "diamond";

interface PipeCell {
  type: PipeType;
  rotation: number;
  connections: boolean[];
  isSource?: boolean;
  isSink?: boolean;
  isConnected: boolean;
}

interface PatternItem {
  shape: PatternShape;
  color: string;
}

interface PatternRound {
  pattern: PatternItem[];
  missingIndex: number;
  options: PatternItem[];
  correctOption: number;
}

interface QuizRound {
  prompt: string;
  options: string[];
  correctOption: number;
}

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

  shuffle<T>(values: T[]) {
    const next = [...values];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(0, index);
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }
}

const WORD_BANK = [
  "BRAIN", "SPEED", "QUICK", "FLASH", "POWER", "SMART", "BLAZE", "STORM",
  "CLASH", "RIVAL", "CROWN", "DREAM", "FLAME", "GLEAM", "HEART", "JOLTS",
  "KNACK", "LEMON", "MANGO", "NERVE", "ORBIT", "PRISM", "QUEST", "REIGN",
  "PIXEL", "DRIFT", "SPARK", "CHASE", "PULSE", "TIGER", "GIANT", "NOBLE",
];

const WORDLE_BANK = ["SPARK", "BRAIN", "QUEST", "PRISM", "CROWN", "ORBIT", "GLINT", "SHARD"];

const PATTERN_SHAPES: PatternShape[] = ["circle", "square", "triangle", "diamond"];
const PATTERN_COLORS = [
  "hsl(72 100% 50%)",
  "hsl(269 100% 58%)",
  "hsl(0 100% 65%)",
  "hsl(200 100% 60%)",
  "hsl(45 100% 55%)",
];

const RIDDLE_BANK: QuizRound[] = [
  {
    prompt: "What has keys but cannot open locks?",
    options: ["A piano", "A map", "A castle", "A deck of cards"],
    correctOption: 0,
  },
  {
    prompt: "The more you take, the more you leave behind. What are they?",
    options: ["Footsteps", "Coins", "Hints", "Breaths"],
    correctOption: 0,
  },
  {
    prompt: "What gets wetter the more it dries?",
    options: ["A sponge", "Rain", "A towel", "Soap"],
    correctOption: 2,
  },
];

const CHESS_BANK: QuizRound[] = [
  {
    prompt: "White to move: your queen and bishop line up on the king. Find the forcing tactic.",
    options: ["Qg7#", "Bxh7+", "Qd8+", "Re8+"],
    correctOption: 0,
  },
  {
    prompt: "Black to move: win material with a fork.",
    options: ["Nd3+", "Qh2+", "Rc1+", "Bf2+"],
    correctOption: 0,
  },
  {
    prompt: "White to move: convert the back-rank weakness immediately.",
    options: ["Re8+", "Qh7+", "Bb5+", "Nd6+"],
    correctOption: 0,
  },
];

const CHECKERS_BANK: QuizRound[] = [
  {
    prompt: "Your red piece can force a double jump. Which landing square starts it?",
    options: ["B6", "D6", "F6", "H6"],
    correctOption: 1,
  },
  {
    prompt: "Black to move: preserve tempo and threaten promotion.",
    options: ["C3", "E5", "G5", "B4"],
    correctOption: 2,
  },
  {
    prompt: "Red to move: take the only capture that keeps king pressure.",
    options: ["A5", "C5", "E3", "G3"],
    correctOption: 1,
  },
];

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildQuizRounds(seed: number, rounds: QuizRound[], totalRounds: number) {
  const rng = new SeededRandom(seed);
  return rng.shuffle(rounds).slice(0, totalRounds);
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

function rotateConnections(connections: boolean[], rotation: number) {
  const steps = (rotation / 90) % 4;
  const next = [...connections];
  for (let index = 0; index < steps; index += 1) {
    next.unshift(next.pop()!);
  }
  return next;
}

function generatePipePuzzle(seed: number, size: number) {
  const rng = new SeededRandom(seed);
  const types: PipeType[] = ["straight", "corner", "tee", "end"];
  const grid: PipeCell[][] = [];

  for (let row = 0; row < size; row += 1) {
    const currentRow: PipeCell[] = [];
    for (let column = 0; column < size; column += 1) {
      const type = types[rng.nextInt(0, types.length - 1)];
      const scramble = rng.nextInt(0, 3) * 90;
      currentRow.push({
        type,
        rotation: scramble,
        connections: rotateConnections(getBaseConnections(type), scramble),
        isConnected: false,
        isSource: row === 0 && column === 0,
        isSink: row === size - 1 && column === size - 1,
      });
    }
    grid.push(currentRow);
  }

  return grid;
}

function rotatePipeCell(cell: PipeCell): PipeCell {
  const rotation = (cell.rotation + 90) % 360;
  return {
    ...cell,
    rotation,
    connections: rotateConnections(getBaseConnections(cell.type), rotation),
  };
}

function checkPipeConnections(grid: PipeCell[][]) {
  const size = grid.length;
  const visited = new Set<string>();
  const connected = new Set<string>();

  function flood(row: number, column: number) {
    const key = `${row},${column}`;
    if (visited.has(key)) return;
    if (row < 0 || row >= size || column < 0 || column >= size) return;

    visited.add(key);
    connected.add(key);

    const cell = grid[row][column];
    const directions = [
      [-1, 0, 0, 2],
      [0, 1, 1, 3],
      [1, 0, 2, 0],
      [0, -1, 3, 1],
    ];

    for (const [deltaRow, deltaColumn, ownIndex, otherIndex] of directions) {
      if (!cell.connections[ownIndex]) continue;
      const nextRow = row + deltaRow;
      const nextColumn = column + deltaColumn;
      if (nextRow < 0 || nextRow >= size || nextColumn < 0 || nextColumn >= size) continue;
      if (grid[nextRow][nextColumn].connections[otherIndex]) {
        flood(nextRow, nextColumn);
      }
    }
  }

  flood(0, 0);

  return grid.map((row, rowIndex) =>
    row.map((cell, columnIndex) => ({
      ...cell,
      isConnected: connected.has(`${rowIndex},${columnIndex}`),
    })),
  );
}

function buildNumberGrid(seed: number, difficulty: number) {
  const rng = new SeededRandom(seed);
  const solution = rng.shuffle(Array.from({ length: 9 }, (_, index) => index + 1));
  const removeCount = Math.min(6, 3 + difficulty);
  const blankIndices = rng.shuffle(Array.from({ length: 9 }, (_, index) => index)).slice(0, removeCount);
  const blankSet = new Set(blankIndices);
  const grid = solution.map((value, index) => (blankSet.has(index) ? null : value));
  return { grid, solution };
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
    if (!options.some((entry) => entry.shape === candidate.shape && entry.color === candidate.color)) {
      options.push(candidate);
    }
  }

  const shuffledOptions = rng.shuffle(options);
  const correctOption = shuffledOptions.findIndex(
    (option) => option.shape === correct.shape && option.color === correct.color,
  );

  return { pattern, missingIndex, options: shuffledOptions, correctOption };
}

function buildPatternRounds(seed: number, difficulty: number) {
  const rng = new SeededRandom(seed);
  const totalRounds = Math.min(5, Math.max(3, difficulty + 1));
  return Array.from({ length: totalRounds }, () => buildPatternRound(rng));
}

function buildWordScramble(seed: number, difficulty: number) {
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

function buildTilePuzzle(seed: number, difficulty: number) {
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

  return { tiles };
}

function buildSudokuMini(seed: number, difficulty: number) {
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

function buildMaze(seed: number, difficulty: number) {
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
      cells[index][neighbor.wall as keyof (typeof cells)[number]] = false;
      cells[neighbor.next][neighbor.opposite as keyof (typeof cells)[number]] = false;
      carve(neighbor.next);
    }
  }

  carve(0);
  return {
    size,
    cells,
    goalIndex: size * size - 1,
  };
}

function canMoveInMaze(
  maze: ReturnType<typeof buildMaze>,
  fromIndex: number,
  toIndex: number,
) {
  const size = maze.size;
  const from = maze.cells[fromIndex];
  const delta = toIndex - fromIndex;
  if (delta === -size) return !from.top;
  if (delta === 1) return !from.right;
  if (delta === size) return !from.bottom;
  if (delta === -1) return !from.left;
  return false;
}

function getMazeReachableProgress(maze: ReturnType<typeof buildMaze>, position: number) {
  if (position < 0 || position >= maze.cells.length) return 0;
  const visited = new Set<number>([0]);
  const queue = [{ index: 0, distance: 0 }];
  let distanceToGoal = 0;
  let distanceToPosition: number | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.index === maze.goalIndex) {
      distanceToGoal = current.distance;
    }
    if (current.index === position) {
      distanceToPosition = current.distance;
    }

    const candidates = [
      current.index - maze.size,
      current.index + 1,
      current.index + maze.size,
      current.index - 1,
    ];

    for (const nextIndex of candidates) {
      if (nextIndex < 0 || nextIndex >= maze.cells.length || visited.has(nextIndex)) continue;
      if (!canMoveInMaze(maze, current.index, nextIndex)) continue;
      visited.add(nextIndex);
      queue.push({ index: nextIndex, distance: current.distance + 1 });
    }
  }

  if (distanceToPosition === null || distanceToGoal === 0) return 0;
  return clampProgress((distanceToPosition / distanceToGoal) * 100);
}

function buildMemoryGrid(seed: number, difficulty: number) {
  const rng = new SeededRandom(seed);
  const size = 4;
  const total = Math.min(7, Math.max(4, difficulty + 2));
  return {
    size,
    targets: rng.shuffle(Array.from({ length: size * size }, (_, index) => index)).slice(0, total),
  };
}

function buildWordle(seed: number) {
  const rng = new SeededRandom(seed);
  return WORDLE_BANK[rng.nextInt(0, WORDLE_BANK.length - 1)];
}

function evaluateRotatePipes(seed: number, difficulty: number, submission: RotatePipesSubmission) {
  const size = difficulty >= 4 ? 5 : 4;
  let grid = generatePipePuzzle(seed, size);
  if (submission.rotations.length !== size * size) return 0;

  grid = grid.map((row, rowIndex) =>
    row.map((cell, columnIndex) => {
      const index = rowIndex * size + columnIndex;
      let nextCell = cell;
      const targetRotation = ((submission.rotations[index] % 360) + 360) % 360;
      while (nextCell.rotation !== targetRotation) {
        nextCell = rotatePipeCell(nextCell);
      }
      return nextCell;
    }),
  );

  const checked = checkPipeConnections(grid);
  const total = checked.flat().filter((cell) => cell.type !== "empty").length;
  const connected = checked.flat().filter((cell) => cell.isConnected).length;
  return clampProgress((connected / Math.max(total, 1)) * 100);
}

function evaluatePatternSequence(totalRounds: number, correctOptions: number[], submission: PatternMatchSubmission) {
  let correct = 0;
  for (let index = 0; index < submission.answers.length; index += 1) {
    if (submission.answers[index] !== correctOptions[index]) break;
    correct += 1;
  }
  return clampProgress((correct / totalRounds) * 100);
}

export function evaluatePuzzleSubmission(
  puzzleType: MatchPlayablePuzzleType,
  seed: number,
  difficulty: number,
  submission: PuzzleSubmission,
) {
  if (puzzleType !== submission.kind) {
    throw new Error("Puzzle submission type does not match the lobby puzzle.");
  }

  switch (submission.kind) {
    case "rotate_pipes":
      return evaluateRotatePipes(seed, difficulty, submission);
    case "number_grid": {
      const puzzle = buildNumberGrid(seed, difficulty);
      if (submission.values.length !== puzzle.solution.length) return 0;
      const correctCount = submission.values.filter((value, index) => value === puzzle.solution[index]).length;
      return clampProgress((correctCount / puzzle.solution.length) * 100);
    }
    case "pattern_match": {
      const rounds = buildPatternRounds(seed, difficulty);
      return evaluatePatternSequence(
        rounds.length,
        rounds.map((round) => round.correctOption),
        submission,
      );
    }
    case "word_scramble": {
      const puzzle = buildWordScramble(seed, difficulty);
      const currentWord = submission.selectedIndices.map((index) => puzzle.scrambled[index]).join("");
      let matchingPrefix = 0;
      while (
        matchingPrefix < currentWord.length &&
        currentWord[matchingPrefix] === puzzle.targetWord[matchingPrefix]
      ) {
        matchingPrefix += 1;
      }
      return clampProgress((matchingPrefix / puzzle.targetWord.length) * 100);
    }
    case "tile_slide": {
      const initial = buildTilePuzzle(seed, difficulty).tiles;
      if (submission.tiles.length !== initial.length) return 0;
      const correctCount = submission.tiles.filter((value, index) => {
        if (index === submission.tiles.length - 1) return value === 0;
        return value === index + 1;
      }).length;
      return clampProgress((correctCount / submission.tiles.length) * 100);
    }
    case "sudoku_mini": {
      const puzzle = buildSudokuMini(seed, difficulty);
      if (submission.values.length !== puzzle.solution.length) return 0;
      const correctCount = submission.values.filter((value, index) => value === puzzle.solution[index]).length;
      return clampProgress((correctCount / puzzle.solution.length) * 100);
    }
    case "maze": {
      const maze = buildMaze(seed, difficulty);
      return getMazeReachableProgress(maze, submission.position);
    }
    case "memory_grid": {
      const puzzle = buildMemoryGrid(seed, difficulty);
      const correct = submission.selectedIndices.filter((index) => puzzle.targets.includes(index)).length;
      return clampProgress((correct / puzzle.targets.length) * 100);
    }
    case "riddle_choice": {
      const rounds = buildQuizRounds(seed, RIDDLE_BANK, Math.min(3, Math.max(2, difficulty - 1)));
      return evaluatePatternSequence(rounds.length, rounds.map((round) => round.correctOption), {
        kind: "pattern_match",
        answers: submission.answers,
      });
    }
    case "wordle_guess": {
      const target = buildWordle(seed);
      const guess = submission.guesses[submission.guesses.length - 1]?.toUpperCase() ?? "";
      if (guess.length !== target.length) return 0;
      const correct = guess.split("").filter((letter, index) => letter === target[index]).length;
      return clampProgress((correct / target.length) * 100);
    }
    case "chess_tactic": {
      const rounds = buildQuizRounds(seed, CHESS_BANK, Math.min(3, Math.max(2, difficulty - 1)));
      return evaluatePatternSequence(rounds.length, rounds.map((round) => round.correctOption), {
        kind: "pattern_match",
        answers: submission.answers,
      });
    }
    case "checkers_tactic": {
      const rounds = buildQuizRounds(seed, CHECKERS_BANK, Math.min(3, Math.max(2, difficulty - 1)));
      return evaluatePatternSequence(rounds.length, rounds.map((round) => round.correctOption), {
        kind: "pattern_match",
        answers: submission.answers,
      });
    }
  }
}

export function isSolvedPuzzleSubmission(
  puzzleType: MatchPlayablePuzzleType,
  seed: number,
  difficulty: number,
  submission: PuzzleSubmission,
) {
  return evaluatePuzzleSubmission(puzzleType, seed, difficulty, submission) >= 100;
}
