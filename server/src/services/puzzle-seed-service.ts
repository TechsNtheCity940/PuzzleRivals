import { randomInt } from "node:crypto";
import type { AuthoritativePuzzleSelection, MatchMode, MatchPlayablePuzzleType, PuzzleCatalogEntry } from "../types.js";

const MATCH_PLAYABLE_PUZZLES: MatchPlayablePuzzleType[] = [
  "rotate_pipes",
  "number_grid",
  "pattern_match",
  "word_scramble",
  "tile_slide",
  "sudoku_mini",
  "maze",
  "memory_grid",
  "riddle_choice",
  "wordle_guess",
  "chess_tactic",
  "checkers_tactic",
];

const PUZZLE_CATALOG: Record<MatchPlayablePuzzleType, PuzzleCatalogEntry> = {
  rotate_pipes: {
    type: "rotate_pipes",
    label: "Pipe Flow",
    icon: "🔧",
    description: "Rotate the tiles until the source path connects cleanly to the sink.",
  },
  number_grid: {
    type: "number_grid",
    label: "Number Crunch",
    icon: "🔢",
    description: "Fill the empty cells so every row and column matches the target sum.",
  },
  pattern_match: {
    type: "pattern_match",
    label: "Pattern Eye",
    icon: "👁",
    description: "Identify the missing piece by reading the shape and color rule.",
  },
  word_scramble: {
    type: "word_scramble",
    label: "Word Blitz",
    icon: "🔤",
    description: "Tap the scrambled letters in order to spell the hidden word.",
  },
  tile_slide: {
    type: "tile_slide",
    label: "Tile Shift",
    icon: "⬜",
    description: "Slide tiles into the empty space until the board returns to order.",
  },
  sudoku_mini: {
    type: "sudoku_mini",
    label: "Sudoku Sprint",
    icon: "🧩",
    description: "Fill 1-4 so each row, column, and 2x2 box has no repeats.",
  },
  maze: {
    type: "maze",
    label: "Maze Rush",
    icon: "🏁",
    description: "Guide the runner through the maze and reach the goal square.",
  },
  memory_grid: {
    type: "memory_grid",
    label: "Memory Flash",
    icon: "🧠",
    description: "Memorize the highlighted pattern, then tap the same cells back.",
  },
  riddle_choice: {
    type: "riddle_choice",
    label: "Riddle Relay",
    icon: "❓",
    description: "Solve rapid-fire riddles with multiple-choice answers.",
  },
  wordle_guess: {
    type: "wordle_guess",
    label: "Word Strike",
    icon: "🟩",
    description: "Guess the five-letter word using color feedback from each attempt.",
  },
  chess_tactic: {
    type: "chess_tactic",
    label: "Chess Shot",
    icon: "♞",
    description: "Pick the best tactical move from the presented chess position.",
  },
  checkers_tactic: {
    type: "checkers_tactic",
    label: "Checkers Trap",
    icon: "⚫",
    description: "Choose the strongest capture or positional follow-up in a checkers setup.",
  },
};

function allocateSeed(previousSeed?: number) {
  let nextSeed = randomInt(1, 2147483646);

  while (previousSeed !== undefined && nextSeed === previousSeed) {
    nextSeed = randomInt(1, 2147483646);
  }

  return nextSeed;
}

export function getAdaptiveDifficulty(averageElo: number, mode: MatchMode): 1 | 2 | 3 | 4 | 5 {
  let difficulty = 1;

  if (averageElo >= 3200) difficulty = 5;
  else if (averageElo >= 2600) difficulty = 4;
  else if (averageElo >= 1800) difficulty = 3;
  else if (averageElo >= 1000) difficulty = 2;

  if (mode === "ranked" && difficulty < 5) difficulty += 1;
  if (mode === "casual" && difficulty > 1) difficulty -= 1;

  return difficulty as 1 | 2 | 3 | 4 | 5;
}

export function createAuthoritativePuzzleSelection(averageElo: number, mode: MatchMode): AuthoritativePuzzleSelection {
  const puzzleType = MATCH_PLAYABLE_PUZZLES[randomInt(0, MATCH_PLAYABLE_PUZZLES.length)];
  const practiceSeed = allocateSeed();

  return {
    puzzleType,
    difficulty: getAdaptiveDifficulty(averageElo, mode),
    practiceSeed,
    liveSeed: allocateSeed(practiceSeed),
    selectedAt: new Date().toISOString(),
    meta: PUZZLE_CATALOG[puzzleType],
  };
}

export function getPuzzleCatalog() {
  return MATCH_PLAYABLE_PUZZLES.map((type) => PUZZLE_CATALOG[type]);
}
