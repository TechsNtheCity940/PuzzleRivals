import Phaser from "phaser";
import {
  buildGlyphRushRounds,
  evaluateGlyphRushAnswers,
  type GlyphRushRound,
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
import type { PuzzleSubmission } from "@/lib/backend";
import {
  BOARD_VIEWPORT_CENTER_X,
  BOARD_VIEWPORT_CENTER_Y,
  BOARD_VIEWPORT_HEIGHT,
  BOARD_VIEWPORT_WIDTH,
  TILE_TYPES,
  type TileTextureKey,
} from "@/game/utils/constants";

interface GlyphBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

interface GlyphCellVisual {
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Rectangle;
  plate: Phaser.GameObjects.Rectangle;
  core: Phaser.GameObjects.Rectangle;
  rune: Phaser.GameObjects.Text;
  halo: Phaser.GameObjects.Arc;
}

function emptyColorProgress() {
  return TILE_TYPES.reduce((accumulator, tileType) => {
    accumulator[tileType] = 0;
    return accumulator;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

export default class GlyphBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private difficulty: 1 | 2 | 3 | 4 | 5;
  private objective = buildNeonRivalsObjective("glyph_rush", 1);
  private rounds: GlyphRushRound[] = [];
  private status: NeonRivalsGameStatus = "booting";
  private inputLocked = true;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 14;
  private targetScore = 1840;
  private runStartedAtMs = 0;
  private roundIndex = 0;
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private scanLine?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private roundText?: Phaser.GameObjects.Text;
  private helperText?: Phaser.GameObjects.Text;
  private cells: GlyphCellVisual[] = [];
  private revealToken = 0;
  private boardLeft = 0;
  private boardTop = 0;
  private cellSize = 0;
  private currentSelection = new Set<number>();
  private committedAnswers: number[][] = [];
  private roundUnlockedAtMs = 0;

  constructor(scene: Phaser.Scene, options: GlyphBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.difficulty = options.difficulty ?? 4;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.rounds = buildGlyphRushRounds(this.sessionSeed, this.difficulty);
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
    this.committedAnswers = [];
    this.currentSelection = new Set<number>();
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
    this.cells = [];
  }

  private buildBoardSurface() {
    const boardSize = Math.min(BOARD_VIEWPORT_WIDTH - 96, BOARD_VIEWPORT_HEIGHT - 170, 664);
    this.cellSize = Math.floor(boardSize / 4);
    const actualBoardSize = this.cellSize * 4;
    this.boardLeft = Math.round(BOARD_VIEWPORT_CENTER_X - actualBoardSize / 2);
    this.boardTop = Math.round(BOARD_VIEWPORT_CENTER_Y - actualBoardSize / 2 + 76);

    this.boardShadow = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y + 76,
      actualBoardSize + 132,
      actualBoardSize + 212,
      0x06101e,
      0.92,
    );
    this.boardShadow.setStrokeStyle(2, 0xffb86b, 0.16);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y + 76,
      actualBoardSize + 52,
      actualBoardSize + 120,
      0x09182f,
      0.56,
    );
    this.boardFrame.setStrokeStyle(3, 0x65f2ff, 0.26);
    this.boardFrame.setDepth(20);

    this.scanLine = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      this.boardTop - 54,
      actualBoardSize + 24,
      10,
      0xffb86b,
      0.08,
    );
    this.scanLine.setDepth(21);
    this.scene.tweens.add({
      targets: this.scanLine,
      y: this.boardTop + actualBoardSize + 54,
      alpha: { from: 0.03, to: 0.16 },
      duration: 2300,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.roundText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, this.boardTop - 136, "ROUND 1/1", {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "24px",
      color: "#65f2ff",
      letterSpacing: 6,
      align: "center",
    }).setOrigin(0.5).setDepth(28);

    this.titleText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, this.boardTop - 94, this.objective.title.toUpperCase(), {
      fontFamily: "Arial Black, Arial",
      fontSize: "32px",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5).setDepth(28);

    this.helperText = this.scene.add.text(
      BOARD_VIEWPORT_CENTER_X,
      this.boardTop - 50,
      "Catch the glowing rune burst, then rebuild the same sigil pattern from memory.",
      {
        fontFamily: "Chakra Petch, Arial",
        fontSize: "17px",
        color: "#c5d4e8",
        align: "center",
        wordWrap: { width: actualBoardSize + 40 },
      },
    ).setOrigin(0.5, 0).setDepth(28);

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
        const glow = this.scene.add.rectangle(0, 0, this.cellSize - 8, this.cellSize - 8, 0xffb86b, 0.04);
        const plate = this.scene.add.rectangle(0, 0, this.cellSize - 12, this.cellSize - 12, 0x101c34, 0.96);
        plate.setStrokeStyle(2, 0x304968, 0.38);
        const core = this.scene.add.rectangle(0, 0, this.cellSize - 36, this.cellSize - 36, 0x15263f, 0.94);
        core.setStrokeStyle(1.5, 0xffffff, 0.05);
        const halo = this.scene.add.circle(0, 0, Math.max(20, this.cellSize * 0.24), 0x65f2ff, 0.04);
        halo.setStrokeStyle(1.5, 0x65f2ff, 0.16);
        const rune = this.scene.add.text(0, 2, "?", {
          fontFamily: "Segoe UI Symbol, Arial Unicode MS, Arial",
          fontSize: `${Math.max(28, Math.floor(this.cellSize * 0.3))}px`,
          color: "#9dc0e6",
          align: "center",
        }).setOrigin(0.5);

        container.add([glow, plate, core, halo, rune]);
        container.setSize(this.cellSize, this.cellSize);
        container.setInteractive(
          new Phaser.Geom.Rectangle(-this.cellSize / 2, -this.cellSize / 2, this.cellSize, this.cellSize),
          Phaser.Geom.Rectangle.Contains,
        );
        container.on("pointerdown", () => {
          void this.handleCellTap(index);
        });
        container.on("pointerover", () => {
          if (this.inputLocked || this.status !== "running" || this.currentSelection.has(index)) {
            return;
          }
          glow.setFillStyle(0x65f2ff, 0.1);
          plate.setStrokeStyle(2, 0x65f2ff, 0.58);
          halo.setFillStyle(0x65f2ff, 0.08);
          halo.setStrokeStyle(1.5, 0x65f2ff, 0.42);
        });
        container.on("pointerout", () => {
          if (this.currentSelection.has(index)) {
            return;
          }
          this.resetCell(index);
        });

        this.cells.push({ container, glow, plate, core, rune, halo });
      }
    }
  }

  private async renderRound() {
    this.revealToken += 1;
    const revealToken = this.revealToken;
    const round = this.rounds[this.roundIndex];
    this.currentSelection.clear();
    this.roundText?.setText(`ROUND ${this.roundIndex + 1}/${this.rounds.length}`);
    this.helperText?.setText("Watch the rune burst first. Input unlocks after the preview sweep.");
    this.inputLocked = true;
    this.applyRoundGlyphs(round);
    this.cells.forEach((_, index) => this.resetCell(index));
    this.emitState();
    await this.revealPattern(revealToken, round);
    if (revealToken !== this.revealToken || this.status !== "running") {
      return;
    }
    this.helperText?.setText(`Rebuild the sigil from memory. Match ${round.targets.length} glowing runes exactly.`);
    this.roundUnlockedAtMs = this.scene.time.now;
    this.inputLocked = false;
    this.emitState();
  }

  private applyRoundGlyphs(round: GlyphRushRound) {
    this.cells.forEach((cell, index) => {
      cell.rune.setText(round.glyphs[index] ?? "?");
    });
  }

  private async revealPattern(revealToken: number, round: GlyphRushRound) {
    for (const index of round.targets) {
      if (revealToken !== this.revealToken) {
        return;
      }
      await this.flashCell(index, 0xffb86b, 0x65f2ff, 120);
      await this.delay(55);
    }

    const holdTweens = round.targets.map((index) => this.holdPreviewCell(index, round.previewMs));
    await Promise.all(holdTweens);
    if (revealToken !== this.revealToken) {
      return;
    }
    round.targets.forEach((index) => this.resetCell(index));
  }

  private async handleCellTap(index: number) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") {
      return;
    }

    const round = this.rounds[this.roundIndex];
    if (this.currentSelection.has(index)) {
      this.currentSelection.delete(index);
      this.resetCell(index);
      this.emitState();
      return;
    }

    if (this.currentSelection.size >= round.targets.length) {
      return;
    }

    this.currentSelection.add(index);
    await this.highlightSelected(index);
    this.emitState();

    if (this.currentSelection.size === round.targets.length) {
      this.inputLocked = true;
      await this.resolveSelection(round);
    }
  }

  private async resolveSelection(round: GlyphRushRound) {
    const selected = [...this.currentSelection].sort((left, right) => left - right);
    const expected = [...round.targets].sort((left, right) => left - right);
    const exact = selected.length === expected.length && selected.every((value, index) => value === expected[index]);

    if (exact) {
      this.committedAnswers[this.roundIndex] = selected;
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.matchedTiles = this.roundIndex + 1;
      const solveWindowMs = Math.max(0, Math.round(this.scene.time.now - this.roundUnlockedAtMs));
      const fastSolveBonus = solveWindowMs <= 2300 ? 55 : solveWindowMs <= 3200 ? 28 : 0;
      this.score += 150 + round.targets.length * 24 + this.combo * 18 + fastSolveBonus + Math.max(0, this.movesLeft * 6);
      this.scene.events.emit("board-combo");
      await Promise.all(selected.map((index) => this.lockCell(index)));
      this.emitState();

      if (this.roundIndex >= this.rounds.length - 1) {
        this.status = "complete";
        this.score += 260 + this.movesLeft * 12;
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

    this.combo = 0;
    this.score = Math.max(0, this.score - 26);
    this.movesLeft = Math.max(0, this.movesLeft - 1);
    await this.playWrongSelection(selected);
    this.currentSelection.clear();
    this.committedAnswers[this.roundIndex] = [];

    if (this.movesLeft <= 0) {
      this.status = "failed";
      this.emitState();
      await this.playFailure();
      this.bridge?.onFailed?.(this.snapshotState());
      return;
    }

    this.emitState();
    await this.delay(180);
    void this.renderRound();
  }

  private async flashCell(index: number, glowColor: number, coreColor: number, duration: number) {
    const cell = this.cells[index];
    cell.glow.setFillStyle(glowColor, 0.2);
    cell.plate.setStrokeStyle(2, glowColor, 0.8);
    cell.core.setFillStyle(0x243b55, 0.96);
    cell.halo.setFillStyle(coreColor, 0.14);
    cell.halo.setStrokeStyle(1.5, coreColor, 0.52);
    cell.rune.setColor("#fef6ea");
    await this.tweenPromise(cell.container, {
      scaleX: 1.06,
      scaleY: 1.06,
      duration,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  private async holdPreviewCell(index: number, duration: number) {
    const cell = this.cells[index];
    cell.glow.setFillStyle(0xffb86b, 0.14);
    cell.plate.setStrokeStyle(2, 0xffb86b, 0.62);
    cell.core.setFillStyle(0x22354c, 0.96);
    cell.halo.setFillStyle(0x65f2ff, 0.12);
    cell.halo.setStrokeStyle(1.5, 0x65f2ff, 0.48);
    cell.rune.setColor("#fff1dc");
    await this.delay(duration);
  }

  private async highlightSelected(index: number) {
    const cell = this.cells[index];
    cell.glow.setFillStyle(0xb88aff, 0.18);
    cell.plate.setStrokeStyle(2, 0xb88aff, 0.82);
    cell.core.setFillStyle(0x2b1f46, 0.96);
    cell.halo.setFillStyle(0xb88aff, 0.12);
    cell.halo.setStrokeStyle(1.5, 0xffb86b, 0.46);
    cell.rune.setColor("#fff7ff");
    await this.tweenPromise(cell.container, {
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 110,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  private async lockCell(index: number) {
    const cell = this.cells[index];
    cell.glow.setFillStyle(0xc8ff4d, 0.2);
    cell.plate.setStrokeStyle(2, 0xc8ff4d, 0.84);
    cell.core.setFillStyle(0x224425, 0.96);
    cell.halo.setFillStyle(0xc8ff4d, 0.14);
    cell.halo.setStrokeStyle(1.5, 0xfff0a0, 0.56);
    cell.rune.setColor("#faffef");
    await this.tweenPromise(cell.container, {
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 150,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }

  private async playWrongSelection(indices: number[]) {
    this.scene.cameras.main.shake(120, 0.0017);
    await Promise.all(indices.map(async (index) => {
      const cell = this.cells[index];
      cell.glow.setFillStyle(0xff5d8f, 0.18);
      cell.plate.setStrokeStyle(2, 0xff5d8f, 0.84);
      cell.core.setFillStyle(0x4a1727, 0.94);
      cell.halo.setFillStyle(0xff5d8f, 0.12);
      cell.halo.setStrokeStyle(1.5, 0xff5d8f, 0.52);
      cell.rune.setColor("#ffe3ef");
      await this.tweenPromise(cell.container, {
        angle: 7,
        duration: 70,
        yoyo: true,
        repeat: 1,
        ease: "Sine.easeInOut",
      });
    }));
  }

  private async playCompletion() {
    const burst = this.scene.add.image(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y + 44, "combo_burst");
    burst.setTint(0xffb86b);
    burst.setDepth(42);
    burst.setAlpha(0.66);
    burst.setScale(0.42);
    await this.tweenPromise(burst, {
      alpha: 0,
      scaleX: 2.6,
      scaleY: 2.6,
      duration: 480,
      ease: "Cubic.easeOut",
    });
    burst.destroy();
  }

  private async playFailure() {
    this.scene.cameras.main.shake(180, 0.002);
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
    cell.glow.setFillStyle(0xffb86b, 0.04);
    cell.plate.setStrokeStyle(2, 0x304968, 0.38);
    cell.core.setFillStyle(0x15263f, 0.94);
    cell.halo.setFillStyle(0x65f2ff, 0.04);
    cell.halo.setStrokeStyle(1.5, 0x65f2ff, 0.16);
    cell.rune.setColor("#9dc0e6");
    cell.container.setScale(1);
    cell.container.setAngle(0);
  }

  private buildSubmission(): PuzzleSubmission {
    return {
      kind: "glyph_rush",
      answers: this.buildAnswerMatrix(),
    };
  }

  private buildAnswerMatrix() {
    return this.rounds.map((_, index) => {
      if (index < this.roundIndex) {
        return [...(this.committedAnswers[index] ?? [])].sort((left, right) => left - right);
      }

      if (index === this.roundIndex) {
        return [...this.currentSelection].sort((left, right) => left - right);
      }

      return [];
    });
  }

  private getProgressPercent() {
    return evaluateGlyphRushAnswers(this.rounds, this.buildAnswerMatrix());
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
