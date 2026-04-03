import Phaser from "phaser";
import { buildMaze, canMoveInMaze, getMazeProgress, type MazePuzzle } from "../../../shared/match-puzzle-contract";
import { buildNeonRivalsObjective, getObjectiveProgressPercent } from "@/game/config/runModes";
import type {
  NeonRivalsGameBridge,
  NeonRivalsGameState,
  NeonRivalsGameStatus,
  NeonRivalsRunMode,
} from "@/game/types";
import type { PuzzleSubmission } from "@/lib/backend";
import {
  BOARD_VIEWPORT_CENTER_X,
  BOARD_VIEWPORT_CENTER_Y,
  BOARD_VIEWPORT_HEIGHT,
  BOARD_VIEWPORT_WIDTH,
  TILE_TYPES,
  type TileTextureKey,
} from "@/game/utils/constants";

interface MazeBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

type CellSprite = {
  fill: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
  zone: Phaser.GameObjects.Zone;
};

function emptyColorProgress() {
  return TILE_TYPES.reduce((accumulator, tileType) => {
    accumulator[tileType] = 0;
    return accumulator;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

export default class MazeBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private difficulty: 1 | 2 | 3 | 4 | 5;
  private objective = buildNeonRivalsObjective("maze_rush", 1);
  private maze: MazePuzzle;
  private status: NeonRivalsGameStatus = "booting";
  private inputLocked = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 22;
  private targetScore = 1800;
  private runStartedAtMs = 0;
  private currentIndex = 0;
  private pathHistory = [0];
  private visited = new Set<number>([0]);
  private cellSize = 96;
  private gridLeft = 0;
  private gridTop = 0;
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private cellSprites: CellSprite[] = [];
  private wallGlowGraphics?: Phaser.GameObjects.Graphics;
  private wallGraphics?: Phaser.GameObjects.Graphics;
  private routeGlowGraphics?: Phaser.GameObjects.Graphics;
  private routeGraphics?: Phaser.GameObjects.Graphics;
  private scanLine?: Phaser.GameObjects.Rectangle;
  private orbCore?: Phaser.GameObjects.Arc;
  private orbGlow?: Phaser.GameObjects.Arc;
  private startNode?: Phaser.GameObjects.Arc;
  private goalNode?: Phaser.GameObjects.Arc;
  private startNodeGlow?: Phaser.GameObjects.Arc;
  private goalNodeGlow?: Phaser.GameObjects.Arc;
  private keyboardHandler?: (event: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene, options: MazeBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.difficulty = options.difficulty ?? 4;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.maze = buildMaze(this.sessionSeed, this.difficulty);
  }

  create() {
    this.movesLeft = this.objective.startingMoves;
    this.targetScore = this.objective.targetScore;
    this.runStartedAtMs = this.scene.time.now;
    this.currentIndex = 0;
    this.pathHistory = [0];
    this.visited = new Set<number>([0]);
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.matchedTiles = 0;
    this.buildBoardSurface();
    this.registerKeyboard();
    this.status = "running";
    this.emitState();
  }

  destroy() {
    if (this.keyboardHandler) {
      this.scene.input.keyboard?.off("keydown", this.keyboardHandler);
      this.keyboardHandler = undefined;
    }
    this.cellSprites.forEach((cell) => cell.zone.destroy());
    this.cellSprites.forEach((cell) => {
      cell.fill.destroy();
      cell.glow.destroy();
    });
    this.boardShadow?.destroy();
    this.boardFrame?.destroy();
    this.wallGlowGraphics?.destroy();
    this.wallGraphics?.destroy();
    this.routeGlowGraphics?.destroy();
    this.routeGraphics?.destroy();
    this.scanLine?.destroy();
    this.orbCore?.destroy();
    this.orbGlow?.destroy();
    this.startNode?.destroy();
    this.goalNode?.destroy();
    this.startNodeGlow?.destroy();
    this.goalNodeGlow?.destroy();
  }

  private buildBoardSurface() {
    const padding = 38;
    this.cellSize = Math.floor(Math.min(
      (BOARD_VIEWPORT_WIDTH - padding * 2) / this.maze.size,
      (BOARD_VIEWPORT_HEIGHT - padding * 2) / this.maze.size,
    ));
    const boardPixelWidth = this.maze.size * this.cellSize;
    const boardPixelHeight = this.maze.size * this.cellSize;
    this.gridLeft = Math.round(BOARD_VIEWPORT_CENTER_X - boardPixelWidth / 2);
    this.gridTop = Math.round(BOARD_VIEWPORT_CENTER_Y - boardPixelHeight / 2);

    this.boardShadow = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      boardPixelWidth + 74,
      boardPixelHeight + 74,
      0x050b1b,
      0.86,
    );
    this.boardShadow.setStrokeStyle(2, 0x4bd6ff, 0.16);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      boardPixelWidth + 40,
      boardPixelHeight + 40,
      0x081426,
      0.52,
    );
    this.boardFrame.setStrokeStyle(3, 0x72f5ff, 0.38);
    this.boardFrame.setDepth(20);

    this.wallGlowGraphics = this.scene.add.graphics().setDepth(26);
    this.wallGraphics = this.scene.add.graphics().setDepth(27);
    this.routeGlowGraphics = this.scene.add.graphics().setDepth(30);
    this.routeGraphics = this.scene.add.graphics().setDepth(31);

    this.createCells();
    this.drawMazeWalls();
    this.drawRoute();
    this.createNodes();
    this.createOrb();
    this.createScanLine();
    this.updateCellStyles();
  }

  private createCells() {
    const inset = Math.max(5, Math.round(this.cellSize * 0.08));
    this.cellSprites = this.maze.cells.map((_, index) => {
      const center = this.getCellCenter(index);
      const fill = this.scene.add.rectangle(center.x, center.y, this.cellSize - inset, this.cellSize - inset, 0x0a1630, 0.82);
      const glow = this.scene.add.rectangle(center.x, center.y, this.cellSize - inset - 8, this.cellSize - inset - 8, 0x5fe2ff, 0);
      const zone = this.scene.add.zone(center.x, center.y, this.cellSize, this.cellSize);
      zone.setInteractive({ useHandCursor: true });
      zone.setDepth(34);
      fill.setDepth(22);
      glow.setDepth(21);
      zone.on("pointerdown", () => {
        void this.tryMove(index);
      });
      zone.on("pointerover", () => {
        this.updateCellStyles(index);
      });
      zone.on("pointerout", () => {
        this.updateCellStyles();
      });
      return { fill, glow, zone };
    });
  }

  private createNodes() {
    const start = this.getCellCenter(0);
    const goal = this.getCellCenter(this.maze.goalIndex);

    this.startNodeGlow = this.scene.add.circle(start.x, start.y, this.cellSize * 0.26, 0x5fe2ff, 0.22).setDepth(24);
    this.startNode = this.scene.add.circle(start.x, start.y, this.cellSize * 0.14, 0x5fe2ff, 0.98).setDepth(32);
    this.goalNodeGlow = this.scene.add.circle(goal.x, goal.y, this.cellSize * 0.3, 0xc8ff4d, 0.24).setDepth(24);
    this.goalNode = this.scene.add.circle(goal.x, goal.y, this.cellSize * 0.16, 0xc8ff4d, 1).setDepth(32);

    this.scene.tweens.add({
      targets: [this.startNodeGlow, this.goalNodeGlow],
      alpha: { from: 0.18, to: 0.38 },
      scaleX: { from: 0.92, to: 1.08 },
      scaleY: { from: 0.92, to: 1.08 },
      yoyo: true,
      repeat: -1,
      duration: 1200,
      ease: "Sine.easeInOut",
    });
  }

  private createOrb() {
    const current = this.getCellCenter(this.currentIndex);
    this.orbGlow = this.scene.add.circle(current.x, current.y, this.cellSize * 0.22, 0xffec66, 0.28).setDepth(33);
    this.orbCore = this.scene.add.circle(current.x, current.y, this.cellSize * 0.11, 0xfef59a, 1).setDepth(35);

    this.scene.tweens.add({
      targets: [this.orbGlow, this.orbCore],
      alpha: { from: 0.86, to: 1 },
      scaleX: { from: 0.94, to: 1.05 },
      scaleY: { from: 0.94, to: 1.05 },
      yoyo: true,
      repeat: -1,
      duration: 620,
      ease: "Sine.easeInOut",
    });
  }

  private createScanLine() {
    this.scanLine = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      this.gridTop - 18,
      this.maze.size * this.cellSize + 18,
      12,
      0x5fe2ff,
      0.1,
    );
    this.scanLine.setDepth(29);
    this.scene.tweens.add({
      targets: this.scanLine,
      y: this.gridTop + this.maze.size * this.cellSize + 18,
      alpha: { from: 0.04, to: 0.16 },
      duration: 2400,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private drawMazeWalls() {
    this.wallGlowGraphics?.clear();
    this.wallGraphics?.clear();
    this.wallGlowGraphics?.lineStyle(16, 0x49d9ff, 0.16);
    this.wallGraphics?.lineStyle(6, 0x8ef6ff, 0.82);

    for (let index = 0; index < this.maze.cells.length; index += 1) {
      const cell = this.maze.cells[index];
      const x = this.gridLeft + (index % this.maze.size) * this.cellSize;
      const y = this.gridTop + Math.floor(index / this.maze.size) * this.cellSize;
      const lines = [] as Array<[number, number, number, number]>;

      if (cell.top) lines.push([x, y, x + this.cellSize, y]);
      if (cell.right) lines.push([x + this.cellSize, y, x + this.cellSize, y + this.cellSize]);
      if (cell.bottom) lines.push([x, y + this.cellSize, x + this.cellSize, y + this.cellSize]);
      if (cell.left) lines.push([x, y, x, y + this.cellSize]);

      for (const [x1, y1, x2, y2] of lines) {
        this.wallGlowGraphics?.beginPath();
        this.wallGlowGraphics?.moveTo(x1, y1);
        this.wallGlowGraphics?.lineTo(x2, y2);
        this.wallGlowGraphics?.strokePath();

        this.wallGraphics?.beginPath();
        this.wallGraphics?.moveTo(x1, y1);
        this.wallGraphics?.lineTo(x2, y2);
        this.wallGraphics?.strokePath();
      }
    }
  }

  private drawRoute() {
    this.routeGlowGraphics?.clear();
    this.routeGraphics?.clear();
    if (this.pathHistory.length < 2) {
      return;
    }

    this.routeGlowGraphics?.lineStyle(18, 0xffec66, 0.18);
    this.routeGraphics?.lineStyle(7, 0xffec66, 0.94);

    const start = this.getCellCenter(this.pathHistory[0]);
    this.routeGlowGraphics?.beginPath();
    this.routeGlowGraphics?.moveTo(start.x, start.y);
    this.routeGraphics?.beginPath();
    this.routeGraphics?.moveTo(start.x, start.y);

    for (const cellIndex of this.pathHistory.slice(1)) {
      const point = this.getCellCenter(cellIndex);
      this.routeGlowGraphics?.lineTo(point.x, point.y);
      this.routeGraphics?.lineTo(point.x, point.y);
    }

    this.routeGlowGraphics?.strokePath();
    this.routeGraphics?.strokePath();
  }

  private registerKeyboard() {
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (event.code === "ArrowUp") {
        void this.tryDirectionalMove(-this.maze.size);
      } else if (event.code === "ArrowRight") {
        void this.tryDirectionalMove(1);
      } else if (event.code === "ArrowDown") {
        void this.tryDirectionalMove(this.maze.size);
      } else if (event.code === "ArrowLeft") {
        void this.tryDirectionalMove(-1);
      }
    };

    this.scene.input.keyboard?.on("keydown", this.keyboardHandler);
  }

  private async tryDirectionalMove(delta: number) {
    const nextIndex = this.currentIndex + delta;
    if (nextIndex < 0 || nextIndex >= this.maze.cells.length) {
      await this.playInvalidMove();
      return;
    }

    const currentRow = Math.floor(this.currentIndex / this.maze.size);
    const nextRow = Math.floor(nextIndex / this.maze.size);
    if (Math.abs(delta) === 1 && currentRow !== nextRow) {
      await this.playInvalidMove();
      return;
    }

    await this.tryMove(nextIndex);
  }

  private async tryMove(targetIndex: number) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") {
      return;
    }

    if (!this.isAdjacent(this.currentIndex, targetIndex)) {
      await this.playInvalidMove(targetIndex);
      return;
    }

    if (!canMoveInMaze(this.maze, this.currentIndex, targetIndex)) {
      await this.playInvalidMove(targetIndex);
      return;
    }

    this.inputLocked = true;
    this.movesLeft = Math.max(0, this.movesLeft - 1);
    await this.animateMove(targetIndex);
    this.currentIndex = targetIndex;
    this.pathHistory.push(targetIndex);
    this.visited.add(targetIndex);
    this.matchedTiles = Math.max(0, this.pathHistory.length - 1);
    this.score += 140 + Math.max(0, this.movesLeft * 4);
    this.drawRoute();
    this.updateCellStyles();
    this.emitState();

    if (this.currentIndex === this.maze.goalIndex) {
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

  private async animateMove(targetIndex: number) {
    const target = this.getCellCenter(targetIndex);
    const ring = this.scene.add.image(target.x, target.y, "impact_ring");
    ring.setTint(0xffec66);
    ring.setDepth(34);
    ring.setAlpha(0.18);
    ring.setScale(0.32);

    await Promise.all([
      this.tweenPromise(this.orbCore, {
        x: target.x,
        y: target.y,
        duration: 180,
        ease: "Cubic.easeOut",
      }),
      this.tweenPromise(this.orbGlow, {
        x: target.x,
        y: target.y,
        duration: 180,
        ease: "Cubic.easeOut",
      }),
      this.tweenPromise(ring, {
        alpha: 0,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: 260,
        ease: "Cubic.easeOut",
      }),
    ]);

    ring.destroy();
  }

  private async playInvalidMove(targetIndex?: number) {
    if (this.inputLocked) {
      return;
    }

    this.inputLocked = true;
    const point = this.getCellCenter(targetIndex ?? this.currentIndex);
    const ring = this.scene.add.image(point.x, point.y, "impact_ring");
    ring.setTint(0xff4d7d);
    ring.setAlpha(0.24);
    ring.setScale(0.28);
    ring.setDepth(34);
    this.scene.cameras.main.shake(100, 0.0015);
    await this.tweenPromise(ring, {
      alpha: 0,
      scaleX: 0.96,
      scaleY: 0.96,
      duration: 180,
      ease: "Quad.easeOut",
    });
    ring.destroy();
    this.inputLocked = false;
  }

  private async playCompletion() {
    this.inputLocked = true;
    const goal = this.getCellCenter(this.maze.goalIndex);
    const burst = this.scene.add.image(goal.x, goal.y, "combo_burst");
    burst.setTint(0xc8ff4d);
    burst.setDepth(36);
    burst.setScale(0.3);
    burst.setAlpha(0.72);

    await Promise.all([
      this.tweenPromise(burst, {
        alpha: 0,
        scaleX: 2.2,
        scaleY: 2.2,
        duration: 480,
        ease: "Cubic.easeOut",
      }),
      this.tweenPromise(this.goalNodeGlow, {
        alpha: 0.6,
        scaleX: 1.35,
        scaleY: 1.35,
        duration: 380,
        ease: "Sine.easeOut",
      }),
    ]);

    burst.destroy();
  }

  private async playFailure() {
    this.inputLocked = true;
    this.scene.cameras.main.shake(180, 0.0024);
    if (this.orbGlow) {
      await this.tweenPromise(this.orbGlow, {
        alpha: 0.08,
        duration: 220,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }
  }

  private updateCellStyles(hoverIndex?: number) {
    const currentRow = Math.floor(this.currentIndex / this.maze.size);
    const currentCol = this.currentIndex % this.maze.size;

    this.cellSprites.forEach((cell, index) => {
      const row = Math.floor(index / this.maze.size);
      const col = index % this.maze.size;
      const isCurrent = index === this.currentIndex;
      const isGoal = index === this.maze.goalIndex;
      const isHovered = hoverIndex === index;
      const isNeighbor = Math.abs(currentRow - row) + Math.abs(currentCol - col) === 1;
      const canStep = isNeighbor && canMoveInMaze(this.maze, this.currentIndex, index);
      const wasVisited = this.visited.has(index);

      let fillColor = 0x0a1630;
      let fillAlpha = 0.84;
      let glowColor = 0x5fe2ff;
      let glowAlpha = 0;

      if (wasVisited) {
        fillColor = 0x0d2340;
        fillAlpha = 0.94;
      }

      if (canStep) {
        glowColor = 0x59dfff;
        glowAlpha = isHovered ? 0.28 : 0.16;
      }

      if (isGoal) {
        fillColor = 0x15240a;
        glowColor = 0xc8ff4d;
        glowAlpha = Math.max(glowAlpha, 0.18);
      }

      if (isCurrent) {
        fillColor = 0x1f2d08;
        glowColor = 0xffec66;
        glowAlpha = 0.24;
      }

      cell.fill.setFillStyle(fillColor, fillAlpha);
      cell.glow.setFillStyle(glowColor, glowAlpha);
    });
  }

  private isAdjacent(fromIndex: number, toIndex: number) {
    const fromRow = Math.floor(fromIndex / this.maze.size);
    const fromCol = fromIndex % this.maze.size;
    const toRow = Math.floor(toIndex / this.maze.size);
    const toCol = toIndex % this.maze.size;
    return Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol) === 1;
  }

  private getCellCenter(index: number) {
    const row = Math.floor(index / this.maze.size);
    const col = index % this.maze.size;
    return {
      x: this.gridLeft + col * this.cellSize + this.cellSize / 2,
      y: this.gridTop + row * this.cellSize + this.cellSize / 2,
    };
  }

  private buildSubmission(): PuzzleSubmission {
    return {
      kind: "maze",
      position: this.currentIndex,
    };
  }

  private snapshotState(): NeonRivalsGameState {
    const objectiveValue = this.currentIndex === this.maze.goalIndex
      ? 100
      : getMazeProgress(this.maze, this.currentIndex);

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
    this.bridge?.onSubmissionChange?.(this.buildSubmission(), snapshot);
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
