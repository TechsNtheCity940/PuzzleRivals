import { buildGeneratedQuizRounds } from "./match-quiz-content.ts";
import { buildCrosswordMini, buildMatchingPairs, buildMaze, buildMemoryGrid, buildNumberGrid, buildPathfinder, buildSudokuMini, buildWordScramble, buildWordSearch, buildWordle, getMazeProgress, normalizeSegment } from "./match-puzzle-contract.ts";

export type MatchPlayablePuzzleType =
  | "rotate_pipes"
  | "number_grid"
  | "pattern_match"
  | "word_scramble"
  | "crossword_mini"
  | "tile_slide"
  | "sudoku_mini"
  | "word_search"
  | "matching_pairs"
  | "spatial_reasoning"
  | "maze"
  | "pathfinder"
  | "memory_grid"
  | "riddle_choice"
  | "wordle_guess"
  | "chess_tactic"
  | "checkers_tactic"
  | "logic_sequence"
  | "trivia_blitz"
  | "geography_quiz"
  | "science_quiz"
  | "math_race"
  | "code_breaker"
  | "analogies"
  | "deduction_grid"
  | "chess_endgame"
  | "chess_opening"
  | "chess_mate_net"
  | "vocabulary_duel";

export interface PuzzleCatalogEntry {
  type: MatchPlayablePuzzleType;
  label: string;
  icon: string;
  description: string;
}

export interface AuthoritativePuzzleSelection {
  puzzleType: MatchPlayablePuzzleType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  practiceSeed: number;
  liveSeed: number;
  selectedAt: string;
  meta: PuzzleCatalogEntry;
}

export type PuzzleSubmission =
  | { kind: "rotate_pipes"; rotations: number[] }
  | { kind: "number_grid"; values: Array<number | null> }
  | { kind: "pattern_match"; answers: number[] }
  | { kind: "word_scramble"; selectedIndices: number[] }
  | { kind: "crossword_mini"; answers: string[] }
  | { kind: "tile_slide"; tiles: number[] }
  | { kind: "sudoku_mini"; values: Array<number | null> }
  | { kind: "word_search"; segments: Array<{ start: number; end: number }> }
  | { kind: "matching_pairs"; matchedPairIds: number[] }
  | { kind: "spatial_reasoning"; answers: number[] }
  | { kind: "maze"; position: number }
  | { kind: "pathfinder"; path: number[] }
  | { kind: "memory_grid"; selectedIndices: number[] }
  | { kind: "riddle_choice"; answers: number[] }
  | { kind: "wordle_guess"; guesses: string[] }
  | { kind: "chess_tactic"; answers: number[] }
  | { kind: "checkers_tactic"; answers: number[] }
  | { kind: "logic_sequence"; answers: number[] }
  | { kind: "trivia_blitz"; answers: number[] }
  | { kind: "geography_quiz"; answers: number[] }
  | { kind: "science_quiz"; answers: number[] }
  | { kind: "math_race"; answers: number[] }
  | { kind: "code_breaker"; answers: number[] }
  | { kind: "analogies"; answers: number[] }
  | { kind: "deduction_grid"; answers: number[] }
  | { kind: "chess_endgame"; answers: number[] }
  | { kind: "chess_opening"; answers: number[] }
  | { kind: "chess_mate_net"; answers: number[] }
  | { kind: "vocabulary_duel"; answers: number[] };

type PatternShape = "circle" | "square" | "triangle" | "diamond";
type PipeType = "straight" | "corner" | "tee" | "cross" | "end" | "empty";

interface PipeCell {
  type: PipeType;
  rotation: number;
  connections: boolean[];
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

interface SpatialRound {
  base: Array<[number, number]>;
  options: Array<Array<[number, number]>>;
  correctOption: number;
  instruction: string;
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

  shuffle<T>(items: T[]) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(0, index);
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }
}

const MATCH_PLAYABLE_PUZZLES: MatchPlayablePuzzleType[] = [
  "rotate_pipes",
  "number_grid",
  "pattern_match",
  "word_scramble",
  "crossword_mini",
  "tile_slide",
  "sudoku_mini",
  "word_search",
  "matching_pairs",
  "spatial_reasoning",
  "maze",
  "pathfinder",
  "memory_grid",
  "riddle_choice",
  "wordle_guess",
  "chess_tactic",
  "checkers_tactic",
  "logic_sequence",
  "trivia_blitz",
  "geography_quiz",
  "science_quiz",
  "math_race",
  "code_breaker",
  "analogies",
  "deduction_grid",
  "chess_endgame",
  "chess_opening",
  "chess_mate_net",
  "vocabulary_duel",
];

const PUZZLE_CATALOG: Record<MatchPlayablePuzzleType, PuzzleCatalogEntry> = {
  rotate_pipes: { type: "rotate_pipes", label: "Pipe Flow", icon: "🔧", description: "Rotate the tiles until the source path connects cleanly to the sink." },
  number_grid: { type: "number_grid", label: "Number Crunch", icon: "🔢", description: "Fill the empty cells so every row and column matches the target sum." },
  pattern_match: { type: "pattern_match", label: "Pattern Eye", icon: "👁", description: "Identify the missing piece by reading the shape and color rule." },
  word_scramble: { type: "word_scramble", label: "Word Blitz", icon: "🔤", description: "Tap the scrambled letters in order to spell the hidden word." },
  crossword_mini: { type: "crossword_mini", label: "Crossword Clash", icon: "Clue", description: "Solve a burst of clue-driven mini crossword entries." },
  tile_slide: { type: "tile_slide", label: "Tile Shift", icon: "⬜", description: "Slide tiles into the empty space until the board returns to order." },
  sudoku_mini: { type: "sudoku_mini", label: "Sudoku Sprint", icon: "🧩", description: "Fill 1-4 so each row, column, and 2x2 box has no repeats." },
  word_search: { type: "word_search", label: "Word Hunt", icon: "Search", description: "Find hidden words in the grid and mark their endpoints." },
  matching_pairs: { type: "matching_pairs", label: "Match Maker", icon: "Link", description: "Pair each term with the clue or partner that belongs with it." },
  spatial_reasoning: { type: "spatial_reasoning", label: "Spatial Spin", icon: "Shape", description: "Choose the rotated or mirrored shape that fits the rule." },
  maze: { type: "maze", label: "Maze Rush", icon: "🏁", description: "Guide the runner through the maze and reach the goal square." },
  pathfinder: { type: "pathfinder", label: "Pathfinder", icon: "Route", description: "Trace the valid route through a blocked grid from start to finish." },
  memory_grid: { type: "memory_grid", label: "Memory Flash", icon: "🧠", description: "Memorize the highlighted pattern, then tap the same cells back." },
  riddle_choice: { type: "riddle_choice", label: "Riddle Relay", icon: "❓", description: "Solve rapid-fire riddles with multiple-choice answers." },
  wordle_guess: { type: "wordle_guess", label: "Word Strike", icon: "🟩", description: "Guess the five-letter word using color feedback from each attempt." },
  chess_tactic: { type: "chess_tactic", label: "Chess Shot", icon: "♞", description: "Pick the best tactical move from the presented chess position." },
  checkers_tactic: { type: "checkers_tactic", label: "Checkers Trap", icon: "⚫", description: "Choose the strongest capture or positional follow-up in a checkers setup." },
  logic_sequence: { type: "logic_sequence", label: "Logic Sequence", icon: "123", description: "Pick the next term in a fast-moving number or symbol pattern." },
  trivia_blitz: { type: "trivia_blitz", label: "Trivia Blitz", icon: "Target", description: "Answer broad knowledge questions before the clock burns down." },
  geography_quiz: { type: "geography_quiz", label: "Geo Sprint", icon: "Globe", description: "Match capitals, flags, and world landmarks under pressure." },
  science_quiz: { type: "science_quiz", label: "Science Snap", icon: "Lab", description: "Choose the right science or tech fact from rapid prompts." },
  math_race: { type: "math_race", label: "Math Race", icon: "Math", description: "Solve mental arithmetic and number logic as fast as possible." },
  code_breaker: { type: "code_breaker", label: "Code Breaker", icon: "Lock", description: "Crack a coded pattern by selecting the valid rule." },
  analogies: { type: "analogies", label: "Analogy Ace", icon: "Analogy", description: "Pick the answer that completes the relationship cleanly." },
  deduction_grid: { type: "deduction_grid", label: "Deduction Grid", icon: "Grid", description: "Finish a compact logic-grid clue chain with the right statement." },
  chess_endgame: { type: "chess_endgame", label: "Chess Endgame", icon: "Rook", description: "Find the winning endgame conversion or drawing resource." },
  chess_opening: { type: "chess_opening", label: "Chess Opening", icon: "Bishop", description: "Choose the most principled opening continuation from the position." },
  chess_mate_net: { type: "chess_mate_net", label: "Mate Net", icon: "Queen", description: "Spot the move that creates an unavoidable mating net." },
  vocabulary_duel: { type: "vocabulary_duel", label: "Vocab Duel", icon: "Book", description: "Choose the strongest synonym, definition, or word fit." },
};

const SPATIAL_BASE_SHAPES: Array<Array<[number, number]>> = [
  [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[1, 0], [0, 1], [1, 1], [1, 2]],
];
const PATTERN_SHAPES: PatternShape[] = ["circle", "square", "triangle", "diamond"];
const PATTERN_COLORS = ["hsl(72 100% 50%)", "hsl(269 100% 58%)", "hsl(0 100% 65%)", "hsl(200 100% 60%)", "hsl(45 100% 55%)"];
const RIDDLE_BANK: QuizRound[] = [
  { prompt: "What has keys but cannot open locks?", options: ["A piano", "A map", "A castle", "A deck of cards"], correctOption: 0 },
  { prompt: "The more you take, the more you leave behind. What are they?", options: ["Footsteps", "Coins", "Hints", "Breaths"], correctOption: 0 },
  { prompt: "What gets wetter the more it dries?", options: ["A sponge", "Rain", "A towel", "Soap"], correctOption: 2 },
];
const CHESS_BANK: QuizRound[] = [
  { prompt: "White to move: your queen and bishop line up on the king. Find the forcing tactic.", options: ["Qg7#", "Bxh7+", "Qd8+", "Re8+"], correctOption: 0 },
  { prompt: "Black to move: win material with a fork.", options: ["Nd3+", "Qh2+", "Rc1+", "Bf2+"], correctOption: 0 },
  { prompt: "White to move: convert the back-rank weakness immediately.", options: ["Re8+", "Qh7+", "Bb5+", "Nd6+"], correctOption: 0 },
];
const CHECKERS_BANK: QuizRound[] = [
  { prompt: "Your red piece can force a double jump. Which landing square starts it?", options: ["B6", "D6", "F6", "H6"], correctOption: 1 },
  { prompt: "Black to move: preserve tempo and threaten promotion.", options: ["C3", "E5", "G5", "B4"], correctOption: 2 },
  { prompt: "Red to move: take the only capture that keeps king pressure.", options: ["A5", "C5", "E3", "G3"], correctOption: 1 },
];
const LOGIC_SEQUENCE_BANK: QuizRound[] = [
  { prompt: "What comes next: 2, 6, 12, 20, 30, ?", options: ["36", "40", "42", "48"], correctOption: 2 },
  { prompt: "Find the next value: 1, 1, 2, 3, 5, 8, ?", options: ["11", "12", "13", "21"], correctOption: 2 },
  { prompt: "Which symbol completes the pattern: circle, triangle, square, circle, triangle, ?", options: ["diamond", "square", "circle", "star"], correctOption: 1 },
];
const TRIVIA_BLITZ_BANK: QuizRound[] = [
  { prompt: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Mercury", "Jupiter"], correctOption: 1 },
  { prompt: "Which instrument has 88 keys?", options: ["Violin", "Trumpet", "Piano", "Harp"], correctOption: 2 },
  { prompt: "What color do you get by mixing blue and yellow?", options: ["Green", "Purple", "Orange", "Red"], correctOption: 0 },
];
const GEOGRAPHY_BANK: QuizRound[] = [
  { prompt: "What is the capital of Canada?", options: ["Toronto", "Vancouver", "Ottawa", "Montreal"], correctOption: 2 },
  { prompt: "Which country is home to the city of Kyoto?", options: ["South Korea", "Japan", "China", "Thailand"], correctOption: 1 },
  { prompt: "Which desert covers much of northern Africa?", options: ["Gobi", "Atacama", "Kalahari", "Sahara"], correctOption: 3 },
];
const SCIENCE_BANK: QuizRound[] = [
  { prompt: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], correctOption: 1 },
  { prompt: "How many bones does an adult human typically have?", options: ["206", "201", "212", "198"], correctOption: 0 },
  { prompt: "Which device measures earthquakes?", options: ["Barometer", "Seismograph", "Telescope", "Altimeter"], correctOption: 1 },
];
const MATH_RACE_BANK: QuizRound[] = [
  { prompt: "What is 18 x 7?", options: ["112", "126", "134", "142"], correctOption: 1 },
  { prompt: "If a puzzle round lasts 90 seconds, how many 15-second segments are there?", options: ["5", "6", "7", "8"], correctOption: 1 },
  { prompt: "Solve: 144 / 12 + 9", options: ["18", "19", "20", "21"], correctOption: 3 },
];
const CODE_BREAKER_BANK: QuizRound[] = [
  { prompt: "A lock code uses ascending even digits. Which fits best?", options: ["2468", "2486", "8642", "1357"], correctOption: 0 },
  { prompt: "If A=1, B=2, C=3, what code spells CAB?", options: ["312", "321", "123", "231"], correctOption: 0 },
  { prompt: "Which code breaks the rule: two letters followed by two digits?", options: ["AB12", "QZ77", "A1B2", "RT45"], correctOption: 2 },
];
const ANALOGIES_BANK: QuizRound[] = [
  { prompt: "Knight is to chess as king is to ?", options: ["checkers", "cards", "board", "crown"], correctOption: 0 },
  { prompt: "Puzzle is to solve as race is to ?", options: ["sprint", "win", "track", "start"], correctOption: 1 },
  { prompt: "Seed is to tree as clue is to ?", options: ["answer", "timer", "question", "penalty"], correctOption: 0 },
];
const DEDUCTION_GRID_BANK: QuizRound[] = [
  { prompt: "Ava is not red. Ben is not blue. If blue belongs to Cy, what color must Ava have?", options: ["Red", "Green", "Blue", "Unknown"], correctOption: 1 },
  { prompt: "One player solved first, one second, one third. Kim was before Lou. Lou was before Max. Who won?", options: ["Kim", "Lou", "Max", "Tie"], correctOption: 0 },
  { prompt: "Three boxes hold coin, gem, and key. Box A is not gem. Box B is key. What is Box C?", options: ["Coin", "Gem", "Key", "Unknown"], correctOption: 1 },
];
const CHESS_ENDGAME_BANK: QuizRound[] = [
  { prompt: "King and pawn ending: your king is in front of the pawn. What is the winning plan?", options: ["Push immediately", "Opposition first", "Trade kings", "Stalemate trick"], correctOption: 1 },
  { prompt: "Rook ending with active king: what matters most?", options: ["Passive rook checks", "Cut off the king", "Keep pawns split", "Move the rook behind your king"], correctOption: 1 },
  { prompt: "Opposite-colored bishops with equal pawns usually trend toward?", options: ["Forced win", "Drawish play", "Mate net", "Piece fork"], correctOption: 1 },
];
const CHESS_OPENING_BANK: QuizRound[] = [
  { prompt: "After 1.e4 e5 2.Nf3 Nc6, what is a classical developing move for White?", options: ["Bb5", "h4", "Qh5", "a3"], correctOption: 0 },
  { prompt: "What is the main purpose of castling early in the opening?", options: ["Win a pawn", "Develop the queen", "King safety and rook activity", "Threaten mate immediately"], correctOption: 2 },
  { prompt: "In many openings, why fight for the center?", options: ["It makes bishops weaker", "It gives pieces more influence", "It avoids development", "It locks your king in place"], correctOption: 1 },
];
const CHESS_MATE_NET_BANK: QuizRound[] = [
  { prompt: "Your queen and rook align on the back rank. What kind of move often starts the mate net?", options: ["Random pawn push", "Quiet luft move", "Forcing check", "Knight retreat"], correctOption: 2 },
  { prompt: "A boxed king with no escape squares is most vulnerable to?", options: ["A discovered check", "A perpetual shuffle", "Trading queens", "Opposite-side castling"], correctOption: 0 },
  { prompt: "When your bishop covers the escape square, what should your heavy piece look for?", options: ["A fork", "A checking line", "A retreat square", "A pawn trade"], correctOption: 1 },
];
const VOCABULARY_DUEL_BANK: QuizRound[] = [
  { prompt: "Which word is closest in meaning to rapid?", options: ["Slow", "Swift", "Quiet", "Heavy"], correctOption: 1 },
  { prompt: "Choose the best definition of elusive.", options: ["Easy to catch", "Hard to find or pin down", "Very noisy", "Brightly colored"], correctOption: 1 },
  { prompt: "Which word best completes: The puzzle's elegant design was ____.", options: ["clumsy", "ingenious", "fragile", "ordinary"], correctOption: 1 },
];

function createSeededRandom(seed: number) {
  let current = seed > 0 ? seed : 1;
  return () => {
    current = (current * 48271) % 2147483647;
    return (current - 1) / 2147483646;
  };
}

function hashSelectionKey(value: string) {
  let seed = 0;
  for (const character of value) {
    seed = (seed * 31 + character.charCodeAt(0)) % 2147483647;
  }
  return seed || 1;
}

function randomSeed(nextRandom: () => number = () => Math.random()) {
  return Math.floor(nextRandom() * 2147483646) + 1;
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getPuzzleMeta(type: MatchPlayablePuzzleType) {
  return PUZZLE_CATALOG[type];
}

export function getAdaptiveDifficulty(averageElo: number, mode: string): 1 | 2 | 3 | 4 | 5 {
  let difficulty = 1;
  if (averageElo >= 3200) difficulty = 5;
  else if (averageElo >= 2600) difficulty = 4;
  else if (averageElo >= 1800) difficulty = 3;
  else if (averageElo >= 1000) difficulty = 2;
  if (mode === "ranked" && difficulty < 5) difficulty += 1;
  if (mode === "casual" && difficulty > 1) difficulty -= 1;
  return difficulty as 1 | 2 | 3 | 4 | 5;
}

export function createAuthoritativePuzzleSelection(
  averageElo: number,
  mode: string,
  preferredPuzzleType?: MatchPlayablePuzzleType | null,
  selectionKey?: string,
): AuthoritativePuzzleSelection {
  const nextRandom = selectionKey
    ? createSeededRandom(hashSelectionKey(`${selectionKey}:selection`))
    : () => Math.random();
  const puzzleType =
    preferredPuzzleType && MATCH_PLAYABLE_PUZZLES.includes(preferredPuzzleType)
      ? preferredPuzzleType
      : MATCH_PLAYABLE_PUZZLES[Math.floor(nextRandom() * MATCH_PLAYABLE_PUZZLES.length)];
  const practiceSeed = randomSeed(nextRandom);
  let liveSeed = randomSeed(nextRandom);
  while (liveSeed === practiceSeed) liveSeed = randomSeed(nextRandom);

  return {
    puzzleType,
    difficulty: getAdaptiveDifficulty(averageElo, mode),
    practiceSeed,
    liveSeed,
    selectedAt: new Date().toISOString(),
    meta: getPuzzleMeta(puzzleType),
  };
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

function rotateConnections(connections: boolean[], rotation: number) {
  const steps = (rotation / 90) % 4;
  const next = [...connections];
  for (let index = 0; index < steps; index += 1) next.unshift(next.pop()!);
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
      currentRow.push({ type, rotation: scramble, connections: rotateConnections(getBaseConnections(type), scramble), isConnected: false });
    }
    grid.push(currentRow);
  }
  return grid;
}

function rotatePipeCell(cell: PipeCell): PipeCell {
  const rotation = (cell.rotation + 90) % 360;
  return { ...cell, rotation, connections: rotateConnections(getBaseConnections(cell.type), rotation) };
}

function checkPipeConnections(grid: PipeCell[][]) {
  const size = grid.length;
  const visited = new Set<string>();
  const connected = new Set<string>();
  function flood(row: number, column: number) {
    const key = `${row},${column}`;
    if (visited.has(key) || row < 0 || row >= size || column < 0 || column >= size) return;
    visited.add(key);
    connected.add(key);
    const cell = grid[row][column];
    const directions = [[-1, 0, 0, 2], [0, 1, 1, 3], [1, 0, 2, 0], [0, -1, 3, 1]];
    for (const [dr, dc, own, other] of directions) {
      if (!cell.connections[own]) continue;
      const nr = row + dr;
      const nc = column + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (grid[nr][nc].connections[other]) flood(nr, nc);
    }
  }
  flood(0, 0);
  return grid.map((row, rowIndex) => row.map((cell, columnIndex) => ({ ...cell, isConnected: connected.has(`${rowIndex},${columnIndex}`) })));
}

function buildPatternRound(rng: SeededRandom): PatternRound {
  const rowShapes = rng.shuffle([...PATTERN_SHAPES]).slice(0, 3);
  const colColors = rng.shuffle([...PATTERN_COLORS]).slice(0, 3);
  const pattern: PatternItem[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) pattern.push({ shape: rowShapes[row], color: colColors[col] });
  }
  const missingIndex = rng.nextInt(0, pattern.length - 1);
  const correct = pattern[missingIndex];
  const options: PatternItem[] = [correct];
  while (options.length < 4) {
    const candidate = { shape: PATTERN_SHAPES[rng.nextInt(0, PATTERN_SHAPES.length - 1)], color: PATTERN_COLORS[rng.nextInt(0, PATTERN_COLORS.length - 1)] };
    if (!options.some((entry) => entry.shape === candidate.shape && entry.color === candidate.color)) options.push(candidate);
  }
  const shuffledOptions = rng.shuffle(options);
  return { pattern, missingIndex, options: shuffledOptions, correctOption: shuffledOptions.findIndex((option) => option.shape === correct.shape && option.color === correct.color) };
}

function buildPatternRounds(seed: number, difficulty: number) {
  const rng = new SeededRandom(seed);
  const totalRounds = Math.min(5, Math.max(3, difficulty + 1));
  return Array.from({ length: totalRounds }, () => buildPatternRound(rng));
}

function normalizeCells(cells: Array<[number, number]>) {
  const minRow = Math.min(...cells.map(([row]) => row));
  const minCol = Math.min(...cells.map(([, col]) => col));
  return cells
    .map(([row, col]) => [row - minRow, col - minCol] as [number, number])
    .sort((left, right) => (left[0] - right[0]) || (left[1] - right[1]));
}

function rotateCellsClockwise(cells: Array<[number, number]>) {
  return normalizeCells(cells.map(([row, col]) => [col, -row] as [number, number]));
}

function mirrorCellsHorizontal(cells: Array<[number, number]>) {
  return normalizeCells(cells.map(([row, col]) => [row, -col] as [number, number]));
}

function cellsEqual(left: Array<[number, number]>, right: Array<[number, number]>) {
  return JSON.stringify(normalizeCells(left)) === JSON.stringify(normalizeCells(right));
}

function buildSpatialRounds(seed: number, difficulty: number) {
  const rng = new SeededRandom(seed);
  const totalRounds = Math.min(5, Math.max(3, difficulty));
  return Array.from({ length: totalRounds }, () => {
    const base = normalizeCells(SPATIAL_BASE_SHAPES[rng.nextInt(0, SPATIAL_BASE_SHAPES.length - 1)]);
    const instructionMode = rng.nextInt(0, 2);
    const correct =
      instructionMode === 0
        ? rotateCellsClockwise(base)
        : instructionMode === 1
          ? rotateCellsClockwise(rotateCellsClockwise(base))
          : mirrorCellsHorizontal(base);

    const pool = [
      base,
      rotateCellsClockwise(base),
      rotateCellsClockwise(rotateCellsClockwise(base)),
      rotateCellsClockwise(rotateCellsClockwise(rotateCellsClockwise(base))),
      mirrorCellsHorizontal(base),
      mirrorCellsHorizontal(rotateCellsClockwise(base)),
    ];

    const options: Array<Array<[number, number]>> = [correct];
    for (const candidate of rng.shuffle(pool)) {
      if (options.some((entry) => cellsEqual(entry, candidate))) continue;
      options.push(candidate);
      if (options.length === 4) break;
    }
    const shuffled = rng.shuffle(options);
    return {
      base,
      options: shuffled,
      correctOption: shuffled.findIndex((option) => cellsEqual(option, correct)),
      instruction:
        instructionMode === 0
          ? "Rotate 90 degrees clockwise"
          : instructionMode === 1
            ? "Rotate 180 degrees"
            : "Mirror across a vertical line",
    } satisfies SpatialRound;
  });
}

function buildTilePuzzle(seed: number, difficulty: number) {
  const rng = new SeededRandom(seed);
  const size = 3;
  const tiles = [...Array.from({ length: size * size - 1 }, (_, index) => index + 1), 0];
  let emptyIndex = tiles.length - 1;
  for (let step = 0; step < 24 + difficulty * 8; step += 1) {
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

function buildQuizRounds(seed: number, bank: QuizRound[], totalRounds: number) {
  const rng = new SeededRandom(seed);
  return rng.shuffle(bank).slice(0, totalRounds);
}

function evaluateAnswers(totalRounds: number, correctOptions: number[], submittedAnswers: number[]) {
  let correct = 0;
  for (let index = 0; index < submittedAnswers.length; index += 1) {
    if (submittedAnswers[index] !== correctOptions[index]) break;
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
  if (puzzleType !== submission.kind) throw new Error("Puzzle submission type does not match round type.");

  switch (submission.kind) {
    case "rotate_pipes": {
      const size = difficulty >= 4 ? 5 : 4;
      if (submission.rotations.length !== size * size) return 0;
      let grid = generatePipePuzzle(seed, size);
      grid = grid.map((row, rowIndex) =>
        row.map((cell, columnIndex) => {
          const targetRotation = ((submission.rotations[rowIndex * size + columnIndex] % 360) + 360) % 360;
          let nextCell = cell;
          while (nextCell.rotation !== targetRotation) nextCell = rotatePipeCell(nextCell);
          return nextCell;
        }),
      );
      const checked = checkPipeConnections(grid);
      const total = checked.flat().length;
      const connected = checked.flat().filter((cell) => cell.isConnected).length;
      return clampProgress((connected / Math.max(total, 1)) * 100);
    }
    case "number_grid": {
      const puzzle = buildNumberGrid(seed, difficulty);
      const correct = submission.values.filter((value, index) => value === puzzle.solution[index]).length;
      return clampProgress((correct / puzzle.solution.length) * 100);
    }
    case "pattern_match": {
      const rounds = buildPatternRounds(seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "word_scramble": {
      const puzzle = buildWordScramble(seed, difficulty);
      const word = submission.selectedIndices.map((index) => puzzle.scrambled[index]).join("");
      let matchingPrefix = 0;
      while (matchingPrefix < word.length && word[matchingPrefix] === puzzle.targetWord[matchingPrefix]) matchingPrefix += 1;
      return clampProgress((matchingPrefix / puzzle.targetWord.length) * 100);
    }
    case "crossword_mini": {
      const entries = buildCrosswordMini(seed, difficulty);
      const correct = entries.filter((entry, index) => (submission.answers[index] ?? "").trim().toUpperCase() === entry.answer).length;
      return clampProgress((correct / Math.max(entries.length, 1)) * 100);
    }
    case "tile_slide": {
      const correct = submission.tiles.filter((value, index) => (index === submission.tiles.length - 1 ? value === 0 : value === index + 1)).length;
      return clampProgress((correct / submission.tiles.length) * 100);
    }
    case "sudoku_mini": {
      const puzzle = buildSudokuMini(seed, difficulty);
      const correct = submission.values.filter((value, index) => value === puzzle.solution[index]).length;
      return clampProgress((correct / puzzle.solution.length) * 100);
    }
    case "word_search": {
      const puzzle = buildWordSearch(seed, difficulty);
      const expected = new Set(puzzle.placements.map((placement) => normalizeSegment(placement.start, placement.end)));
      const found = new Set(submission.segments.map((segment) => normalizeSegment(segment.start, segment.end)).filter((key) => expected.has(key)));
      return clampProgress((found.size / Math.max(expected.size, 1)) * 100);
    }
    case "matching_pairs": {
      const pairs = buildMatchingPairs(seed, difficulty);
      const expected = new Set(pairs.map((pair) => pair.pairId));
      const found = new Set(submission.matchedPairIds.filter((pairId) => expected.has(pairId)));
      return clampProgress((found.size / Math.max(expected.size, 1)) * 100);
    }
    case "spatial_reasoning": {
      const rounds = buildSpatialRounds(seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "maze":
      return getMazeProgress(buildMaze(seed, difficulty), submission.position);
    case "pathfinder": {
      const puzzle = buildPathfinder(seed, difficulty);
      let matchingPrefix = 0;
      while (
        matchingPrefix < submission.path.length &&
        matchingPrefix < puzzle.solutionPath.length &&
        submission.path[matchingPrefix] === puzzle.solutionPath[matchingPrefix]
      ) {
        matchingPrefix += 1;
      }
      return clampProgress((matchingPrefix / Math.max(puzzle.solutionPath.length, 1)) * 100);
    }
    case "memory_grid": {
      const puzzle = buildMemoryGrid(seed, difficulty);
      const correct = submission.selectedIndices.filter((index) => puzzle.targets.includes(index)).length;
      return clampProgress((correct / puzzle.targets.length) * 100);
    }
    case "riddle_choice": {
      const rounds = buildGeneratedQuizRounds("riddle_choice", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "wordle_guess": {
      const target = buildWordle(seed);
      const guess = submission.guesses[submission.guesses.length - 1]?.toUpperCase() ?? "";
      const correct = guess.split("").filter((letter, index) => letter === target[index]).length;
      return clampProgress((correct / target.length) * 100);
    }
    case "chess_tactic": {
      const rounds = buildGeneratedQuizRounds("chess_tactic", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "checkers_tactic": {
      const rounds = buildGeneratedQuizRounds("checkers_tactic", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "logic_sequence": {
      const rounds = buildGeneratedQuizRounds("logic_sequence", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "trivia_blitz": {
      const rounds = buildGeneratedQuizRounds("trivia_blitz", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "geography_quiz": {
      const rounds = buildGeneratedQuizRounds("geography_quiz", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "science_quiz": {
      const rounds = buildGeneratedQuizRounds("science_quiz", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "math_race": {
      const rounds = buildGeneratedQuizRounds("math_race", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "code_breaker": {
      const rounds = buildGeneratedQuizRounds("code_breaker", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "analogies": {
      const rounds = buildGeneratedQuizRounds("analogies", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "deduction_grid": {
      const rounds = buildGeneratedQuizRounds("deduction_grid", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "chess_endgame": {
      const rounds = buildGeneratedQuizRounds("chess_endgame", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "chess_opening": {
      const rounds = buildGeneratedQuizRounds("chess_opening", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "chess_mate_net": {
      const rounds = buildGeneratedQuizRounds("chess_mate_net", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
    }
    case "vocabulary_duel": {
      const rounds = buildGeneratedQuizRounds("vocabulary_duel", seed, difficulty);
      return evaluateAnswers(rounds.length, rounds.map((round) => round.correctOption), submission.answers);
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

