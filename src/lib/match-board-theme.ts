import type { MatchPlayablePuzzleType } from "@/lib/backend";

export type NeonPuzzleThemeCategory =
  | "pipe-path"
  | "number-logic-grid"
  | "pattern-match"
  | "word-letter-grid"
  | "sliding-spatial"
  | "maze-route"
  | "memory-recall"
  | "quiz-choice"
  | "code-deduction"
  | "chess-strategy";

export interface NeonPuzzleThemeDefinition {
  category: NeonPuzzleThemeCategory;
  label: string;
  kicker: string;
  summary: string;
  puzzleTypes: MatchPlayablePuzzleType[];
}

export const PUZZLE_THEME_CATEGORY_BY_TYPE: Record<MatchPlayablePuzzleType, NeonPuzzleThemeCategory> = {
  rotate_pipes: "pipe-path",
  number_grid: "number-logic-grid",
  pattern_match: "pattern-match",
  word_scramble: "word-letter-grid",
  crossword_mini: "word-letter-grid",
  tile_slide: "sliding-spatial",
  sudoku_mini: "number-logic-grid",
  word_search: "word-letter-grid",
  matching_pairs: "memory-recall",
  spatial_reasoning: "sliding-spatial",
  maze: "maze-route",
  pathfinder: "maze-route",
  memory_grid: "memory-recall",
  riddle_choice: "quiz-choice",
  wordle_guess: "word-letter-grid",
  chess_tactic: "chess-strategy",
  checkers_tactic: "chess-strategy",
  logic_sequence: "number-logic-grid",
  trivia_blitz: "quiz-choice",
  geography_quiz: "quiz-choice",
  science_quiz: "quiz-choice",
  math_race: "number-logic-grid",
  code_breaker: "code-deduction",
  analogies: "quiz-choice",
  deduction_grid: "code-deduction",
  chess_endgame: "chess-strategy",
  chess_opening: "chess-strategy",
  chess_mate_net: "chess-strategy",
  vocabulary_duel: "word-letter-grid",
};

export const NEON_PUZZLE_THEME_DEFINITIONS: Record<NeonPuzzleThemeCategory, NeonPuzzleThemeDefinition> = {
  "pipe-path": {
    category: "pipe-path",
    label: "Pipe / Path",
    kicker: "Flow Reactor",
    summary: "Glowing conduits, power nodes, and current pulses built for route-completion pressure.",
    puzzleTypes: ["rotate_pipes"],
  },
  "number-logic-grid": {
    category: "number-logic-grid",
    label: "Number / Logic Grid",
    kicker: "Precision Matrix",
    summary: "Angular cells, row-column targeting, and clean logic-readability under pressure.",
    puzzleTypes: ["number_grid", "sudoku_mini", "logic_sequence", "math_race"],
  },
  "pattern-match": {
    category: "pattern-match",
    label: "Pattern / Match",
    kicker: "Signal Match",
    summary: "Color-coded icon tiles with link beams, combo flashes, and sharp recognition cues.",
    puzzleTypes: ["pattern_match"],
  },
  "word-letter-grid": {
    category: "word-letter-grid",
    label: "Word / Letter Grid",
    kicker: "Lex Grid",
    summary: "Readable letter tiles, path glows, and lock-in feedback for fast language rounds.",
    puzzleTypes: ["word_scramble", "crossword_mini", "word_search", "wordle_guess", "vocabulary_duel"],
  },
  "sliding-spatial": {
    category: "sliding-spatial",
    label: "Sliding / Spatial",
    kicker: "Assembly Board",
    summary: "Glossy blocks, assembly rails, and snap-in energy trails for spatial solves.",
    puzzleTypes: ["tile_slide", "spatial_reasoning"],
  },
  "maze-route": {
    category: "maze-route",
    label: "Maze / Route",
    kicker: "Route Grid",
    summary: "Start and goal pulse states, trace lines, and wrong-route dimming for pathfinding.",
    puzzleTypes: ["maze", "pathfinder"],
  },
  "memory-recall": {
    category: "memory-recall",
    label: "Memory / Recall",
    kicker: "Recall Stack",
    summary: "Reveal shimmer, match arcs, and glitch-reset cues for high-speed recall boards.",
    puzzleTypes: ["memory_grid", "matching_pairs"],
  },
  "quiz-choice": {
    category: "quiz-choice",
    label: "Quiz / Choice",
    kicker: "Prompt Relay",
    summary: "Large readable question panels, crisp choice buttons, and clear correctness feedback.",
    puzzleTypes: ["riddle_choice", "trivia_blitz", "geography_quiz", "science_quiz", "analogies"],
  },
  "code-deduction": {
    category: "code-deduction",
    label: "Code / Deduction",
    kicker: "Cipher Deck",
    summary: "Segmented puzzle lab panels with slot indicators and deduction-marker rhythm.",
    puzzleTypes: ["code_breaker", "deduction_grid"],
  },
  "chess-strategy": {
    category: "chess-strategy",
    label: "Chess / Strategy",
    kicker: "Tactical Board",
    summary: "Premium dark squares, threat glows, and prestige highlights for board strategy rounds.",
    puzzleTypes: ["chess_tactic", "checkers_tactic", "chess_endgame", "chess_opening", "chess_mate_net"],
  },
};

export function getNeonPuzzleThemeCategory(puzzleType: MatchPlayablePuzzleType): NeonPuzzleThemeCategory {
  return PUZZLE_THEME_CATEGORY_BY_TYPE[puzzleType];
}

export function getNeonPuzzleThemeDefinition(
  puzzleTypeOrCategory: MatchPlayablePuzzleType | NeonPuzzleThemeCategory,
): NeonPuzzleThemeDefinition {
  const category = puzzleTypeOrCategory in NEON_PUZZLE_THEME_DEFINITIONS
    ? (puzzleTypeOrCategory as NeonPuzzleThemeCategory)
    : PUZZLE_THEME_CATEGORY_BY_TYPE[puzzleTypeOrCategory as MatchPlayablePuzzleType];

  return NEON_PUZZLE_THEME_DEFINITIONS[category];
}
