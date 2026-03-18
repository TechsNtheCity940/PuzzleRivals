import type { MatchPlayablePuzzleType } from "@/lib/backend";

const RAPID_FIRE_TYPES = new Set<MatchPlayablePuzzleType>([
  "pattern_match",
  "word_scramble",
  "crossword_mini",
  "word_search",
  "matching_pairs",
  "spatial_reasoning",
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
  "pathfinder",
]);

const PUZZLE_HELP: Record<MatchPlayablePuzzleType, string> = {
  rotate_pipes: "Rotate each tile until the lit path runs cleanly from the source to the sink.",
  number_grid: "Fill every empty square so each row and column matches the target sum.",
  pattern_match: "Read the rule across rows and columns, then tap the tile that completes the pattern.",
  word_scramble: "Tap the scrambled letters in the correct order to rebuild the hidden word.",
  crossword_mini: "Solve each clue and fill the matching mini-crossword answer before the board rolls forward.",
  tile_slide: "Slide tiles into the open slot until the board returns to numerical order.",
  sudoku_mini: "Fill 1 through 4 so rows, columns, and every 2x2 box contain no repeats.",
  word_search: "Find each hidden word in the grid, then mark it by tapping its first and last letter.",
  matching_pairs: "Match each prompt card to its correct partner faster than the rest of the lobby.",
  spatial_reasoning: "Mentally rotate or mirror the shape, then choose the option that fits the rule.",
  maze: "Move through the maze and reach the finish square before the timer runs out.",
  pathfinder: "Trace the one valid route through the blocked grid from start to goal.",
  memory_grid: "Memorize the flash pattern, then tap the exact same cells back.",
  riddle_choice: "Read the prompt and choose the strongest answer before the next clue arrives.",
  wordle_guess: "Enter a five-letter guess and use the feedback to lock the word quickly.",
  chess_tactic: "Pick the forcing move that wins material, mates, or takes control immediately.",
  checkers_tactic: "Choose the best capture or continuation from the checkers position.",
  logic_sequence: "Spot the sequence rule first, then pick the only answer that continues it cleanly.",
  trivia_blitz: "Move on instinct and broad knowledge. The best answer is usually the simplest one.",
  geography_quiz: "Match the prompt to the right capital, country, or landmark before the clock burns.",
  science_quiz: "Choose the correct science or tech fact and keep your momentum up.",
  math_race: "Solve the arithmetic fast and trust your first correct mental calculation.",
  code_breaker: "Identify the pattern rule, then choose the code that obeys it exactly.",
  analogies: "Compare the relationship in the prompt, then find the option with the same relationship.",
  deduction_grid: "Eliminate the impossible statements first, then choose the only consistent answer.",
  chess_endgame: "Think in plans, not tactics. Choose the move that converts or saves the ending.",
  chess_opening: "Prioritize development, center control, and king safety over flashy moves.",
  chess_mate_net: "Look for forcing checks and covered escape squares to finish the mating net.",
  vocabulary_duel: "Pick the strongest synonym, meaning, or sentence fit from the options.",
};

const PUZZLE_HINTS: Record<MatchPlayablePuzzleType, string> = {
  rotate_pipes: "Start by fixing the source corner, then rotate neighboring pieces so every open side connects to another pipe.",
  number_grid: "Use the row and column totals to solve the most constrained blank first instead of guessing.",
  pattern_match: "Rows usually control shape while columns control color. Check what stays constant in each direction.",
  word_scramble: "Build common prefixes or suffixes first. If a letter pair looks natural together, anchor it early.",
  crossword_mini: "Start with the shortest clue or the one with the most obvious word pattern, then use the crossings to lock the rest.",
  tile_slide: "Solve the top row and left column first. Keep the blank space near the area you are fixing.",
  sudoku_mini: "Scan for a row, column, or box with only one missing number. That is your free placement.",
  word_search: "Scan along rows, columns, and diagonals for rare letters first. Mark the endpoints once the word is clear.",
  matching_pairs: "Read both halves quickly and clear the obvious matches first. Shared categories usually give the pairs away.",
  spatial_reasoning: "Track one anchor corner and one unique edge. If both land correctly after the turn, the option is probably right.",
  maze: "Follow the open corridors from your current tile and avoid backing into dead ends unless there is no forward route.",
  pathfinder: "Work from the goal backward if the route looks messy. The shortest clean lane is usually the intended one.",
  memory_grid: "Break the pattern into small chunks such as corners, center shapes, or short rows before tapping.",
  riddle_choice: "Literal answers are often traps. Look for the object that matches the wording in an unexpected way.",
  wordle_guess: "Lock in green letters first and stop reusing letters that already tested wrong.",
  chess_tactic: "Checks, captures, and threats. Test forcing moves in that order before anything quiet.",
  checkers_tactic: "Look for mandatory captures and ask which jump sequence improves promotion chances the most.",
  logic_sequence: "Measure the gap between terms or the repeating shape cycle before comparing answer choices.",
  trivia_blitz: "Skip overthinking. The most common textbook answer is often correct in blitz rounds.",
  geography_quiz: "If you recognize the region, eliminate options from the wrong continent first.",
  science_quiz: "Focus on the core keyword in the question. It usually points directly to the right principle or instrument.",
  math_race: "Round the numbers mentally to estimate first, then confirm the closest exact answer.",
  code_breaker: "Check the rule from left to right. One position usually breaks the pattern faster than the full code does.",
  analogies: "Name the relationship in one word, like part-to-whole or cause-to-effect, then match that pattern.",
  deduction_grid: "Use the strongest negative clue first. One impossible pair usually unlocks the rest of the grid.",
  chess_endgame: "Count tempi and king opposition before pushing pawns. Structure matters more than speed here.",
  chess_opening: "If one move develops a piece and helps the center, it is usually safer than a direct attack.",
  chess_mate_net: "Picture the enemy king's escape squares. If your move removes the last safe square, it is probably right.",
  vocabulary_duel: "Read the word in context. Tone and sentence fit usually eliminate half the options immediately.",
};

export function isRapidFirePuzzleType(puzzleType: MatchPlayablePuzzleType) {
  return RAPID_FIRE_TYPES.has(puzzleType);
}

export function getPuzzleHelpText(puzzleType: MatchPlayablePuzzleType) {
  return PUZZLE_HELP[puzzleType];
}

export function getPuzzleHintText(puzzleType: MatchPlayablePuzzleType) {
  return PUZZLE_HINTS[puzzleType];
}
