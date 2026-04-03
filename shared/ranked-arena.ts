export const RANKED_ARENA_PUZZLE_TYPES = [
  "rotate_pipes",
  "number_grid",
  "tile_slide",
  "maze",
  "chess_tactic",
  "checkers_tactic",
  "chess_endgame",
  "chess_opening",
  "chess_mate_net",
] as const;

export type RankedArenaPuzzleType = (typeof RANKED_ARENA_PUZZLE_TYPES)[number];

export const RANKED_ARENA_MODE_BY_PUZZLE = {
  rotate_pipes: "pipe_rush",
  number_grid: "number_crunch",
  tile_slide: "tile_shift",
  maze: "maze_rush",
  chess_tactic: "chess_shot",
  checkers_tactic: "checkers_trap",
  chess_endgame: "chess_endgame",
  chess_opening: "chess_opening",
  chess_mate_net: "chess_mate_net",
} as const;

export function isRankedArenaPuzzleType(
  value: string | null | undefined,
): value is RankedArenaPuzzleType {
  return (
    typeof value === "string" &&
    (RANKED_ARENA_PUZZLE_TYPES as readonly string[]).includes(value)
  );
}

export function getRankedArenaModeForPuzzleType(value: string | null | undefined) {
  if (!isRankedArenaPuzzleType(value)) {
    return null;
  }

  return RANKED_ARENA_MODE_BY_PUZZLE[value];
}
