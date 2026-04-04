export const HEAD_TO_HEAD_ARENA_PUZZLE_TYPES = [
  "circuit_clash",
  "link_lock",
  "mirror_maze",
  "number_grid",
  "tile_slide",
  "maze",
  "spatial_reasoning",
  "memory_grid",
] as const;

export type HeadToHeadArenaPuzzleType =
  (typeof HEAD_TO_HEAD_ARENA_PUZZLE_TYPES)[number];

export const HEAD_TO_HEAD_ARENA_MODE_BY_PUZZLE = {
  circuit_clash: "circuit_clash",
  link_lock: "link_lock",
  mirror_maze: "mirror_maze",
  number_grid: "number_crunch",
  tile_slide: "tile_shift",
  maze: "maze_rush",
  spatial_reasoning: "spatial_spin",
  memory_grid: "memory_flash",
} as const;

export const HEAD_TO_HEAD_LIVE_TARGET_SCORE = 100;
export const HEAD_TO_HEAD_LIVE_DURATION_MS = 210_000;

export function isHeadToHeadArenaPuzzleType(
  value: string | null | undefined,
): value is HeadToHeadArenaPuzzleType {
  return (
    typeof value === "string" &&
    (HEAD_TO_HEAD_ARENA_PUZZLE_TYPES as readonly string[]).includes(value)
  );
}

export function getHeadToHeadArenaModeForPuzzleType(
  value: string | null | undefined,
) {
  if (!isHeadToHeadArenaPuzzleType(value)) {
    return null;
  }

  return HEAD_TO_HEAD_ARENA_MODE_BY_PUZZLE[value];
}
