import Phaser from "phaser";
import {
  buildLinkLock,
  evaluateLinkLockPaths,
  type LinkLockPair,
  type LinkLockPuzzle,
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

interface LinkBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

interface CellVisual {
  zone: Phaser.GameObjects.Zone;
  glow: Phaser.GameObjects.Rectangle;
  plate: Phaser.GameObjects.Rectangle;
  node: Phaser.GameObjects.Arc;
  tag: Phaser.GameObjects.Text;
}

function emptyColorProgress() {
  return TILE_TYPES.reduce((acc, tileType) => {
    acc[tileType] = 0;
    return acc;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

export default class LinkBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private difficulty: 1 | 2 | 3 | 4 | 5;
  private objective = buildNeonRivalsObjective("link_lock", 1);
  private puzzle: LinkLockPuzzle;
  private status: NeonRivalsGameStatus = "booting";
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 16;
  private targetScore = 1820;
  private runStartedAtMs = 0;
  private cellSize = 112;
  private gridLeft = 0;
  private gridTop = 0;
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private pathGlow?: Phaser.GameObjects.Graphics;
  private pathLine?: Phaser.GameObjects.Graphics;
  private cells: CellVisual[] = [];
  private completedPaths = new Map<number, number[]>();
  private activePairId: number | null = null;
  private activePath: number[] = [];

  constructor(scene: Phaser.Scene, options: LinkBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.difficulty = options.difficulty ?? 4;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.puzzle = buildLinkLock(this.sessionSeed, this.difficulty);
  }

  create() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.matchedTiles = 0;
    this.movesLeft = this.objective.startingMoves;
    this.targetScore = this.objective.targetScore;
    this.runStartedAtMs = this.scene.time.now;
    this.completedPaths.clear();
    this.activePairId = null;
    this.activePath = [];
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
      cell.node.destroy();
      cell.tag.destroy();
    });
    this.pathGlow?.destroy();
    this.pathLine?.destroy();
    this.boardShadow?.destroy();
    this.boardFrame?.destroy();
  }

  private buildSurface() {
    const padding = 44;
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
      boardSize + 84,
      boardSize + 84,
      0x07101f,
      0.9,
    );
    this.boardShadow.setStrokeStyle(2, 0xc8ff4d, 0.16);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y,
      boardSize + 40,
      boardSize + 40,
      0x0a1730,
      0.56,
    );
    this.boardFrame.setStrokeStyle(3, 0x72f5ff, 0.28);
    this.boardFrame.setDepth(20);

    this.pathGlow = this.scene.add.graphics().setDepth(27);
    this.pathLine = this.scene.add.graphics().setDepth(28);
    this.cells = [];

    for (let index = 0; index < this.puzzle.size * this.puzzle.size; index += 1) {
      const center = this.getCellCenter(index);
      const endpoint = this.getEndpointPair(index);
      const glow = this.scene.add.rectangle(center.x, center.y, this.cellSize - 12, this.cellSize - 12, 0x65f2ff, 0.03);
      const plate = this.scene.add.rectangle(center.x, center.y, this.cellSize - 18, this.cellSize - 18, 0x102039, 0.96);
      const node = this.scene.add.circle(center.x, center.y, Math.max(8, this.cellSize * 0.12), endpoint ? Number(`0x${endpoint.color.slice(1)}`) : 0x40648a, endpoint ? 0.9 : 0.12);
      const tag = this.scene.add.text(center.x, center.y + this.cellSize * 0.22, endpoint ? `P${endpoint.pairId}` : "", {
        fontFamily: "Chakra Petch, Arial",
        fontSize: `${Math.max(11, Math.round(this.cellSize * 0.12))}px`,
        color: endpoint?.color ?? "#7f9cc0",
      }).setOrigin(0.5);
      plate.setStrokeStyle(2, 0x2a4b6c, 0.36);
      glow.setDepth(22);
      plate.setDepth(23);
      node.setDepth(24);
      tag.setDepth(25);
      const zone = this.scene.add.zone(center.x, center.y, this.cellSize, this.cellSize);
      zone.setDepth(32);
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        this.handleTap(index);
      });
      this.cells.push({ zone, glow, plate, node, tag });
    }
  }

  private handleTap(index: number) {
    if (this.status === "complete" || this.status === "failed") return;

    const endpoint = this.getEndpointPair(index);
    if (this.activePairId === null) {
      if (!endpoint) return this.bumpInvalid(index);
      this.activatePair(endpoint, index);
      this.refreshBoard();
      this.emitState();
      return;
    }

    const pair = this.getPairById(this.activePairId);
    if (!pair) return;
    const last = this.activePath[this.activePath.length - 1];
    const previous = this.activePath.length > 1 ? this.activePath[this.activePath.length - 2] : null;

    if (index === last) return;
    if (previous !== null && index === previous) {
      this.activePath.pop();
      this.refreshBoard();
      this.emitState();
      return;
    }
    if (index === this.activePath[0]) {
      this.activePath = [this.activePath[0]];
      this.refreshBoard();
      this.emitState();
      return;
    }
    if (!this.isAdjacent(last, index) || this.activePath.includes(index)) {
      return this.bumpInvalid(index);
    }
    if (this.isBlocked(index, pair.pairId)) {
      return this.bumpInvalid(index);
    }
    if (endpoint && endpoint.pairId !== pair.pairId) {
      return this.bumpInvalid(index);
    }

    this.movesLeft = Math.max(0, this.movesLeft - 1);
    this.activePath.push(index);
    if (endpoint && endpoint.pairId === pair.pairId) {
      return this.commitPair(pair);
    }

    this.refreshBoard();
    this.emitState();
    if (this.movesLeft <= 0) this.failBoard();
  }

  private commitPair(pair: LinkLockPair) {
    const evaluation = evaluateLinkLockPaths(this.puzzle, this.collectPaths(true));
    if (!evaluation.validPairIds.includes(pair.pairId)) {
      return this.bumpInvalid(this.activePath[this.activePath.length - 1]);
    }

    this.completedPaths.set(pair.pairId, [...this.activePath]);
    this.activePairId = null;
    this.activePath = [];
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.matchedTiles = evaluation.completedPairs;
    this.score += 150 + pair.guidePath.length * 18 + this.combo * 22 + Math.max(0, this.movesLeft * 2);
    this.playBurst(pair.endpoints[1], pair.color);
    this.refreshBoard();
    this.emitState();

    if (evaluation.solved) {
      this.status = "complete";
      this.score += 320 + this.movesLeft * 12;
      this.emitState();
      this.playCompletion();
      this.bridge?.onComplete?.(this.snapshotState());
      return;
    }

    if (this.movesLeft <= 0) this.failBoard();
  }

  private activatePair(pair: LinkLockPair, clickedEndpoint: number) {
    const existing = this.completedPaths.get(pair.pairId);
    if (existing) {
      this.completedPaths.delete(pair.pairId);
      this.activePairId = pair.pairId;
      this.activePath = existing[0] === clickedEndpoint ? [...existing] : [...existing].reverse();
      this.matchedTiles = evaluateLinkLockPaths(this.puzzle, this.collectPaths(false)).completedPairs;
      return;
    }

    this.activePairId = pair.pairId;
    this.activePath = [clickedEndpoint];
  }

  private refreshBoard() {
    this.drawPaths();
    const activeCells = new Set(this.activePath);
    this.cells.forEach((cell, index) => {
      const endpoint = this.getEndpointPair(index);
      const ownerId = this.getCompletedOwner(index);
      const owner = ownerId ? this.getPairById(ownerId) : null;
      const color = endpoint?.color ?? owner?.color ?? "#5fe2ff";
      const tint = Number(`0x${color.slice(1)}`);
      const active = activeCells.has(index);
      const locked = ownerId !== null;
      cell.glow.setFillStyle(tint, active ? 0.22 : locked || endpoint ? 0.12 : 0.03);
      cell.plate.setFillStyle(active ? 0x203714 : locked ? 0x16253a : endpoint ? 0x182b16 : 0x102039, 0.96);
      cell.plate.setStrokeStyle(2, active || locked || endpoint ? tint : 0x2a4b6c, active || locked || endpoint ? 0.72 : 0.36);
      cell.node.setFillStyle(tint, endpoint ? 0.92 : locked ? 0.24 : 0.12);
      cell.tag.setText(endpoint ? `P${endpoint.pairId}` : "");
      cell.tag.setColor(color);
      cell.tag.setVisible(Boolean(endpoint));
    });
  }

  private drawPaths() {
    this.pathGlow?.clear();
    this.pathLine?.clear();
    for (const pair of this.puzzle.pairs) {
      const path = this.completedPaths.get(pair.pairId);
      if (path && path.length >= 2) this.drawPath(pair.color, path, false);
    }
    if (this.activePairId !== null && this.activePath.length >= 2) {
      const pair = this.getPairById(this.activePairId);
      if (pair) this.drawPath(pair.color, this.activePath, true);
    }
  }

  private drawPath(color: string, path: number[], active: boolean) {
    const tint = Number(`0x${color.slice(1)}`);
    const start = this.getCellCenter(path[0]);
    this.pathGlow?.lineStyle(active ? 18 : 14, tint, active ? 0.18 : 0.14);
    this.pathLine?.lineStyle(active ? 7 : 5, tint, active ? 0.98 : 0.82);
    this.pathGlow?.beginPath();
    this.pathGlow?.moveTo(start.x, start.y);
    this.pathLine?.beginPath();
    this.pathLine?.moveTo(start.x, start.y);
    for (const cellIndex of path.slice(1)) {
      const point = this.getCellCenter(cellIndex);
      this.pathGlow?.lineTo(point.x, point.y);
      this.pathLine?.lineTo(point.x, point.y);
    }
    this.pathGlow?.strokePath();
    this.pathLine?.strokePath();
  }

  private collectPaths(includeActive: boolean) {
    const paths: Array<{ pairId: number; cells: number[] }> = [];
    for (const [pairId, cells] of this.completedPaths.entries()) paths.push({ pairId, cells: [...cells] });
    if (includeActive && this.activePairId !== null && this.activePath.length > 0) {
      paths.push({ pairId: this.activePairId, cells: [...this.activePath] });
    }
    return paths;
  }

  private getProgressPercent() {
    return evaluateLinkLockPaths(this.puzzle, this.collectPaths(false)).progress;
  }

  private buildSubmission(): PuzzleSubmission {
    return { kind: "link_lock", paths: this.collectPaths(false) };
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
    this.emitState();
    this.scene.cameras.main.shake(160, 0.002);
    this.bridge?.onFailed?.(this.snapshotState());
  }

  private bumpInvalid(index: number) {
    this.combo = 0;
    this.score = Math.max(0, this.score - 18);
    const point = this.getCellCenter(index);
    const ring = this.scene.add.image(point.x, point.y, "impact_ring");
    ring.setTint(0xff5d8f);
    ring.setDepth(38);
    ring.setAlpha(0.22);
    ring.setScale(0.3);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 0.96,
      scaleY: 0.96,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => ring.destroy(),
    });
    this.scene.cameras.main.shake(80, 0.0012);
    this.emitState();
  }

  private playBurst(index: number, color: string) {
    const point = this.getCellCenter(index);
    const burst = this.scene.add.image(point.x, point.y, "combo_burst");
    burst.setTint(Number(`0x${color.slice(1)}`));
    burst.setDepth(40);
    burst.setAlpha(0.54);
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
    burst.setTint(0xc8ff4d);
    burst.setDepth(42);
    burst.setAlpha(0.64);
    burst.setScale(0.42);
    this.scene.tweens.add({
      targets: burst,
      alpha: 0,
      scaleX: 2.3,
      scaleY: 2.3,
      duration: 460,
      ease: "Cubic.easeOut",
      onComplete: () => burst.destroy(),
    });
  }

  private getPairById(pairId: number) {
    return this.puzzle.pairs.find((pair) => pair.pairId === pairId) ?? null;
  }

  private getEndpointPair(index: number) {
    return this.puzzle.pairs.find((pair) => pair.endpoints.includes(index)) ?? null;
  }

  private getCompletedOwner(index: number) {
    for (const [pairId, path] of this.completedPaths.entries()) {
      if (path.includes(index)) return pairId;
    }
    return null;
  }

  private isBlocked(index: number, pairId: number) {
    for (const [ownerId, path] of this.completedPaths.entries()) {
      if (ownerId !== pairId && path.includes(index)) return true;
    }
    return false;
  }

  private isAdjacent(left: number, right: number) {
    const leftRow = Math.floor(left / this.puzzle.size);
    const leftCol = left % this.puzzle.size;
    const rightRow = Math.floor(right / this.puzzle.size);
    const rightCol = right % this.puzzle.size;
    return Math.abs(leftRow - rightRow) + Math.abs(leftCol - rightCol) === 1;
  }

  private getCellCenter(index: number) {
    const row = Math.floor(index / this.puzzle.size);
    const col = index % this.puzzle.size;
    return {
      x: this.gridLeft + col * this.cellSize + this.cellSize / 2,
      y: this.gridTop + row * this.cellSize + this.cellSize / 2,
    };
  }
}
