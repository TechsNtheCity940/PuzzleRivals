import Phaser from "phaser";
import { buildNeonRivalsObjective } from "@/game/config/runModes";
import type {
  NeonRivalsBoardFamily,
  NeonRivalsGameBridge,
  NeonRivalsGameState,
  NeonRivalsMatchContext,
  NeonRivalsRunMode,
} from "@/game/types";
import GlyphBoard from "@/game/objects/GlyphBoard";
import LinkBoard from "@/game/objects/LinkBoard";
import MemoryBoard from "@/game/objects/MemoryBoard";
import MazeBoard from "@/game/objects/MazeBoard";
import MirrorBoard from "@/game/objects/MirrorBoard";
import NumberBoard from "@/game/objects/NumberBoard";
import PipeBoard from "@/game/objects/PipeBoard";
import PuzzleBoard from "@/game/objects/PuzzleBoard";
import QuizBoard from "@/game/objects/QuizBoard";
import SpatialBoard from "@/game/objects/SpatialBoard";
import StrategyBoard from "@/game/objects/StrategyBoard";
import TileBoard from "@/game/objects/TileBoard";
import {
  BOARD_VIEWPORT_CENTER_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
} from "@/game/utils/constants";

interface NeonRivalsSessionConfig {
  bridge?: NeonRivalsGameBridge;
  playerName?: string;
  sessionSeed: number;
  themeLabel?: string;
  mode: NeonRivalsRunMode;
  hudVariant?: "standalone" | "match";
  matchContext?: NeonRivalsMatchContext | null;
  difficultyOverride?: 1 | 2 | 3 | 4 | 5 | null;
}

interface ArenaBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  puzzleType?: NeonRivalsMatchContext["puzzleType"];
}

type ArenaBoardInstance =
  | Pick<PuzzleBoard, "create" | "destroy">
  | Pick<MazeBoard, "create" | "destroy">
  | Pick<PipeBoard, "create" | "destroy">
  | Pick<LinkBoard, "create" | "destroy">
  | Pick<MirrorBoard, "create" | "destroy">
  | Pick<TileBoard, "create" | "destroy">
  | Pick<NumberBoard, "create" | "destroy">
  | Pick<SpatialBoard, "create" | "destroy">
  | Pick<StrategyBoard, "create" | "destroy">
  | Pick<QuizBoard, "create" | "destroy">
  | Pick<MemoryBoard, "create" | "destroy">
  | Pick<GlyphBoard, "create" | "destroy">;

function boardMetricText(state: NeonRivalsGameState) {
  if (state.boardFamily === "maze") {
    return `Route steps ${state.matchedTiles}`;
  }

  if (state.boardFamily === "pipe") {
    return `Connected ${state.matchedTiles}`;
  }

  if (state.boardFamily === "link") {
    return `Locked pairs ${state.matchedTiles}`;
  }

  if (state.boardFamily === "mirror") {
    return `Targets lit ${state.matchedTiles}`;
  }

  if (state.boardFamily === "tile") {
    return `Locked ${state.matchedTiles}`;
  }

  if (state.boardFamily === "number") {
    return `Correct cells ${state.matchedTiles}`;
  }

  if (state.boardFamily === "spatial") {
    return `Solved shapes ${state.matchedTiles}`;
  }

  if (state.boardFamily === "strategy") {
    return `Solved tactics ${state.matchedTiles}`;
  }

  if (state.boardFamily === "quiz") {
    return `Solved prompts ${state.matchedTiles}`;
  }

  if (state.boardFamily === "memory") {
    return `Patterns held ${state.matchedTiles}`;
  }

  if (state.boardFamily === "glyph") {
    return `Sigils rebuilt ${state.matchedTiles}`;
  }

  return `Combo x${state.maxCombo}`;
}

function getGridTint(boardFamily: NeonRivalsBoardFamily) {
  if (boardFamily === "tile") return 0xff7de2;
  if (boardFamily === "pipe") return 0x87f8ff;
  if (boardFamily === "link") return 0xc8ff4d;
  if (boardFamily === "mirror") return 0xffc95e;
  if (boardFamily === "number") return 0x72f5ff;
  if (boardFamily === "spatial") return 0xb88aff;
  if (boardFamily === "strategy") return 0xffd76e;
  if (boardFamily === "quiz") return 0x65f2ff;
  if (boardFamily === "memory") return 0xff92d9;
  if (boardFamily === "glyph") return 0xffb86b;
  return 0xffffff;
}

export default class BoardScene extends Phaser.Scene {
  private board?: ArenaBoardInstance;
  private bridge?: NeonRivalsGameBridge;
  private scoreText?: Phaser.GameObjects.Text;
  private comboText?: Phaser.GameObjects.Text;
  private movesText?: Phaser.GameObjects.Text;
  private objectiveText?: Phaser.GameObjects.Text;
  private targetText?: Phaser.GameObjects.Text;
  private modeChip?: Phaser.GameObjects.Text;

  constructor() {
    super("BoardScene");
  }

  create() {
    const session = (this.registry.get("neon-rivals-session") ?? {}) as NeonRivalsSessionConfig;
    this.bridge = session.bridge;
    const objective = buildNeonRivalsObjective(session.mode, session.sessionSeed);

    this.createBackground();
    this.createBoardArt(objective.boardFamily);
    this.createAmbientParticles();

    if (session.hudVariant !== "match") {
      this.createHud(
        session.playerName ?? "Rival",
        session.themeLabel ?? "Neon Rivals",
        objective,
      );
    }

    this.board = this.createBoardForFamily(objective.boardFamily, {
      bridge: session.bridge,
      seed: session.sessionSeed,
      mode: session.mode,
      difficulty: session.difficultyOverride ?? session.matchContext?.difficulty,
      puzzleType: session.matchContext?.puzzleType,
    });
    this.board.create();

    this.events.on("board-combo", this.pulseBoardCombo, this);
    this.events.on("board-state", this.handleBoardState, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.bridge?.onReady?.();
  }

  private createBoardForFamily(
    boardFamily: NeonRivalsBoardFamily,
    boardOptions: ArenaBoardOptions,
  ): ArenaBoardInstance {
    if (boardFamily === "maze") {
      return new MazeBoard(this, boardOptions);
    }

    if (boardFamily === "pipe") {
      return new PipeBoard(this, boardOptions);
    }

    if (boardFamily === "link") {
      return new LinkBoard(this, boardOptions);
    }

    if (boardFamily === "mirror") {
      return new MirrorBoard(this, boardOptions);
    }

    if (boardFamily === "tile") {
      return new TileBoard(this, boardOptions);
    }

    if (boardFamily === "number") {
      return new NumberBoard(this, boardOptions);
    }

    if (boardFamily === "spatial") {
      return new SpatialBoard(this, boardOptions);
    }

    if (boardFamily === "strategy") {
      return new StrategyBoard(this, boardOptions);
    }

    if (boardFamily === "quiz") {
      return new QuizBoard(this, boardOptions);
    }

    if (boardFamily === "memory") {
      return new MemoryBoard(this, boardOptions);
    }

    if (boardFamily === "glyph") {
      return new GlyphBoard(this, boardOptions);
    }

    return new PuzzleBoard(this, boardOptions);
  }

  private createBackground() {
    const bgFar = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "board_bg_far");
    const bgMid = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "board_bg_mid");

    bgFar.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    bgMid.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    bgFar.setAlpha(0.96);
    bgMid.setAlpha(0.92);

    this.tweens.add({
      targets: bgMid,
      y: GAME_HEIGHT / 2 + 12,
      alpha: { from: 0.82, to: 1 },
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private createBoardArt(boardFamily: NeonRivalsBoardFamily) {
    const frameBase = this.add.image(
      GAME_WIDTH / 2,
      BOARD_VIEWPORT_CENTER_Y + 20,
      "board_frame_base",
    );
    const frameGlow = this.add.image(
      GAME_WIDTH / 2,
      BOARD_VIEWPORT_CENTER_Y + 20,
      "board_frame_glow",
    );
    const gridBase = this.add.image(
      GAME_WIDTH / 2,
      BOARD_VIEWPORT_CENTER_Y - 18,
      "board_grid_base",
    );

    frameBase.setAlpha(0.96);
    frameGlow.setAlpha(0.72);
    gridBase.setAlpha(boardFamily === "match3" ? 0.96 : 0.42);
    gridBase.setTint(getGridTint(boardFamily));

    this.tweens.add({
      targets: frameGlow,
      alpha: { from: 0.5, to: 0.94 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private createAmbientParticles() {
    this.add.particles(0, 0, "particles_soft", {
      x: { min: 120, max: 960 },
      y: { min: 180, max: GAME_HEIGHT - 120 },
      lifespan: 2600,
      speedY: { min: -12, max: -26 },
      speedX: { min: -4, max: 4 },
      scale: { start: 0.16, end: 0 },
      alpha: { start: 0.45, end: 0 },
      frequency: 140,
      blendMode: "ADD",
    });
  }

  private createHud(
    playerName: string,
    themeLabel: string,
    objective: ReturnType<typeof buildNeonRivalsObjective>,
  ) {
    this.add.text(24, 18, themeLabel.toUpperCase(), {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "11px",
      color: "#c8ff4d",
      letterSpacing: 5,
    });

    this.modeChip = this.add.text(24, 38, objective.title.toUpperCase(), {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "13px",
      color: "#5fe2ff",
      letterSpacing: 3,
    });

    this.add
      .text(GAME_WIDTH - 24, 18, playerName.toUpperCase(), {
        fontFamily: "Chakra Petch, Arial",
        fontSize: "11px",
        color: "#9dc7eb",
        align: "right",
      })
      .setOrigin(1, 0);

    this.scoreText = this.add.text(24, 58, "Score 0", {
      fontFamily: "Arial Black, Arial",
      fontSize: "19px",
      color: "#ffffff",
    });

    this.comboText = this.add.text(
      24,
      84,
      objective.boardFamily === "match3" ? "Combo x0" : "Board metric 0",
      {
        fontFamily: "Chakra Petch, Arial",
        fontSize: "12px",
        color: "#5fe2ff",
      },
    );

    this.objectiveText = this.add.text(24, 102, objective.description, {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "11px",
      color: "#dbe9ff",
      wordWrap: { width: 360 },
      lineSpacing: 3,
    });

    this.targetText = this.add.text(24, 142, objective.label, {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "12px",
      color: objective.targetColor ? "#ffe45d" : "#c8ff4d",
      wordWrap: { width: 520 },
      lineSpacing: 3,
    });

    this.movesText = this.add
      .text(
        GAME_WIDTH - 24,
        44,
        `${objective.startingMoves} ${objective.resourceLabel}`,
        {
          fontFamily: "Chakra Petch, Arial",
          fontSize: "14px",
          color: "#ffffff",
          align: "right",
        },
      )
      .setOrigin(1, 0);
  }

  private handleBoardState(state: NeonRivalsGameState) {
    this.scoreText?.setText(`Score ${state.score.toLocaleString()}`);
    this.comboText?.setText(boardMetricText(state));
    this.movesText?.setText(`${state.movesLeft} ${state.resourceLabel}`);
    this.modeChip?.setText(state.objectiveTitle.toUpperCase());
    this.objectiveText?.setText(state.objectiveDescription);
    this.targetText?.setText(
      `${state.objectiveValue}/${state.objectiveTarget} | ${state.objectiveLabel}`,
    );
    this.targetText?.setColor(state.targetColor ? "#ffe45d" : "#c8ff4d");
  }

  private pulseBoardCombo() {
    const flash = this.add.image(GAME_WIDTH / 2, 804, "combo_burst");
    flash.setScale(0.68);
    flash.setAlpha(0.52);

    this.tweens.add({
      targets: flash,
      scaleX: 1.9,
      scaleY: 1.9,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  private handleShutdown() {
    this.events.off("board-combo", this.pulseBoardCombo, this);
    this.events.off("board-state", this.handleBoardState, this);
    this.board?.destroy();
    this.board = undefined;
  }
}
