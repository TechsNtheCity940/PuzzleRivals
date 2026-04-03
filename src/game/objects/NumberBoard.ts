import Phaser from "phaser";
import { buildNumberGrid, type NumberGridPuzzle } from "../../../shared/match-puzzle-contract";
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

interface NumberBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

interface NumberCellVisual {
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Rectangle;
  plate: Phaser.GameObjects.Rectangle;
  value: Phaser.GameObjects.Text;
}

interface KeypadButtonVisual {
  value: number | null;
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

export default class NumberBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private difficulty: 1 | 2 | 3 | 4 | 5;
  private objective = buildNeonRivalsObjective("number_crunch", 1);
  private puzzle: NumberGridPuzzle;
  private status: NeonRivalsGameStatus = "booting";
  private inputLocked = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 18;
  private targetScore = 1725;
  private runStartedAtMs = 0;
  private values: (number | null)[] = [];
  private blankIndices: number[] = [];
  private selectedIndex: number | null = null;
  private size = 3;
  private cellSize = 118;
  private gridLeft = 0;
  private gridTop = 0;
  private keypadTop = 0;
  private keypadButtonSize = 70;
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private scanLine?: Phaser.GameObjects.Rectangle;
  private cells: NumberCellVisual[] = [];
  private keypadButtons: KeypadButtonVisual[] = [];
  private rowLabels: Phaser.GameObjects.Text[] = [];
  private colLabels: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, options: NumberBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.difficulty = options.difficulty ?? 4;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.puzzle = buildNumberGrid(this.sessionSeed, this.difficulty);
    this.size = this.puzzle.size;
    this.values = [...this.puzzle.grid];
    this.blankIndices = this.puzzle.grid.reduce<number[]>((accumulator, value, index) => {
      if (value === null) {
        accumulator.push(index);
      }
      return accumulator;
    }, []);
    this.selectedIndex = this.blankIndices[0] ?? null;
  }

  create() {
    this.movesLeft = this.objective.startingMoves;
    this.targetScore = this.objective.targetScore;
    this.runStartedAtMs = this.scene.time.now;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.values = [...this.puzzle.grid];
    this.selectedIndex = this.blankIndices[0] ?? null;
    this.buildBoardSurface();
    this.refreshBoard();
    this.status = "running";
    this.emitState();
  }

  destroy() {
    this.cells.forEach((cell) => cell.container.destroy());
    this.keypadButtons.forEach((button) => button.container.destroy());
    this.rowLabels.forEach((label) => label.destroy());
    this.colLabels.forEach((label) => label.destroy());
    this.boardShadow?.destroy();
    this.boardFrame?.destroy();
    this.scanLine?.destroy();
  }

  private buildBoardSurface() {
    const maxCellSizeByHeight = Math.floor((BOARD_VIEWPORT_HEIGHT - 330) / this.size);
    const maxCellSizeByWidth = Math.floor((BOARD_VIEWPORT_WIDTH - 210) / this.size);
    this.cellSize = Math.max(98, Math.min(128, maxCellSizeByHeight, maxCellSizeByWidth));
    this.keypadButtonSize = Math.max(62, Math.min(74, Math.floor((BOARD_VIEWPORT_WIDTH - 220) / 3)));

    const gridWidth = this.size * this.cellSize;
    const gridHeight = this.size * this.cellSize;
    const totalHeight = gridHeight + 66 + (this.keypadButtonSize * 4) + 42;

    this.gridLeft = Math.round(BOARD_VIEWPORT_CENTER_X - (gridWidth + 104) / 2 + 16);
    this.gridTop = Math.round(BOARD_VIEWPORT_CENTER_Y - totalHeight / 2 + 28);
    this.keypadTop = this.gridTop + gridHeight + 70;

    const panelWidth = Math.max(gridWidth + 150, this.keypadButtonSize * 3 + 80);
    const panelHeight = totalHeight + 36;

    this.boardShadow = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      panelWidth,
      panelHeight,
      0x07101f,
      0.9,
    );
    this.boardShadow.setStrokeStyle(2, 0x55deff, 0.16);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      panelWidth - 34,
      panelHeight - 34,
      0x0a1832,
      0.54,
    );
    this.boardFrame.setStrokeStyle(3, 0x6af3ff, 0.28);
    this.boardFrame.setDepth(20);

    this.scanLine = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      this.gridTop - 24,
      panelWidth - 70,
      10,
      0x72f5ff,
      0.08,
    );
    this.scanLine.setDepth(21);
    this.scene.tweens.add({
      targets: this.scanLine,
      y: this.keypadTop + this.keypadButtonSize * 4 - 8,
      alpha: { from: 0.02, to: 0.14 },
      duration: 2200,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.createGridCells();
    this.createSumRails();
    this.createKeypad();
  }

  private createGridCells() {
    this.cells = [];
    for (let index = 0; index < this.puzzle.solution.length; index += 1) {
      const center = this.getGridCenter(index);
      const container = this.scene.add.container(center.x, center.y);
      container.setSize(this.cellSize, this.cellSize);
      container.setDepth(30);

      const glow = this.scene.add.rectangle(0, 0, this.cellSize - 10, this.cellSize - 10, 0x65f2ff, 0.04);
      const plate = this.scene.add.rectangle(0, 0, this.cellSize - 16, this.cellSize - 16, 0x12203a, 0.96);
      plate.setStrokeStyle(2, 0x2f507e, 0.42);
      const value = this.scene.add.text(0, 0, "", {
        fontFamily: "Arial Black, Arial",
        fontSize: `${Math.max(32, Math.round(this.cellSize * 0.28))}px`,
        color: "#ffffff",
      }).setOrigin(0.5);

      container.add([glow, plate, value]);

      if (this.puzzle.grid[index] === null) {
        container.setInteractive(new Phaser.Geom.Rectangle(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize), Phaser.Geom.Rectangle.Contains);
        container.on("pointerdown", () => {
          if (this.status === "running") {
            this.selectedIndex = index;
            this.refreshBoard();
          }
        });
      }

      this.cells.push({ container, glow, plate, value });
    }
  }

  private createSumRails() {
    this.rowLabels = [];
    this.colLabels = [];
    const gridWidth = this.size * this.cellSize;
    const rowRailX = this.gridLeft + gridWidth + 52;
    const colRailY = this.gridTop + gridWidth + 34;

    for (let row = 0; row < this.size; row += 1) {
      const label = this.scene.add.text(rowRailX, this.gridTop + row * this.cellSize + this.cellSize / 2, `= ${this.puzzle.rowSums[row]}`, {
        fontFamily: "Chakra Petch, Arial",
        fontSize: "24px",
        color: "#65f2ff",
        align: "center",
      }).setOrigin(0.5);
      label.setDepth(28);
      this.rowLabels.push(label);
    }

    for (let col = 0; col < this.size; col += 1) {
      const label = this.scene.add.text(this.gridLeft + col * this.cellSize + this.cellSize / 2, colRailY, `= ${this.puzzle.colSums[col]}`, {
        fontFamily: "Chakra Petch, Arial",
        fontSize: "24px",
        color: "#65f2ff",
        align: "center",
      }).setOrigin(0.5);
      label.setDepth(28);
      this.colLabels.push(label);
    }
  }

  private createKeypad() {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, null];
    const gap = 14;
    const startX = BOARD_VIEWPORT_CENTER_X - ((this.keypadButtonSize * 3) + gap * 2) / 2 + this.keypadButtonSize / 2;

    this.keypadButtons = values.map((value, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const x = startX + col * (this.keypadButtonSize + gap);
      const y = this.keypadTop + row * (this.keypadButtonSize + gap);
      const container = this.scene.add.container(x, y);
      const glow = this.scene.add.rectangle(0, 0, this.keypadButtonSize, this.keypadButtonSize, 0xfff089, 0.05);
      const plate = this.scene.add.rectangle(0, 0, this.keypadButtonSize - 8, this.keypadButtonSize - 8, 0x12203a, 0.92);
      plate.setStrokeStyle(2, 0x37547b, 0.38);
      const label = this.scene.add.text(0, 0, value === null ? "CLR" : String(value), {
        fontFamily: value === null ? "Chakra Petch, Arial" : "Arial Black, Arial",
        fontSize: value === null ? "22px" : `${Math.max(24, Math.round(this.keypadButtonSize * 0.35))}px`,
        color: value === null ? "#ffe45d" : "#ffffff",
      }).setOrigin(0.5);
      container.add([glow, plate, label]);
      container.setSize(this.keypadButtonSize, this.keypadButtonSize);
      container.setDepth(30);
      container.setInteractive(new Phaser.Geom.Rectangle(-this.keypadButtonSize / 2, -this.keypadButtonSize / 2, this.keypadButtonSize, this.keypadButtonSize), Phaser.Geom.Rectangle.Contains);
      container.on("pointerdown", () => {
        void this.handleDigitInput(value);
      });
      return { value, container, glow, plate, label };
    });
  }

  private async handleDigitInput(nextValue: number | null) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") {
      return;
    }

    if (this.selectedIndex === null) {
      await this.playInvalidSelection();
      return;
    }

    const currentValue = this.values[this.selectedIndex];
    if (currentValue === nextValue) {
      await this.playInvalidSelection();
      return;
    }

    this.inputLocked = true;
    this.movesLeft = Math.max(0, this.movesLeft - 1);

    const beforeCorrect = this.countCorrectBlanks(this.values);
    this.values[this.selectedIndex] = nextValue;
    const afterCorrect = this.countCorrectBlanks(this.values);
    const isNowCorrect = nextValue !== null && nextValue === this.puzzle.solution[this.selectedIndex];
    const row = Math.floor(this.selectedIndex / this.size);
    const col = this.selectedIndex % this.size;

    if (isNowCorrect) {
      this.score += 140 + Math.max(0, this.movesLeft * 3);
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      await this.playCorrectPlacement(this.selectedIndex);
    } else {
      this.score += 35;
      this.combo = 0;
      await this.playWrongPlacement(this.selectedIndex);
    }

    this.matchedTiles = afterCorrect;
    this.refreshBoard();

    if (this.isRowSolved(row)) {
      this.pulseRail(this.rowLabels[row], 0xc8ff4d);
    }

    if (this.isColumnSolved(col)) {
      this.pulseRail(this.colLabels[col], 0xc8ff4d);
    }

    if (afterCorrect >= this.blankIndices.length) {
      this.status = "complete";
      this.emitState();
      await this.playCompletion();
      this.emitState();
      this.bridge?.onComplete?.(this.snapshotState());
      return;
    }

    if (this.movesLeft <= 0) {
      this.status = "failed";
      this.emitState();
      await this.playFailure();
      this.emitState();
      this.bridge?.onFailed?.(this.snapshotState());
      return;
    }

    this.status = "running";
    this.selectedIndex = this.findNextBlankIndex();
    this.inputLocked = false;
    this.emitState();
  }

  private refreshBoard() {
    this.cells.forEach((cell, index) => {
      const value = this.values[index];
      const isGiven = this.puzzle.grid[index] !== null;
      const isSelected = this.selectedIndex === index;
      const isCorrect = value !== null && value === this.puzzle.solution[index];
      const isBlank = value === null;

      cell.value.setText(value === null ? "" : String(value));
      cell.glow.setFillStyle(isCorrect ? 0xc8ff4d : isSelected ? 0x65f2ff : 0xff5d8f, isCorrect ? 0.18 : isSelected ? 0.14 : isBlank ? 0.03 : 0.1);
      cell.plate.setFillStyle(isGiven ? 0x17314f : isCorrect ? 0x1b351a : 0x12203a, 0.96);
      cell.plate.setStrokeStyle(2, isGiven ? 0x71d1ff : isCorrect ? 0xc8ff4d : isSelected ? 0x65f2ff : value === null ? 0x2f507e : 0xff5d8f, isGiven ? 0.55 : isCorrect ? 0.8 : isSelected ? 0.72 : value === null ? 0.42 : 0.56);
      cell.value.setColor(isGiven ? "#d9f4ff" : isCorrect ? "#f3ffcb" : value === null ? "#ffffff" : value === this.puzzle.solution[index] ? "#ffffff" : "#ffd3de");
    });

    this.keypadButtons.forEach((button) => {
      button.glow.setFillStyle(button.value === null ? 0xffcf57 : 0x65f2ff, this.selectedIndex === null ? 0.02 : 0.08);
      button.plate.setStrokeStyle(2, button.value === null ? 0xffcf57 : 0x37547b, this.selectedIndex === null ? 0.22 : 0.48);
    });

    this.rowLabels.forEach((label, row) => {
      label.setColor(this.isRowSolved(row) ? "#efffb5" : "#65f2ff");
      label.setAlpha(this.isRowSolved(row) ? 1 : 0.82);
    });

    this.colLabels.forEach((label, col) => {
      label.setColor(this.isColumnSolved(col) ? "#efffb5" : "#65f2ff");
      label.setAlpha(this.isColumnSolved(col) ? 1 : 0.82);
    });
  }

  private countCorrectBlanks(values: (number | null)[]) {
    return this.blankIndices.filter((index) => values[index] === this.puzzle.solution[index]).length;
  }

  private isRowSolved(row: number) {
    return Array.from({ length: this.size }, (_, col) => this.values[row * this.size + col] === this.puzzle.solution[row * this.size + col]).every(Boolean);
  }

  private isColumnSolved(col: number) {
    return Array.from({ length: this.size }, (_, row) => this.values[row * this.size + col] === this.puzzle.solution[row * this.size + col]).every(Boolean);
  }

  private findNextBlankIndex() {
    return this.blankIndices.find((index) => this.values[index] !== this.puzzle.solution[index]) ?? this.selectedIndex;
  }

  private async playCorrectPlacement(index: number) {
    const cell = this.cells[index];
    const ring = this.scene.add.image(cell.container.x, cell.container.y, "impact_ring");
    ring.setTint(0xc8ff4d);
    ring.setDepth(40);
    ring.setAlpha(0.22);
    ring.setScale(0.34);
    await this.tweenPromise(ring, {
      alpha: 0,
      scaleX: 1.22,
      scaleY: 1.22,
      duration: 220,
      ease: "Cubic.easeOut",
    });
    ring.destroy();
  }

  private async playWrongPlacement(index: number) {
    const cell = this.cells[index];
    this.scene.cameras.main.shake(90, 0.0015);
    await this.tweenPromise(cell.container, {
      x: cell.container.x + 6,
      duration: 70,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
    });
  }

  private async playInvalidSelection() {
    this.scene.cameras.main.shake(70, 0.0012);
  }

  private async playCompletion() {
    const burst = this.scene.add.image(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y, "combo_burst");
    burst.setTint(0xc8ff4d);
    burst.setDepth(42);
    burst.setAlpha(0.6);
    burst.setScale(0.42);
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

  private pulseRail(target: Phaser.GameObjects.Text | undefined, tint: number) {
    if (!target) {
      return;
    }

    const ring = this.scene.add.image(target.x, target.y, "impact_ring");
    ring.setTint(tint);
    ring.setDepth(38);
    ring.setAlpha(0.18);
    ring.setScale(0.28);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 200,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy(),
    });
  }

  private getProgressPercent() {
    if (this.blankIndices.length === 0) {
      return 100;
    }

    return Math.max(0, Math.min(100, Math.round((this.countCorrectBlanks(this.values) / this.blankIndices.length) * 100)));
  }

  private buildSubmission(): PuzzleSubmission {
    return {
      kind: "number_grid",
      values: [...this.values],
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

  private getGridCenter(index: number) {
    const row = Math.floor(index / this.size);
    const col = index % this.size;
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
