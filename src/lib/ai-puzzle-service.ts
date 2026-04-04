import type {
  BackendPuzzleSelection as MatchPuzzleSelection,
  MatchPlayablePuzzleType,
  PuzzleCatalogEntry,
} from "@/lib/backend";

export type { MatchPlayablePuzzleType, MatchPuzzleSelection };

export interface MatchPuzzleMeta extends PuzzleCatalogEntry {}

const MATCH_PLAYABLE_PUZZLES: MatchPlayablePuzzleType[] = [
  "rotate_pipes",
  "circuit_clash",
  "link_lock",
  "mirror_maze",
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
  "logic_sequence",
  "trivia_blitz",
  "geography_quiz",
  "science_quiz",
  "math_race",
  "code_breaker",
  "analogies",
  "deduction_grid",
  "vocabulary_duel",
];

export function isPlayableMatchPuzzle(type: string): type is MatchPlayablePuzzleType {
  return MATCH_PLAYABLE_PUZZLES.includes(type as MatchPlayablePuzzleType);
}
