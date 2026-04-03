import Phaser from "phaser";
import BootScene from "@/game/scenes/BootScene";
import BoardScene from "@/game/scenes/BoardScene";
import type {
  NeonRivalsGameBridge,
  NeonRivalsMatchContext,
  NeonRivalsRunMode,
} from "@/game/types";
import { GAME_HEIGHT, GAME_WIDTH } from "@/game/utils/constants";

interface CreateNeonRivalsGameOptions {
  parent: HTMLElement;
  bridge?: NeonRivalsGameBridge;
  playerName?: string;
  sessionSeed: number;
  themeLabel?: string;
  mode: NeonRivalsRunMode;
  hudVariant?: "standalone" | "match";
  matchContext?: NeonRivalsMatchContext | null;
}

export function createNeonRivalsGame({
  parent,
  bridge,
  playerName,
  sessionSeed,
  themeLabel,
  mode,
  hudVariant = "standalone",
  matchContext = null,
}: CreateNeonRivalsGameOptions) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#070b14",
    scene: [BootScene, BoardScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      roundPixels: false,
    },
    input: {
      activePointers: 1,
    },
    callbacks: {
      postBoot: (game) => {
        game.registry.set("neon-rivals-session", {
          bridge,
          playerName,
          sessionSeed,
          themeLabel,
          mode,
          hudVariant,
          matchContext,
        });
      },
    },
  });
}
