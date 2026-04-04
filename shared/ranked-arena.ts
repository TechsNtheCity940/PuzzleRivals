export const RANKED_ARENA_PUZZLE_TYPES = [
  "circuit_clash",
  "link_lock",
  "mirror_maze",
  "glyph_rush",
  "number_grid",
  "tile_slide",
  "maze",
] as const;

export type RankedArenaPuzzleType = (typeof RANKED_ARENA_PUZZLE_TYPES)[number];

export const RANKED_ARENA_MODE_BY_PUZZLE = {
  circuit_clash: "circuit_clash",
  link_lock: "link_lock",
  mirror_maze: "mirror_maze",
  glyph_rush: "glyph_rush",
  number_grid: "number_crunch",
  tile_slide: "tile_shift",
  maze: "maze_rush",
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
