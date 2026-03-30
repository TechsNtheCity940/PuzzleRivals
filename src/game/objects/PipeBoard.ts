import Phaser from "phaser";
import { checkPipeConnections, generatePipePuzzle, rotatePipeCell, type PipeCell } from "@/lib/puzzle-engine";
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

interface PipeBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
}

interface PipeVisual {
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Rectangle;
  plate: Phaser.GameObjects.Rectangle;
  pipe: Phaser.GameObjects.Graphics;
  marker: Phaser.GameObjects.Arc;
}

function emptyColorProgress() {
  return TILE_TYPES.reduce((accumulator, tileType) => {
    accumulator[tileType] = 0;
    return accumulator;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

export default class PipeBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private objective = buildNeonRivalsObjective("pipe_rush", 1);
  private status: NeonRivalsGameStatus = "booting";
  private inputLocked = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 20;
  private targetScore = 1750;
  private runStartedAtMs = 0;
  private size = 4;
  private cellSize = 108;
  private gridLeft = 0;
  private gridTop = 0;
  private selectedRow = -1;
  private selectedCol = -1;
  private grid: PipeCell[][] = [];
  private visuals: PipeVisual[][] = [];
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private scanLine?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, options: PipeBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.size = this.sessionSeed % 2 === 0 ? 5 : 4;
    this.grid = checkPipeConnections(generatePipePuzzle(this.sessionSeed, this.size));
  }

  create() {
    this.movesLeft = this.objective.startingMoves;
    this.targetScore = this.objective.targetScore;
    this.runStartedAtMs = this.scene.time.now;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.selectedRow = -1;
    this.selectedCol = -1;
    this.buildBoardSurface();
    this.refreshAllVisuals();
    this.status = "running";
    this.emitState();
  }

  destroy() {
    this.visuals.flat().forEach((visual) => visual.container.destroy());
    this.boardShadow?.destroy();
    this.boardFrame?.destroy();
    this.scanLine?.destroy();
  }

  private buildBoardSurface() {
    const padding = 34;
    this.cellSize = Math.floor(Math.min(
      (BOARD_VIEWPORT_WIDTH - padding * 2) / this.size,
      (BOARD_VIEWPORT_HEIGHT - padding * 2) / this.size,
    ));
    const boardPixelWidth = this.size * this.cellSize;
    const boardPixelHeight = this.size * this.cellSize;
    this.gridLeft = Math.round(BOARD_VIEWPORT_CENTER_X - boardPixelWidth / 2);
    this.gridTop = Math.round(BOARD_VIEWPORT_CENTER_Y - boardPixelHeight / 2);

    this.boardShadow = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      boardPixelWidth + 72,
      boardPixelHeight + 72,
      0x07101f,
      0.88,
    );
    this.boardShadow.setStrokeStyle(2, 0x55deff, 0.18);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      boardPixelWidth + 36,
      boardPixelHeight + 36,
      0x09192f,
      0.54,
    );
    this.boardFrame.setStrokeStyle(3, 0x65f2ff, 0.34);
    this.boardFrame.setDepth(20);

    this.scanLine = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      this.gridTop - 18,
      boardPixelWidth + 20,
      10,
      0x5fe2ff,
      0.08,
    );
    this.scanLine.setDepth(21);
    this.scene.tweens.add({
      targets: this.scanLine,
      y: this.gridTop + boardPixelHeight + 18,
      alpha: { from: 0.03, to: 0.14 },
      duration: 2200,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.visuals = [];
    for (let row = 0; row < this.size; row += 1) {
      const currentRow: PipeVisual[] = [];
      for (let col = 0; col < this.size; col += 1) {
        const center = this.getCellCenter(row, col);
        const container = this.scene.add.container(center.x, center.y);
        container.setSize(this.cellSize, this.cellSize);
        container.setDepth(32);
        container.setInteractive(new Phaser.Geom.Rectangle(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize), Phaser.Geom.Rectangle.Contains);
        container.on("pointerdown", () => {
          void this.handleRotate(row, col);
        });

        const glow = this.scene.add.rectangle(0, 0, this.cellSize - 10, this.cellSize - 10, 0x5fe2ff, 0);
        const plate = this.scene.add.rectangle(0, 0, this.cellSize - 16, this.cellSize - 16, 0x0a1630, 0.88);
        plate.setStrokeStyle(2, 0x25567e, 0.4);
        const pipe = this.scene.add.graphics();
        const marker = this.scene.add.circle(0, 0, this.cellSize * 0.08, 0x5fe2ff, 0.9);

        glow.setDepth(0);
        plate.setDepth(1);
        pipe.setDepth(2);
        marker.setDepth(3);
        container.add([glow, plate, pipe, marker]);
        currentRow.push({ container, glow, plate, pipe, marker });
      }
      this.visuals.push(currentRow);
    }
  }

  private async handleRotate(row: number, col: number) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") {
      return;
    }

    this.inputLocked = true;
    this.selectedRow = row;
    this.selectedCol = col;
    this.movesLeft = Math.max(0, this.movesLeft - 1);
    const previousConnected = this.countConnected(this.grid);

    const nextGrid = this.grid.map((gridRow, rowIndex) =>
      gridRow.map((cell, colIndex) => (rowIndex === row && colIndex === col ? rotatePipeCell(cell) : { ...cell })),
    );
    this.grid = checkPipeConnections(nextGrid);

    const visual = this.visuals[row][col];
    const ring = this.scene.add.image(visual.container.x, visual.container.y, "impact_ring");
    ring.setTint(0x64edff);
    ring.setDepth(40);
    ring.setAlpha(0.18);
    ring.setScale(0.34);

    await Promise.all([
      this.tweenPromise(visual.container, {
        angle: visual.container.angle + 90,
        duration: 180,
        ease: "Cubic.easeOut",
      }),
      this.tweenPromise(ring, {
        alpha: 0,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 220,
        ease: "Cubic.easeOut",
      }),
    ]);
    ring.destroy();

    const connected = this.countConnected(this.grid);
    const delta = Math.max(0, connected - previousConnected);
    this.matchedTiles = connected;
    this.score += 70 + delta * 95;
    this.refreshAllVisuals();
    this.emitState();

    if (this.getProgressPercent() >= 100) {
      this.status = "complete";
      await this.playCompletion();
      this.emitState();
      this.bridge?.onComplete?.(this.snapshotState());
      return;
    }

    if (this.movesLeft <= 0) {
      this.status = "failed";
      await this.playFailure();
      this.emitState();
      this.bridge?.onFailed?.(this.snapshotState());
      return;
    }

    this.status = "running";
    this.inputLocked = false;
    this.emitState();
  }

  private refreshAllVisuals() {
    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const cell = this.grid[row][col];
        const visual = this.visuals[row][col];
        this.drawPipeVisual(cell, visual, row, col);
        visual.container.setAngle(cell.rotation);
      }
    }
  }

  private drawPipeVisual(cell: PipeCell, visual: PipeVisual, row: number, col: number) {
    const isEndpoint = Boolean(cell.isSource || cell.isSink);
    const isSelected = row === this.selectedRow && col === this.selectedCol;
    const connectedColor = isEndpoint ? 0xffec66 : 0x86f8ff;
    const baseColor = cell.isConnected ? 0x0d2546 : isSelected ? 0x11264a : 0x0a1630;
    const strokeColor = isSelected ? 0xffe86b : cell.isConnected ? 0x4fdfff : 0x21415d;
    const pipeColor = isSelected ? 0xfff089 : cell.isConnected ? connectedColor : 0x5d8aa7;
    const glowColor = isSelected ? 0xffe86b : cell.isSink ? 0xc8ff4d : isEndpoint ? 0xffec66 : 0x5fe2ff;
    const arm = this.cellSize * 0.34;
    const pipeWidth = Math.max(8, Math.round(this.cellSize * 0.13));

    visual.plate.setFillStyle(baseColor, 0.9);
    visual.plate.setStrokeStyle(2, strokeColor, isSelected ? 0.86 : cell.isConnected ? 0.7 : 0.4);
    visual.glow.setFillStyle(glowColor, isSelected ? 0.22 : cell.isConnected || isEndpoint ? 0.16 : 0.04);
    visual.marker.setFillStyle(cell.isSink ? 0xc8ff4d : 0xffec66, isEndpoint ? 0.95 : isSelected ? 0.34 : 0.12);

    visual.pipe.clear();
    visual.pipe.lineStyle(pipeWidth, pipeColor, 1);
    visual.pipe.beginPath();

    if (cell.type === "straight") {
      visual.pipe.moveTo(0, -arm);
      visual.pipe.lineTo(0, arm);
    } else if (cell.type === "corner") {
      visual.pipe.moveTo(0, -arm);
      visual.pipe.lineTo(0, 0);
      visual.pipe.lineTo(arm, 0);
    } else if (cell.type === "tee") {
      visual.pipe.moveTo(0, -arm);
      visual.pipe.lineTo(0, 0);
      visual.pipe.moveTo(-arm, 0);
      visual.pipe.lineTo(arm, 0);
    } else if (cell.type === "cross") {
      visual.pipe.moveTo(0, -arm);
      visual.pipe.lineTo(0, arm);
      visual.pipe.moveTo(-arm, 0);
      visual.pipe.lineTo(arm, 0);
    } else if (cell.type === "end") {
      visual.pipe.moveTo(0, -arm);
      visual.pipe.lineTo(0, 0);
    }

    visual.pipe.strokePath();
    visual.pipe.fillStyle(pipeColor, 0.94);
    visual.pipe.fillCircle(0, 0, pipeWidth * 0.46);
  }

  private countConnected(grid: PipeCell[][]) {
    return grid.flat().filter((cell) => cell.isConnected).length;
  }

  private getProgressPercent() {
    const total = this.grid.flat().length;
    return Math.max(0, Math.min(100, Math.round((this.countConnected(this.grid) / Math.max(total, 1)) * 100)));
  }

  private async playCompletion() {
    const burst = this.scene.add.image(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y, "combo_burst");
    burst.setTint(0x86f8ff);
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
    this.scene.cameras.main.shake(170, 0.0022);
    if (this.boardFrame) {
      await this.tweenPromise(this.boardFrame, {
        alpha: 0.2,
        duration: 180,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }
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

  private getCellCenter(row: number, col: number) {
    return {
      x: this.gridLeft + col * this.cellSize + this.cellSize / 2,
      y: this.gridTop + row * this.cellSize + this.cellSize / 2,
    };
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

