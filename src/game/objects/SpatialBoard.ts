import Phaser from "phaser";
import { buildSpatialRounds, type ShapeCells, type SpatialRound } from "../../../shared/match-puzzle-contract";
import { buildNeonRivalsObjective, getObjectiveProgressPercent } from "@/game/config/runModes";
import type {
  NeonRivalsGameBridge,
  NeonRivalsGameState,
  NeonRivalsGameStatus,
  NeonRivalsRunMode,
} from "@/game/types";
import {
  BOARD_VIEWPORT_CENTER_X,
  BOARD_VIEWPORT_CENTER_Y,
  BOARD_VIEWPORT_HEIGHT,
  BOARD_VIEWPORT_WIDTH,
  TILE_TYPES,
  type TileTextureKey,
} from "@/game/utils/constants";

interface SpatialBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
}

interface ShapePanelVisual {
  width: number;
  height: number;
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Rectangle;
  blockLayer: Phaser.GameObjects.Container;
}

function emptyColorProgress() {
  return TILE_TYPES.reduce((accumulator, tileType) => {
    accumulator[tileType] = 0;
    return accumulator;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

export default class SpatialBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private objective = buildNeonRivalsObjective("spatial_spin", 1);
  private rounds: SpatialRound[] = [];
  private status: NeonRivalsGameStatus = "booting";
  private inputLocked = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 12;
  private targetScore = 1680;
  private runStartedAtMs = 0;
  private roundIndex = 0;
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private scanLine?: Phaser.GameObjects.Rectangle;
  private instructionText?: Phaser.GameObjects.Text;
  private roundText?: Phaser.GameObjects.Text;
  private helperText?: Phaser.GameObjects.Text;
  private basePanel?: ShapePanelVisual;
  private optionPanels: ShapePanelVisual[] = [];

  constructor(scene: Phaser.Scene, options: SpatialBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.rounds = buildSpatialRounds(this.sessionSeed, 4);
  }

  create() {
    this.movesLeft = this.objective.startingMoves;
    this.targetScore = this.objective.targetScore;
    this.runStartedAtMs = this.scene.time.now;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.matchedTiles = 0;
    this.roundIndex = 0;
    this.buildBoardSurface();
    this.renderRound();
    this.status = "running";
    this.emitState();
  }

  destroy() {
    this.boardShadow?.destroy();
    this.boardFrame?.destroy();
    this.scanLine?.destroy();
    this.instructionText?.destroy();
    this.roundText?.destroy();
    this.helperText?.destroy();
    this.basePanel?.container.destroy();
    this.optionPanels.forEach((panel) => panel.container.destroy());
  }

  private buildBoardSurface() {
    const panelWidth = Math.min(BOARD_VIEWPORT_WIDTH - 60, 700);
    const panelHeight = Math.min(BOARD_VIEWPORT_HEIGHT - 40, 700);

    this.boardShadow = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      panelWidth + 80,
      panelHeight + 80,
      0x07101f,
      0.9,
    );
    this.boardShadow.setStrokeStyle(2, 0x6d81ff, 0.16);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      panelWidth + 34,
      panelHeight + 34,
      0x09182f,
      0.54,
    );
    this.boardFrame.setStrokeStyle(3, 0x65f2ff, 0.24);
    this.boardFrame.setDepth(20);

    this.scanLine = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y - panelHeight / 2,
      panelWidth + 24,
      10,
      0xb88aff,
      0.08,
    );
    this.scanLine.setDepth(21);
    this.scene.tweens.add({
      targets: this.scanLine,
      y: BOARD_VIEWPORT_CENTER_Y + panelHeight / 2,
      alpha: { from: 0.03, to: 0.15 },
      duration: 2200,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.roundText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y - 292, "ROUND 1/1", {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "24px",
      color: "#65f2ff",
      letterSpacing: 6,
      align: "center",
    }).setOrigin(0.5).setDepth(28);

    this.instructionText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y - 248, "", {
      fontFamily: "Arial Black, Arial",
      fontSize: "34px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 600 },
    }).setOrigin(0.5, 0).setDepth(28);

    this.helperText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y - 176, "Track the anchor blocks. The right answer lights the next frame immediately.", {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "18px",
      color: "#b8c9de",
      align: "center",
      wordWrap: { width: 620 },
    }).setOrigin(0.5, 0).setDepth(28);

    this.basePanel = this.createShapePanel(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y - 38, 260, 220, false);

    const optionY = BOARD_VIEWPORT_CENTER_Y + 210;
    const optionXLeft = BOARD_VIEWPORT_CENTER_X - 150;
    const optionXRight = BOARD_VIEWPORT_CENTER_X + 150;
    this.optionPanels = [
      this.createShapePanel(optionXLeft, optionY - 100, 220, 180, true, 0),
      this.createShapePanel(optionXRight, optionY - 100, 220, 180, true, 1),
      this.createShapePanel(optionXLeft, optionY + 104, 220, 180, true, 2),
      this.createShapePanel(optionXRight, optionY + 104, 220, 180, true, 3),
    ];
  }

  private createShapePanel(
    x: number,
    y: number,
    width: number,
    height: number,
    interactive: boolean,
    optionIndex?: number,
  ) {
    const container = this.scene.add.container(x, y);
    container.setSize(width, height);
    container.setDepth(30);

    const glow = this.scene.add.rectangle(0, 0, width, height, 0x7c6eff, 0.06);
    const frame = this.scene.add.rectangle(0, 0, width - 10, height - 10, 0x101c34, 0.94);
    frame.setStrokeStyle(2, 0x36537f, 0.42);
    const blockLayer = this.scene.add.container(0, 0);

    container.add([glow, frame, blockLayer]);

    if (interactive && typeof optionIndex === "number") {
      container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
      container.on("pointerdown", () => {
        void this.handleOption(optionIndex);
      });
      container.on("pointerover", () => {
        if (!this.inputLocked && this.status === "running") {
          glow.setFillStyle(0x65f2ff, 0.12);
          frame.setStrokeStyle(2, 0x65f2ff, 0.62);
        }
      });
      container.on("pointerout", () => {
        this.resetOptionPanel(optionIndex);
      });
    }

    return { width, height, container, glow, frame, blockLayer };
  }

  private renderRound() {
    const round = this.rounds[this.roundIndex];
    this.roundText?.setText(`ROUND ${this.roundIndex + 1}/${this.rounds.length}`);
    this.instructionText?.setText(round.instruction.toUpperCase());
    this.helperText?.setText("Track the anchor blocks mentally. Clean reads chain the next shape faster.");

    if (this.basePanel) {
      this.basePanel.glow.setFillStyle(0x65f2ff, 0.08);
      this.basePanel.frame.setStrokeStyle(2, 0x65f2ff, 0.54);
      this.renderShape(this.basePanel, round.base, 0x65f2ff, 30);
      this.scene.tweens.add({
        targets: this.basePanel.container,
        scaleX: 1.03,
        scaleY: 1.03,
        yoyo: true,
        repeat: -1,
        duration: 900,
        ease: "Sine.easeInOut",
      });
    }

    this.optionPanels.forEach((panel, index) => {
      this.resetOptionPanel(index);
      this.renderShape(panel, round.options[index], 0xfff089, 24);
    });
  }

  private resetOptionPanel(index: number) {
    const panel = this.optionPanels[index];
    panel.glow.setFillStyle(0x7c6eff, 0.05);
    panel.frame.setStrokeStyle(2, 0x36537f, 0.42);
    panel.container.setScale(1);
    panel.container.setAngle(0);
  }

  private renderShape(panel: ShapePanelVisual, cells: ShapeCells, color: number, blockSize: number) {
    panel.blockLayer.removeAll(true);

    const cellArea = blockSize * 4;
    const originX = -cellArea / 2 + blockSize / 2;
    const originY = -cellArea / 2 + blockSize / 2 + 4;

    Array.from({ length: 16 }, (_, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      const bg = this.scene.add.rectangle(originX + col * blockSize, originY + row * blockSize, blockSize - 6, blockSize - 6, 0x0b1323, 0.4);
      bg.setStrokeStyle(1, 0x1d314b, 0.24);
      panel.blockLayer.add(bg);
      return bg;
    });

    cells.forEach(([row, col]) => {
      const x = originX + col * blockSize;
      const y = originY + row * blockSize;
      const glow = this.scene.add.rectangle(x, y, blockSize - 2, blockSize - 2, color, 0.12);
      const block = this.scene.add.rectangle(x, y, blockSize - 8, blockSize - 8, color, 0.94);
      block.setStrokeStyle(2, 0xffffff, 0.22);
      panel.blockLayer.add([glow, block]);
      this.scene.tweens.add({
        targets: [glow, block],
        alpha: { from: 0.72, to: 1 },
        scaleX: { from: 0.95, to: 1.03 },
        scaleY: { from: 0.95, to: 1.03 },
        yoyo: true,
        repeat: -1,
        duration: 860,
        ease: "Sine.easeInOut",
      });
    });
  }

  private async handleOption(optionIndex: number) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") {
      return;
    }

    const round = this.rounds[this.roundIndex];
    const panel = this.optionPanels[optionIndex];
    this.inputLocked = true;
    this.movesLeft = Math.max(0, this.movesLeft - 1);

    if (optionIndex === round.correctOption) {
      this.score += 180 + Math.max(0, this.movesLeft * 6);
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.matchedTiles = this.roundIndex + 1;
      await this.playCorrectOption(panel);

      if (this.roundIndex === this.rounds.length - 1) {
        this.status = "complete";
        this.emitState();
        await this.playCompletion();
        this.emitState();
        this.bridge?.onComplete?.(this.snapshotState());
        return;
      }

      this.roundIndex += 1;
      this.status = "running";
      this.renderRound();
      this.inputLocked = false;
      this.emitState();
      return;
    }

    this.combo = 0;
    this.score += 40;
    await this.playWrongOption(panel);

    if (this.movesLeft <= 0) {
      this.status = "failed";
      this.emitState();
      await this.playFailure();
      this.emitState();
      this.bridge?.onFailed?.(this.snapshotState());
      return;
    }

    this.status = "running";
    this.inputLocked = false;
    this.emitState();
  }

  private async playCorrectOption(panel: ShapePanelVisual) {
    panel.glow.setFillStyle(0xc8ff4d, 0.18);
    panel.frame.setStrokeStyle(2, 0xc8ff4d, 0.8);

    const beam = this.scene.add.graphics().setDepth(41);
    beam.lineStyle(8, 0xc8ff4d, 0.22);
    beam.beginPath();
    beam.moveTo(this.basePanel?.container.x ?? BOARD_VIEWPORT_CENTER_X, this.basePanel?.container.y ?? BOARD_VIEWPORT_CENTER_Y);
    beam.lineTo(panel.container.x, panel.container.y);
    beam.strokePath();

    const burst = this.scene.add.image(panel.container.x, panel.container.y, "impact_ring");
    burst.setTint(0xc8ff4d);
    burst.setDepth(42);
    burst.setAlpha(0.22);
    burst.setScale(0.36);

    await Promise.all([
      this.tweenPromise(panel.container, {
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 180,
        yoyo: true,
        ease: "Sine.easeInOut",
      }),
      this.tweenPromise(burst, {
        alpha: 0,
        scaleX: 1.22,
        scaleY: 1.22,
        duration: 220,
        ease: "Cubic.easeOut",
      }),
    ]);

    burst.destroy();
    beam.destroy();
  }

  private async playWrongOption(panel: ShapePanelVisual) {
    panel.glow.setFillStyle(0xff5d8f, 0.14);
    panel.frame.setStrokeStyle(2, 0xff5d8f, 0.78);
    this.scene.cameras.main.shake(100, 0.0017);
    await this.tweenPromise(panel.container, {
      angle: 4,
      duration: 70,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
    });
    panel.container.setAngle(0);
    panel.glow.setFillStyle(0x7c6eff, 0.05);
    panel.frame.setStrokeStyle(2, 0x36537f, 0.42);
  }

  private async playCompletion() {
    const burst = this.scene.add.image(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y, "combo_burst");
    burst.setTint(0xb88aff);
    burst.setDepth(42);
    burst.setAlpha(0.64);
    burst.setScale(0.38);
    await this.tweenPromise(burst, {
      alpha: 0,
      scaleX: 2.4,
      scaleY: 2.4,
      duration: 460,
      ease: "Cubic.easeOut",
    });
    burst.destroy();
  }

  private async playFailure() {
    this.scene.cameras.main.shake(170, 0.002);
    if (this.boardFrame) {
      await this.tweenPromise(this.boardFrame, {
        alpha: 0.2,
        duration: 180,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }
  }

  private getProgressPercent() {
    return Math.max(0, Math.min(100, Math.round((this.matchedTiles / Math.max(this.rounds.length, 1)) * 100)));
  }

  private snapshotState(): NeonRivalsGameState {
    const objectiveValue = this.getProgressPercent();
    return {
      status: this.status,
      mode: this.mode,
      boardFamily: this.objective.boardFamily,
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      movesLeft: this.movesLeft,
      resourceLabel: this.objective.resourceLabel,
      targetScore: this.targetScore,
      matchedTiles: this.matchedTiles,
      objectiveTitle: this.objective.title,
      objectiveLabel: this.objective.label,
      objectiveDescription: this.objective.description,
      objectiveValue,
      objectiveTarget: this.objective.targetValue,
      objectiveProgressPercent: getObjectiveProgressPercent(objectiveValue, this.objective.targetValue),
      clearedByColor: emptyColorProgress(),
      durationMs: Math.max(0, Math.round(this.scene.time.now - this.runStartedAtMs)),
      seed: this.sessionSeed,
    };
  }

  private emitState() {
    const snapshot = this.snapshotState();
    this.scene.events.emit("board-state", snapshot);
    this.bridge?.onStateChange?.(snapshot);
  }

  private tweenPromise(
    target: Phaser.Tweens.TweenTarget | undefined,
    config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, "targets">,
  ) {
    if (!target) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: target,
        ...config,
        onComplete: () => resolve(),
      });
    });
  }
}
