import Phaser from "phaser";
import {
  buildMirrorMaze,
  evaluateMirrorMazeState,
  type MirrorMazePuzzle,
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

interface MirrorBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

interface MirrorCellVisual {
  zone: Phaser.GameObjects.Zone;
  glow: Phaser.GameObjects.Rectangle;
  plate: Phaser.GameObjects.Rectangle;
  mirror: Phaser.GameObjects.Graphics;
  targetGlow: Phaser.GameObjects.Arc;
  targetCore: Phaser.GameObjects.Arc;
  tag: Phaser.GameObjects.Text;
}

function emptyColorProgress() {
  return TILE_TYPES.reduce((acc, tileType) => {
    acc[tileType] = 0;
    return acc;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

export default class MirrorBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private difficulty: 1 | 2 | 3 | 4 | 5;
  private objective = buildNeonRivalsObjective("mirror_maze", 1);
  private puzzle: MirrorMazePuzzle;
  private status: NeonRivalsGameStatus = "booting";
  private inputLocked = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 14;
  private targetScore = 1880;
  private runStartedAtMs = 0;
  private cellSize = 108;
  private gridLeft = 0;
  private gridTop = 0;
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private beamGlow?: Phaser.GameObjects.Graphics;
  private beamLine?: Phaser.GameObjects.Graphics;
  private sourceGlow?: Phaser.GameObjects.Arc;
  private sourceCore?: Phaser.GameObjects.Arc;
  private sourceTag?: Phaser.GameObjects.Text;
  private sourceRay?: Phaser.GameObjects.Graphics;
  private scanLine?: Phaser.GameObjects.Rectangle;
  private cells: MirrorCellVisual[] = [];

  constructor(scene: Phaser.Scene, options: MirrorBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.difficulty = options.difficulty ?? 4;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.puzzle = buildMirrorMaze(this.sessionSeed, this.difficulty);
  }

  create() {
    this.movesLeft = this.objective.startingMoves;
    this.targetScore = this.objective.targetScore;
    this.runStartedAtMs = this.scene.time.now;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.matchedTiles = 0;
    this.buildSurface();
    this.refreshBoard();
    this.status = "running";
    this.emitState();
  }

  destroy() {
    this.cells.forEach((cell) => {
      cell.zone.destroy();
      cell.glow.destroy();
      cell.plate.destroy();
      cell.mirror.destroy();
      cell.targetGlow.destroy();
      cell.targetCore.destroy();
      cell.tag.destroy();
    });
    this.boardShadow?.destroy();
    this.boardFrame?.destroy();
    this.beamGlow?.destroy();
    this.beamLine?.destroy();
    this.sourceGlow?.destroy();
    this.sourceCore?.destroy();
    this.sourceTag?.destroy();
    this.sourceRay?.destroy();
    this.scanLine?.destroy();
  }
  private buildSurface() {
    const padding = 38;
    this.cellSize = Math.floor(
      Math.min(
        (BOARD_VIEWPORT_WIDTH - padding * 2) / this.puzzle.size,
        (BOARD_VIEWPORT_HEIGHT - padding * 2) / this.puzzle.size,
      ),
    );
    const boardSize = this.cellSize * this.puzzle.size;
    this.gridLeft = Math.round(BOARD_VIEWPORT_CENTER_X - boardSize / 2);
    this.gridTop = Math.round(BOARD_VIEWPORT_CENTER_Y - boardSize / 2);

    this.boardShadow = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      boardSize + 78,
      boardSize + 78,
      0x050b1b,
      0.9,
    );
    this.boardShadow.setStrokeStyle(2, 0xffd974, 0.18);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      boardSize + 40,
      boardSize + 40,
      0x0a1325,
      0.6,
    );
    this.boardFrame.setStrokeStyle(3, 0xffc95e, 0.34);
    this.boardFrame.setDepth(20);

    this.beamGlow = this.scene.add.graphics().setDepth(28);
    this.beamLine = this.scene.add.graphics().setDepth(29);
    this.sourceRay = this.scene.add.graphics().setDepth(30);

    this.scanLine = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      this.gridTop - 20,
      boardSize + 18,
      12,
      0xffdd87,
      0.08,
    );
    this.scanLine.setDepth(21);
    this.scene.tweens.add({
      targets: this.scanLine,
      y: this.gridTop + boardSize + 20,
      alpha: { from: 0.02, to: 0.12 },
      duration: 2400,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.cells = [];
    for (let index = 0; index < this.puzzle.cells.length; index += 1) {
      const center = this.getCellCenter(index);
      const glow = this.scene.add.rectangle(center.x, center.y, this.cellSize - 10, this.cellSize - 10, 0xffd974, 0.02);
      const plate = this.scene.add.rectangle(center.x, center.y, this.cellSize - 16, this.cellSize - 16, 0x0f1d36, 0.94);
      const mirror = this.scene.add.graphics().setPosition(center.x, center.y);
      const targetGlow = this.scene.add.circle(center.x, center.y, this.cellSize * 0.22, 0xffd974, 0).setDepth(24);
      const targetCore = this.scene.add.circle(center.x, center.y, this.cellSize * 0.09, 0xfff4bc, 0).setDepth(25);
      const tag = this.scene.add.text(center.x, center.y + this.cellSize * 0.22, "", {
        fontFamily: "Chakra Petch, Arial",
        fontSize: `${Math.max(11, Math.round(this.cellSize * 0.12))}px`,
        color: "#ffd36f",
        stroke: "#05111a",
        strokeThickness: 4,
      }).setOrigin(0.5);
      const zone = this.scene.add.zone(center.x, center.y, this.cellSize, this.cellSize);
      glow.setDepth(22);
      plate.setDepth(23);
      mirror.setDepth(26);
      zone.setDepth(33);
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        void this.handleTap(index);
      });
      this.cells.push({ zone, glow, plate, mirror, targetGlow, targetCore, tag });
    }

    const sourceCenter = this.getCellCenter(this.puzzle.sourceIndex);
    this.sourceGlow = this.scene.add.circle(sourceCenter.x, sourceCenter.y, this.cellSize * 0.28, 0x72f5ff, 0.22).setDepth(24);
    this.sourceCore = this.scene.add.circle(sourceCenter.x, sourceCenter.y, this.cellSize * 0.12, 0xcafcff, 0.96).setDepth(31);
    this.sourceTag = this.scene.add.text(sourceCenter.x, sourceCenter.y - this.cellSize * 0.28, "SRC", {
      fontFamily: "Chakra Petch, Arial",
      fontSize: `${Math.max(11, Math.round(this.cellSize * 0.12))}px`,
      fontStyle: "700",
      color: "#d3ffff",
      stroke: "#071119",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(32);

    this.scene.tweens.add({
      targets: [this.sourceGlow, this.sourceCore],
      alpha: { from: 0.72, to: 1 },
      scaleX: { from: 0.96, to: 1.06 },
      scaleY: { from: 0.96, to: 1.06 },
      yoyo: true,
      repeat: -1,
      duration: 720,
      ease: "Sine.easeInOut",
    });
  }
  private async handleTap(index: number) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") return;

    const cell = this.puzzle.cells[index];
    if (cell.type !== "mirror" || cell.locked) {
      this.bumpInvalid(index);
      return;
    }

    this.inputLocked = true;
    const before = evaluateMirrorMazeState(this.puzzle, this.getRotations());
    const visual = this.cells[index];
    const nextRotation = cell.rotation === 0 ? 90 : 0;
    this.movesLeft = Math.max(0, this.movesLeft - 1);

    await this.tweenPromise(visual.mirror, {
      angle: nextRotation,
      duration: 170,
      ease: "Cubic.easeOut",
    });

    this.puzzle.cells[index] = { ...cell, rotation: nextRotation };
    const after = evaluateMirrorMazeState(this.puzzle, this.getRotations());
    const litDelta = after.litTargetCount - before.litTargetCount;

    if (litDelta > 0) {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.score += 90 + litDelta * 190 + this.combo * 26;
      this.playBurst(index, 0xffd974);
    } else {
      this.combo = 0;
      this.score += 12;
    }

    this.refreshBoard();
    this.emitState();

    if (after.solved) {
      this.status = "complete";
      this.score += 420 + this.movesLeft * 18;
      this.refreshBoard();
      this.emitState();
      this.playCompletion();
      this.bridge?.onComplete?.(this.snapshotState());
      return;
    }

    if (this.movesLeft <= 0) {
      this.failBoard();
      return;
    }

    this.inputLocked = false;
  }

  private refreshBoard() {
    const evaluation = evaluateMirrorMazeState(this.puzzle, this.getRotations());
    const beamCells = new Set(evaluation.beamCells);
    const hitTargets = new Set(evaluation.hitTargets);
    this.matchedTiles = evaluation.litTargetCount;
    this.drawBeam(evaluation.beamCells, evaluation.terminated);

    this.cells.forEach((visual, index) => {
      const cell = this.puzzle.cells[index];
      const isSource = index === this.puzzle.sourceIndex;
      const isTarget = this.puzzle.targets.includes(index);
      const isLit = hitTargets.has(index);
      const inBeam = beamCells.has(index);
      const activeColor = isLit ? 0xfff2b2 : isTarget ? 0xffcf73 : 0x72f5ff;

      visual.glow.setFillStyle(activeColor, isLit ? 0.24 : inBeam || isTarget || isSource ? 0.1 : 0.02);
      visual.plate.setFillStyle(
        isLit ? 0x2f2a16 : inBeam ? 0x182640 : isTarget ? 0x221d13 : isSource ? 0x10284a : 0x0f1d36,
        0.95,
      );
      visual.plate.setStrokeStyle(2, isLit ? 0xfff0a6 : isTarget ? 0xffc95e : inBeam || isSource ? 0x72f5ff : 0x2a4b6c, isLit || isTarget || inBeam || isSource ? 0.82 : 0.36);

      visual.targetGlow.setFillStyle(0xffd974, isLit ? 0.26 : isTarget ? 0.08 : 0);
      visual.targetCore.setFillStyle(isLit ? 0xfff8d0 : 0xffd974, isLit ? 0.96 : isTarget ? 0.34 : 0);
      visual.tag.setText(isTarget ? `T${this.puzzle.targets.indexOf(index) + 1}` : "");
      visual.tag.setVisible(isTarget);

      visual.mirror.clear();
      if (cell.type === "mirror") {
        this.drawMirrorVisual(visual.mirror, cell.rotation, cell.locked, isLit || inBeam);
      }
    });

    const sourceCenter = this.getCellCenter(this.puzzle.sourceIndex);
    this.sourceGlow?.setFillStyle(0x72f5ff, beamCells.has(this.puzzle.sourceIndex) ? 0.26 : 0.16);
    this.sourceCore?.setFillStyle(0xd6ffff, 0.98);
    this.sourceTag?.setColor(beamCells.has(this.puzzle.sourceIndex) ? "#f2ffff" : "#b5ddea");
    this.sourceRay?.clear();
    this.drawSourceRay(sourceCenter.x, sourceCenter.y);
  }

  private drawBeam(path: number[], terminated: "edge" | "loop") {
    this.beamGlow?.clear();
    this.beamLine?.clear();
    if (path.length === 0) return;

    const start = this.getCellCenter(path[0]);
    this.beamGlow?.lineStyle(18, 0xffc95e, 0.14);
    this.beamLine?.lineStyle(6, 0xfff4bc, 0.94);
    this.beamGlow?.beginPath();
    this.beamGlow?.moveTo(start.x, start.y);
    this.beamLine?.beginPath();
    this.beamLine?.moveTo(start.x, start.y);

    for (const index of path.slice(1)) {
      const point = this.getCellCenter(index);
      this.beamGlow?.lineTo(point.x, point.y);
      this.beamLine?.lineTo(point.x, point.y);
    }

    this.beamGlow?.strokePath();
    this.beamLine?.strokePath();

    const last = this.getCellCenter(path[path.length - 1]);
    const endBurst = this.scene.add.circle(last.x, last.y, this.cellSize * 0.08, terminated === "loop" ? 0xff7d9b : 0xffe998, 0.18).setDepth(30);
    this.scene.tweens.add({
      targets: endBurst,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => endBurst.destroy(),
    });
  }
  private drawMirrorVisual(
    graphics: Phaser.GameObjects.Graphics,
    rotation: number,
    locked: boolean,
    energized: boolean,
  ) {
    const arm = this.cellSize * 0.28;
    graphics.lineStyle(locked ? 8 : 7, energized ? 0xfff2b2 : 0x9ad1ff, 0.96);
    graphics.beginPath();
    graphics.moveTo(-arm, -arm);
    graphics.lineTo(arm, arm);
    graphics.strokePath();
    graphics.lineStyle(2, locked ? 0xc8ff4d : 0xffc95e, locked ? 0.9 : 0.68);
    graphics.strokeRect(-arm - 8, -arm - 8, arm * 2 + 16, arm * 2 + 16);
    graphics.setAngle(rotation);
  }

  private drawSourceRay(x: number, y: number) {
    if (!this.sourceRay) return;
    const rayLength = this.cellSize * 0.3;
    const dx = this.puzzle.sourceDirection === 1 ? rayLength : this.puzzle.sourceDirection === 3 ? -rayLength : 0;
    const dy = this.puzzle.sourceDirection === 2 ? rayLength : this.puzzle.sourceDirection === 0 ? -rayLength : 0;
    this.sourceRay.lineStyle(4, 0x72f5ff, 0.84);
    this.sourceRay.beginPath();
    this.sourceRay.moveTo(x, y);
    this.sourceRay.lineTo(x + dx, y + dy);
    this.sourceRay.strokePath();
  }

  private getRotations() {
    return this.puzzle.cells.map((cell) => cell.rotation);
  }

  private getProgressPercent() {
    return evaluateMirrorMazeState(this.puzzle, this.getRotations()).progress;
  }

  private buildSubmission(): PuzzleSubmission {
    return { kind: "mirror_maze", rotations: this.getRotations() };
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

  private failBoard() {
    this.status = "failed";
    this.inputLocked = false;
    this.emitState();
    this.scene.cameras.main.shake(160, 0.002);
    this.bridge?.onFailed?.(this.snapshotState());
  }

  private bumpInvalid(index: number) {
    this.combo = 0;
    this.score = Math.max(0, this.score - 14);
    const point = this.getCellCenter(index);
    const spark = this.scene.add.image(point.x, point.y, "impact_ring");
    spark.setTint(0xff7d9b);
    spark.setDepth(38);
    spark.setAlpha(0.2);
    spark.setScale(0.28);
    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => spark.destroy(),
    });
    this.scene.cameras.main.shake(70, 0.0011);
    this.emitState();
  }

  private playBurst(index: number, tint: number) {
    const point = this.getCellCenter(index);
    const burst = this.scene.add.image(point.x, point.y, "combo_burst");
    burst.setTint(tint);
    burst.setDepth(40);
    burst.setAlpha(0.56);
    burst.setScale(0.34);
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 240,
      ease: "Cubic.easeOut",
      onComplete: () => burst.destroy(),
    });
  }

  private playCompletion() {
    const burst = this.scene.add.image(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y, "combo_burst");
    burst.setTint(0xffd974);
    burst.setDepth(42);
    burst.setAlpha(0.62);
    burst.setScale(0.4);
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scaleX: 2.4,
      scaleY: 2.4,
      duration: 460,
      ease: "Cubic.easeOut",
      onComplete: () => burst.destroy(),
    });
    this.inputLocked = false;
  }

  private getCellCenter(index: number) {
    const row = Math.floor(index / this.puzzle.size);
    const col = index % this.puzzle.size;
    return {
      x: this.gridLeft + col * this.cellSize + this.cellSize / 2,
      y: this.gridTop + row * this.cellSize + this.cellSize / 2,
    };
  }

  private tweenPromise(
    target: Phaser.Tweens.TweenTarget | undefined,
    config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, "targets">,
  ) {
    if (!target) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: target,
        ...config,
        onComplete: () => resolve(),
      });
    });
  }
}
