import Phaser from "phaser";
import { BOARD_ASSET_ROOT } from "@/game/utils/constants";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.image("board_bg_far", `${BOARD_ASSET_ROOT}/board/board_bg_far.png`);
    this.load.image("board_bg_mid", `${BOARD_ASSET_ROOT}/board/board_bg_mid.png`);
    this.load.image("board_frame_base", `${BOARD_ASSET_ROOT}/board/board_frame_base.png`);
    this.load.image("board_frame_glow", `${BOARD_ASSET_ROOT}/board/board_frame_glow.png`);
    this.load.image("board_grid_base", `${BOARD_ASSET_ROOT}/board/board_grid_base.png`);

    this.load.image("combo_burst", `${BOARD_ASSET_ROOT}/fx/combo_burst.png`);
    this.load.image("impact_ring", `${BOARD_ASSET_ROOT}/fx/impact_ring.png`);
    this.load.image("particles_soft", `${BOARD_ASSET_ROOT}/fx/particles_soft.png`);

    this.load.image("tile_red", `${BOARD_ASSET_ROOT}/tiles/tile_red.png`);
    this.load.image("tile_blue", `${BOARD_ASSET_ROOT}/tiles/tile_blue.png`);
    this.load.image("tile_green", `${BOARD_ASSET_ROOT}/tiles/tile_green.png`);
    this.load.image("tile_yellow", `${BOARD_ASSET_ROOT}/tiles/tile_yellow.png`);
    this.load.image("tile_purple", `${BOARD_ASSET_ROOT}/tiles/tile_purple.png`);
  }

  create() {
    this.scene.start("BoardScene");
  }
}
