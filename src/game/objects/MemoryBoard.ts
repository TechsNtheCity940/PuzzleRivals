import Phaser from "phaser";
import {
  buildMemoryGrid,
  type MemoryGridPuzzle,
} from "../../../shared/match-puzzle-contract";
import {
  buildNeonRivalsObjective,
  getObjectiveProgressPercent,
} from "@/game/config/runModes";
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

interface MemoryBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
}

interface MemoryCellVisual {
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Rectangle;
  core: Phaser.GameObjects.Rectangle;
  glyph: Phaser.GameObjects.Text;
}

const MEMORY_GLYPHS = ["?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?"];

function emptyColorProgress() {
  return TILE_TYPES.reduce((accumulator, tileType) => {
    accumulator[tileType] = 0;
    return accumulator;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

export default class MemoryBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private objective: ReturnType<typeof buildNeonRivalsObjective>;
  private rounds: MemoryGridPuzzle[] = [];
  private status: NeonRivalsGameStatus = "booting";
  private inputLocked = true;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 12;
  private targetScore = 1685;
  private runStartedAtMs = 0;
  private roundIndex = 0;
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private scanLine?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private roundText?: Phaser.GameObjects.Text;
  private helperText?: Phaser.GameObjects.Text;
  private cells: MemoryCellVisual[] = [];
  private targetSet = new Set<number>();
  private solvedSet = new Set<number>();
  private revealToken = 0;
  private boardLeft = 0;
  private boardTop = 0;
  private cellSize = 0;

  constructor(scene: Phaser.Scene, options: MemoryBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.rounds = Array.from({ length: 4 }, (_, index) =>
      buildMemoryGrid(this.sessionSeed + index * 137, Math.min(5, 2 + index)),
    );
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
    void this.renderRound();
    this.status = "running";
    this.emitState();
  }

  destroy() {
    this.revealToken += 1;
    this.boardShadow?.destroy();
    this.boardFrame?.destroy();
    this.scanLine?.destroy();
    this.titleText?.destroy();
    this.roundText?.destroy();
    this.helperText?.destroy();
    this.cells.forEach((cell) => cell.container.destroy());
  }

  private buildBoardSurface() {
    const boardSize = Math.min(BOARD_VIEWPORT_WIDTH - 88, BOARD_VIEWPORT_HEIGHT - 116, 620);
    this.cellSize = Math.floor(boardSize / 4);
    const actualBoardSize = this.cellSize * 4;
    this.boardLeft = Math.round(BOARD_VIEWPORT_CENTER_X - actualBoardSize / 2);
    this.boardTop = Math.round(BOARD_VIEWPORT_CENTER_Y - actualBoardSize / 2 + 62);

    this.boardShadow = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y + 62,
      actualBoardSize + 116,
      actualBoardSize + 176,
      0x07101f,
      0.92,
    );
    this.boardShadow.setStrokeStyle(2, 0xff9ce1, 0.16);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y + 62,
      actualBoardSize + 44,
      actualBoardSize + 108,
      0x0a1730,
      0.58,
    );
    this.boardFrame.setStrokeStyle(3, 0x65f2ff, 0.28);
    this.boardFrame.setDepth(20);

    this.scanLine = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      this.boardTop - 42,
      actualBoardSize + 24,
      10,
      0xff9ce1,
      0.08,
    );
    this.scanLine.setDepth(21);
    this.scene.tweens.add({
      targets: this.scanLine,
      y: this.boardTop + actualBoardSize + 42,
      alpha: { from: 0.03, to: 0.15 },
      duration: 2200,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.roundText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, this.boardTop - 122, "ROUND 1/1", {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "24px",
      color: "#65f2ff",
      letterSpacing: 6,
      align: "center",
    }).setOrigin(0.5).setDepth(28);

    this.titleText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, this.boardTop - 84, this.objective.title.toUpperCase(), {
      fontFamily: "Arial Black, Arial",
      fontSize: "30px",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5).setDepth(28);

    this.helperText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, this.boardTop - 42, "Watch the live pulse, then replay every marked cell without drifting.", {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "17px",
      color: "#b8c9de",
      align: "center",
      wordWrap: { width: actualBoardSize + 40 },
    }).setOrigin(0.5, 0).setDepth(28);

    this.createCells();
  }

  private createCells() {
    this.cells = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const index = row * 4 + col;
        const x = this.boardLeft + col * this.cellSize + this.cellSize / 2;
        const y = this.boardTop + row * this.cellSize + this.cellSize / 2;
        const container = this.scene.add.container(x, y).setDepth(30);
        const glow = this.scene.add.rectangle(0, 0, this.cellSize - 6, this.cellSize - 6, 0x65f2ff, 0.05);
        const frame = this.scene.add.rectangle(0, 0, this.cellSize - 10, this.cellSize - 10, 0x101a31, 0.94);
        frame.setStrokeStyle(2, 0x36537f, 0.38);
        const core = this.scene.add.rectangle(0, 0, this.cellSize - 34, this.cellSize - 34, 0x132341, 0.94);
        core.setStrokeStyle(1.5, 0xffffff, 0.08);
        const glyph = this.scene.add.text(0, 2, MEMORY_GLYPHS[index], {
          fontFamily: "Segoe UI Symbol, Arial Unicode MS, Arial",
          fontSize: `${Math.max(28, Math.floor(this.cellSize * 0.24))}px`,
          color: "#8fb2da",
          align: "center",
        }).setOrigin(0.5);

        container.add([glow, frame, core, glyph]);
        container.setSize(this.cellSize, this.cellSize);
        container.setInteractive(new Phaser.Geom.Rectangle(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize), Phaser.Geom.Rectangle.Contains);
        container.on("pointerdown", () => {
          void this.handleCellTap(index);
        });
        container.on("pointerover", () => {
          if (this.inputLocked || this.solvedSet.has(index)) return;
          glow.setFillStyle(0x65f2ff, 0.12);
          frame.setStrokeStyle(2, 0x65f2ff, 0.58);
        });
        container.on("pointerout", () => {
          if (this.solvedSet.has(index)) return;
          this.resetCell(index);
        });
        this.cells.push({ container, glow, frame, core, glyph });
      }
    }
  }

  private async renderRound() {
    this.revealToken += 1;
    const revealToken = this.revealToken;
    const round = this.rounds[this.roundIndex];
    this.targetSet = new Set(round.targets);
    this.solvedSet = new Set<number>();
    this.roundText?.setText(`ROUND ${this.roundIndex + 1}/${this.rounds.length}`);
    this.helperText?.setText("Watch the pulse sequence first. Input unlocks after the reveal sweep.");
    this.cells.forEach((_, index) => this.resetCell(index));
    this.inputLocked = true;
    this.emitState();
    await this.revealTargets(revealToken, round.targets);
    if (revealToken !== this.revealToken || this.status !== "running") {
      return;
    }
    this.helperText?.setText("Now replay the highlighted cells. Wrong taps reset the board memory and cost an attempt.");
    this.inputLocked = false;
  }

  private async revealTargets(revealToken: number, targets: number[]) {
    for (const index of targets) {
      if (revealToken !== this.revealToken) return;
      await this.flashCell(index, 0xff9ce1, 0xc8ff4d, 170);
      await this.delay(95);
    }
  }

  private async handleCellTap(index: number) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") {
      return;
    }

    if (this.solvedSet.has(index)) {
      return;
    }

    if (this.targetSet.has(index)) {
      this.solvedSet.add(index);
      await this.lockCell(index);
      if (this.solvedSet.size === this.targetSet.size) {
        this.score += 200 + Math.max(0, this.movesLeft * 10);
        this.combo += 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.matchedTiles = this.roundIndex + 1;
        this.scene.events.emit("board-combo");
        this.emitState();

        if (this.roundIndex === this.rounds.length - 1) {
          this.status = "complete";
          this.emitState();
          await this.playCompletion();
          this.bridge?.onComplete?.(this.snapshotState());
          return;
        }

        this.roundIndex += 1;
        await this.delay(220);
        void this.renderRound();
        return;
      }

      this.emitState();
      return;
    }

    this.combo = 0;
    this.movesLeft = Math.max(0, this.movesLeft - 1);
    await this.playWrongCell(index);

    if (this.movesLeft <= 0) {
      this.status = "failed";
      this.emitState();
      await this.playFailure();
      this.bridge?.onFailed?.(this.snapshotState());
      return;
    }

    this.emitState();
    void this.renderRound();
  }

  private async flashCell(index: number, glowColor: number, coreColor: number, duration: number) {
    const cell = this.cells[index];
    cell.glow.setFillStyle(glowColor, 0.22);
    cell.frame.setStrokeStyle(2, glowColor, 0.78);
    cell.core.setFillStyle(coreColor, 0.84);
    cell.glyph.setColor("#08131f");
    await Promise.all([
      this.tweenPromise(cell.container, {
        scaleX: 1.04,
        scaleY: 1.04,
        duration,
        yoyo: true,
        ease: "Sine.easeInOut",
      }),
      this.delay(duration + 20),
    ]);
    if (!this.solvedSet.has(index)) {
      this.resetCell(index);
    }
  }

  private async lockCell(index: number) {
    const cell = this.cells[index];
    cell.glow.setFillStyle(0xc8ff4d, 0.2);
    cell.frame.setStrokeStyle(2, 0xc8ff4d, 0.82);
    cell.core.setFillStyle(0x1d5533, 0.92);
    cell.glyph.setColor("#fafff4");
    await this.tweenPromise(cell.container, {
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 160,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  private async playWrongCell(index: number) {
    const cell = this.cells[index];
    cell.glow.setFillStyle(0xff5d8f, 0.18);
    cell.frame.setStrokeStyle(2, 0xff5d8f, 0.84);
    cell.core.setFillStyle(0x4a1827, 0.9);
    this.scene.cameras.main.shake(110, 0.0018);
    await this.tweenPromise(cell.container, {
      angle: 5,
      duration: 70,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
    });
    this.solvedSet.clear();
  }

  private async playCompletion() {
    const burst = this.scene.add.image(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y + 30, "combo_burst");
    burst.setTint(0xff9ce1);
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

  private resetCell(index: number) {
    const cell = this.cells[index];
    cell.glow.setFillStyle(0x65f2ff, 0.05);
    cell.frame.setStrokeStyle(2, 0x36537f, 0.38);
    cell.core.setFillStyle(0x132341, 0.94);
    cell.glyph.setColor("#8fb2da");
    cell.container.setScale(1);
    cell.container.setAngle(0);
  }

  private snapshotState(): NeonRivalsGameState {
    const objectiveValue = Math.max(0, Math.min(100, Math.round((this.matchedTiles / Math.max(this.rounds.length, 1)) * 100)));
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

  private delay(duration: number) {
    return new Promise<void>((resolve) => {
      this.scene.time.delayedCall(duration, () => resolve());
    });
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
