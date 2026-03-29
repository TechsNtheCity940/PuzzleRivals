export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

export const GRID_ROWS = 8;
export const GRID_COLS = 8;
export const TILE_SIZE = 96;

export const BOARD_PIXEL_WIDTH = GRID_COLS * TILE_SIZE;
export const BOARD_PIXEL_HEIGHT = GRID_ROWS * TILE_SIZE;

export const BOARD_ORIGIN_X = Math.round((GAME_WIDTH - BOARD_PIXEL_WIDTH) / 2);
export const BOARD_ORIGIN_Y = 420;
export const BOARD_VIEWPORT_X = 158;
export const BOARD_VIEWPORT_Y = 498;
export const BOARD_VIEWPORT_WIDTH = 764;
export const BOARD_VIEWPORT_HEIGHT = 764;
export const BOARD_VIEWPORT_CENTER_X = BOARD_VIEWPORT_X + BOARD_VIEWPORT_WIDTH / 2;
export const BOARD_VIEWPORT_CENTER_Y = BOARD_VIEWPORT_Y + BOARD_VIEWPORT_HEIGHT / 2;

export const STARTING_MOVES = 18;
export const TARGET_SCORE = 2400;
export const BOARD_ASSET_ROOT = "/game/neon-rivals/assets";

export const TILE_TYPES = [
  "tile_red",
  "tile_blue",
  "tile_green",
  "tile_yellow",
  "tile_purple",
] as const;

export type TileTextureKey = (typeof TILE_TYPES)[number];
