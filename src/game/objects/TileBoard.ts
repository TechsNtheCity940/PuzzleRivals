import Phaser from "phaser";
import { buildTilePuzzle, isTilePuzzleSolved } from "../../../shared/match-puzzle-contract";
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

interface TileBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

interface TileVisual {
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Rectangle;
  plate: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

function emptyColorProgress() {
  return TILE_TYPES.reduce((accumulator, tileType) => {
    accumulator[tileType] = 0;
    return accumulator;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

export default class TileBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private difficulty: 1 | 2 | 3 | 4 | 5;
  private objective = buildNeonRivalsObjective("tile_shift", 1);
  private status: NeonRivalsGameStatus = "booting";
  private inputLocked = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 28;
  private targetScore = 1700;
  private runStartedAtMs = 0;
  private size = 3;
  private cellSize = 150;
  private gridLeft = 0;
  private gridTop = 0;
  private tiles: number[] = [];
  private selectedTileValue: number | null = null;
  private cellBackgrounds: Phaser.GameObjects.Rectangle[] = [];
  private blankSlot?: Phaser.GameObjects.Rectangle;
  private tileVisuals = new Map<number, TileVisual>();
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private scanLine?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, options: TileBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.difficulty = options.difficulty ?? 4;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    const puzzle = buildTilePuzzle(this.sessionSeed, this.difficulty);
    this.size = puzzle.size;
    this.tiles = [...puzzle.tiles];
  }

  create() {
    this.movesLeft = this.objective.startingMoves;
    this.targetScore = this.objective.targetScore;
    this.runStartedAtMs = this.scene.time.now;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.selectedTileValue = null;
    this.buildBoardSurface();
    this.refreshTileVisuals();
    this.status = "running";
    this.emitState();
  }

  destroy() {
    this.cellBackgrounds.forEach((cell) => cell.destroy());
    this.blankSlot?.destroy();
    this.tileVisuals.forEach((visual) => visual.container.destroy());
    this.tileVisuals.clear();
    this.boardShadow?.destroy();
    this.boardFrame?.destroy();
    this.scanLine?.destroy();
  }

  private buildBoardSurface() {
    const padding = 42;
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
      boardPixelWidth + 80,
      boardPixelHeight + 80,
      0x06101d,
      0.9,
    );
    this.boardShadow.setStrokeStyle(2, 0x7d69ff, 0.16);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      boardPixelWidth + 42,
      boardPixelHeight + 42,
      0x0a1831,
      0.52,
    );
    this.boardFrame.setStrokeStyle(3, 0x65f2ff, 0.32);
    this.boardFrame.setDepth(20);

    this.scanLine = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      this.gridTop - 18,
      boardPixelWidth + 18,
      10,
      0xff4ed0,
      0.07,
    );
    this.scanLine.setDepth(21);
    this.scene.tweens.add({
      targets: this.scanLine,
      y: this.gridTop + boardPixelHeight + 18,
      alpha: { from: 0.02, to: 0.14 },
      duration: 2400,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.cellBackgrounds = [];
    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const center = this.getCellCenter(row, col);
        const cell = this.scene.add.rectangle(center.x, center.y, this.cellSize - 14, this.cellSize - 14, 0x101e34, 0.78);
        cell.setStrokeStyle(2, 0x2d4d79, 0.36);
        cell.setDepth(22);
        this.cellBackgrounds.push(cell);
      }
    }

    this.blankSlot = this.scene.add.rectangle(0, 0, this.cellSize - 20, this.cellSize - 20, 0x0a1630, 0.28);
    this.blankSlot.setStrokeStyle(3, 0x5fe2ff, 0.2);
    this.blankSlot.setDepth(23);
    this.blankSlot.setInteractive({ useHandCursor: true });
    this.blankSlot.on("pointerdown", () => {
      void this.handleBlankSlotTap();
    });

    for (let value = 1; value < this.size * this.size; value += 1) {
      const container = this.scene.add.container(0, 0);
      const glow = this.scene.add.rectangle(0, 0, this.cellSize - 18, this.cellSize - 18, 0x65f2ff, 0.06);
      const plate = this.scene.add.rectangle(0, 0, this.cellSize - 24, this.cellSize - 24, 0x18274a, 0.94);
      plate.setStrokeStyle(2, 0x59dfff, 0.42);
      const label = this.scene.add.text(0, 0, String(value), {
        fontFamily: "Arial Black, Arial",
        fontSize: `${Math.max(44, Math.round(this.cellSize * 0.28))}px`,
        color: "#ffffff",
      }).setOrigin(0.5);
      container.add([glow, plate, label]);
      container.setSize(this.cellSize, this.cellSize);
      container.setDepth(30);
      container.setInteractive(new Phaser.Geom.Rectangle(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize), Phaser.Geom.Rectangle.Contains);
      container.on("pointerdown", () => {
        void this.handleTileTap(value);
      });
      this.tileVisuals.set(value, { container, glow, plate, label });
    }
  }

  private async handleTileTap(value: number) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") {
      return;
    }

    const tileIndex = this.tiles.indexOf(value);
    const emptyIndex = this.tiles.indexOf(0);
    if (!this.areAdjacent(tileIndex, emptyIndex)) {
      await this.playInvalidMove(tileIndex);
      return;
    }

    this.selectedTileValue = this.selectedTileValue === value ? null : value;
    this.refreshTileVisuals();
    this.emitState();
  }

  private async handleBlankSlotTap() {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") {
      return;
    }

    const emptyIndex = this.tiles.indexOf(0);
    if (this.selectedTileValue === null) {
      await this.playInvalidMove(emptyIndex);
      return;
    }

    const tileIndex = this.tiles.indexOf(this.selectedTileValue);
    if (!this.areAdjacent(tileIndex, emptyIndex)) {
      await this.playInvalidMove(tileIndex);
      return;
    }

    this.inputLocked = true;
    this.movesLeft = Math.max(0, this.movesLeft - 1);
    const beforeCorrect = this.countCorrectTiles(this.tiles);

    this.tiles[emptyIndex] = this.selectedTileValue;
    this.tiles[tileIndex] = 0;

    const visual = this.tileVisuals.get(this.selectedTileValue);
    const target = this.getCellCenterFromIndex(emptyIndex);
    const ring = this.scene.add.image(target.x, target.y, "impact_ring");
    ring.setTint(0xff4ed0);
    ring.setDepth(40);
    ring.setAlpha(0.18);
    ring.setScale(0.34);

    await Promise.all([
      this.tweenPromise(visual?.container, {
        x: target.x,
        y: target.y,
        duration: 170,
        ease: "Cubic.easeOut",
      }),
      this.tweenPromise(ring, {
        alpha: 0,
        scaleX: 1.14,
        scaleY: 1.14,
        duration: 220,
        ease: "Cubic.easeOut",
      }),
    ]);
    ring.destroy();

    this.selectedTileValue = null;
    const afterCorrect = this.countCorrectTiles(this.tiles);
    this.matchedTiles = Math.max(0, afterCorrect - (this.tiles[this.tiles.length - 1] === 0 ? 1 : 0));
    this.score += 60 + Math.max(0, afterCorrect - beforeCorrect) * 120;
    this.refreshTileVisuals();
    this.emitState();

    if (isTilePuzzleSolved(this.tiles)) {
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

  private refreshTileVisuals() {
    const emptyIndex = this.tiles.indexOf(0);
    const blankCenter = this.getCellCenterFromIndex(emptyIndex);
    this.blankSlot?.setPosition(blankCenter.x, blankCenter.y);

    const selectedIndex = this.selectedTileValue === null ? -1 : this.tiles.indexOf(this.selectedTileValue);
    const selectedCanMove = selectedIndex >= 0 && this.areAdjacent(selectedIndex, emptyIndex);
    this.blankSlot?.setFillStyle(selectedCanMove ? 0x143a5f : 0x0a1630, selectedCanMove ? 0.44 : 0.28);
    this.blankSlot?.setStrokeStyle(3, selectedCanMove ? 0xffe86b : 0x5fe2ff, selectedCanMove ? 0.62 : 0.2);

    for (let index = 0; index < this.tiles.length; index += 1) {
      const value = this.tiles[index];
      if (value === 0) continue;
      const visual = this.tileVisuals.get(value);
      if (!visual) continue;
      const center = this.getCellCenterFromIndex(index);
      visual.container.setPosition(center.x, center.y);
      const isLocked = value === index + 1;
      const isSelected = value === this.selectedTileValue;
      visual.plate.setFillStyle(isLocked ? 0x213b1d : isSelected ? 0x2b2354 : 0x18274a, 0.96);
      visual.plate.setStrokeStyle(2, isLocked ? 0xc8ff4d : isSelected ? 0xffe86b : 0x59dfff, isLocked ? 0.82 : isSelected ? 0.84 : 0.42);
      visual.glow.setFillStyle(isLocked ? 0xc8ff4d : isSelected ? 0xffe86b : 0x65f2ff, isLocked ? 0.16 : isSelected ? 0.2 : 0.05);
      visual.label.setColor(isLocked ? "#f6ffcf" : isSelected ? "#fff7cc" : "#ffffff");
    }
  }

  private countCorrectTiles(tiles: number[]) {
    let correct = 0;
    for (let index = 0; index < tiles.length; index += 1) {
      if (index === tiles.length - 1) {
        if (tiles[index] === 0) correct += 1;
        continue;
      }
      if (tiles[index] === index + 1) {
        correct += 1;
      }
    }
    return correct;
  }

  private getProgressPercent() {
    return Math.max(0, Math.min(100, Math.round((this.countCorrectTiles(this.tiles) / this.tiles.length) * 100)));
  }

  private async playInvalidMove(tileIndex: number) {
    if (this.inputLocked) {
      return;
    }

    this.inputLocked = true;
    const point = this.getCellCenterFromIndex(tileIndex);
    const ring = this.scene.add.image(point.x, point.y, "impact_ring");
    ring.setTint(0xff4d7d);
    ring.setDepth(40);
    ring.setAlpha(0.22);
    ring.setScale(0.32);
    this.scene.cameras.main.shake(90, 0.0016);
    await this.tweenPromise(ring, {
      alpha: 0,
      scaleX: 0.98,
      scaleY: 0.98,
      duration: 180,
      ease: "Quad.easeOut",
    });
    ring.destroy();
    this.inputLocked = false;
  }

  private async playCompletion() {
    const burst = this.scene.add.image(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y, "combo_burst");
    burst.setTint(0xff4ed0);
    burst.setDepth(42);
    burst.setAlpha(0.66);
    burst.setScale(0.36);
    await this.tweenPromise(burst, {
      alpha: 0,
      scaleX: 2.3,
      scaleY: 2.3,
      duration: 460,
      ease: "Cubic.easeOut",
    });
    burst.destroy();
  }

  private async playFailure() {
    this.scene.cameras.main.shake(170, 0.0023);
    if (this.boardFrame) {
      await this.tweenPromise(this.boardFrame, {
        alpha: 0.22,
        duration: 180,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }
  }

  private buildSubmission(): PuzzleSubmission {
    return {
      kind: "tile_slide",
      tiles: [...this.tiles],
    };
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
    this.bridge?.onSubmissionChange?.(this.buildSubmission(), snapshot);
    this.bridge?.onStateChange?.(snapshot);
  }

  private areAdjacent(leftIndex: number, rightIndex: number) {
    const leftRow = Math.floor(leftIndex / this.size);
    const leftCol = leftIndex % this.size;
    const rightRow = Math.floor(rightIndex / this.size);
    const rightCol = rightIndex % this.size;
    return Math.abs(leftRow - rightRow) + Math.abs(leftCol - rightCol) === 1;
  }

  private getCellCenter(row: number, col: number) {
    return {
      x: this.gridLeft + col * this.cellSize + this.cellSize / 2,
      y: this.gridTop + row * this.cellSize + this.cellSize / 2,
    };
  }

  private getCellCenterFromIndex(index: number) {
    return this.getCellCenter(Math.floor(index / this.size), index % this.size);
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

