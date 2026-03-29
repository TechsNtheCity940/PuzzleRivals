import Phaser from "phaser";
import PuzzleBoard from "@/game/objects/PuzzleBoard";
import { buildNeonRivalsObjective } from "@/game/config/runModes";
import type { NeonRivalsGameBridge, NeonRivalsGameState, NeonRivalsRunMode } from "@/game/types";
import { GAME_HEIGHT, GAME_WIDTH } from "@/game/utils/constants";

interface NeonRivalsSessionConfig {
  bridge?: NeonRivalsGameBridge;
  playerName?: string;
  sessionSeed: number;
  themeLabel?: string;
  mode: NeonRivalsRunMode;
}

export default class BoardScene extends Phaser.Scene {
  private board?: PuzzleBoard;
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
    this.createBoardArt();
    this.createAmbientParticles();
    this.createHud(session.playerName ?? "Rival", session.themeLabel ?? "Neon Rivals", objective);

    this.board = new PuzzleBoard(this, {
      bridge: session.bridge,
      seed: session.sessionSeed,
      mode: session.mode,
    });
    this.board.create();

    this.events.on("board-combo", this.pulseBoardCombo, this);
    this.events.on("board-state", this.handleBoardState, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.bridge?.onReady?.();
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

  private createBoardArt() {
    const frameBase = this.add.image(GAME_WIDTH / 2, 900, "board_frame_base");
    const frameGlow = this.add.image(GAME_WIDTH / 2, 900, "board_frame_glow");
    const gridBase = this.add.image(GAME_WIDTH / 2, 804, "board_grid_base");

    frameBase.setAlpha(0.96);
    frameGlow.setAlpha(0.72);
    gridBase.setAlpha(0.96);

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
      y: { min: 280, max: 1450 },
      lifespan: 2600,
      speedY: { min: -12, max: -26 },
      speedX: { min: -4, max: 4 },
      scale: { start: 0.16, end: 0 },
      alpha: { start: 0.45, end: 0 },
      frequency: 140,
      blendMode: "ADD",
    });
  }

  private createHud(playerName: string, themeLabel: string, objective: ReturnType<typeof buildNeonRivalsObjective>) {
    this.add.text(40, 42, themeLabel.toUpperCase(), {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "28px",
      color: "#c8ff4d",
      letterSpacing: 8,
    });

    this.modeChip = this.add.text(40, 94, objective.title.toUpperCase(), {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "22px",
      color: "#5fe2ff",
      letterSpacing: 5,
    });

    this.add.text(GAME_WIDTH - 40, 46, playerName.toUpperCase(), {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "20px",
      color: "#9dc7eb",
      align: "right",
    }).setOrigin(1, 0);

    this.scoreText = this.add.text(40, 146, "Score 0", {
      fontFamily: "Arial Black, Arial",
      fontSize: "50px",
      color: "#ffffff",
    });

    this.comboText = this.add.text(40, 204, "Combo x0", {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "28px",
      color: "#5fe2ff",
    });

    this.objectiveText = this.add.text(40, 252, objective.description, {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "22px",
      color: "#dbe9ff",
      wordWrap: { width: 700 },
      lineSpacing: 8,
    });

    this.targetText = this.add.text(40, 328, objective.label, {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "24px",
      color: objective.targetColor ? "#ffe45d" : "#c8ff4d",
      wordWrap: { width: 780 },
      lineSpacing: 8,
    });

    this.movesText = this.add.text(GAME_WIDTH - 40, 92, `${objective.startingMoves} moves`, {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "28px",
      color: "#ffffff",
      align: "right",
    }).setOrigin(1, 0);
  }

  private handleBoardState(state: NeonRivalsGameState) {
    this.scoreText?.setText(`Score ${state.score.toLocaleString()}`);
    this.comboText?.setText(`Combo x${state.maxCombo}`);
    this.movesText?.setText(`${state.movesLeft} moves`);
    this.modeChip?.setText(state.objectiveTitle.toUpperCase());
    this.objectiveText?.setText(state.objectiveDescription);
    this.targetText?.setText(`${state.objectiveValue}/${state.objectiveTarget} | ${state.objectiveLabel}`);
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
