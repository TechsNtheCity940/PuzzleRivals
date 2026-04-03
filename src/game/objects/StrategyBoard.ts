import Phaser from "phaser";
import {
  buildStrategyRounds,
  getStrategyLegalMoves,
  getStrategyMovePath,
  isStrategySolutionMove,
  type StrategyMove,
  type StrategyPiece,
  type StrategyPieceCode,
  type StrategyPuzzleKind,
  type StrategyRound,
  type StrategySide,
} from "@/lib/strategy-puzzle-content";
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

interface StrategyBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

interface SquareVisual {
  base: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
  hit: Phaser.GameObjects.Zone;
}

interface PieceVisual {
  piece: StrategyPiece;
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Arc;
  base: Phaser.GameObjects.Arc;
  rim: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  badge?: Phaser.GameObjects.Text;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = Math.floor(seed) % 2147483647;
    if (this.seed <= 0) {
      this.seed += 2147483646;
    }
  }

  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

function emptyColorProgress() {
  return TILE_TYPES.reduce((accumulator, tileType) => {
    accumulator[tileType] = 0;
    return accumulator;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

function boardPalette(mode: NeonRivalsRunMode) {
  if (mode === "checkers_trap") {
    return {
      squareDark: 0x111827,
      squareLight: 0x1b2c45,
      edge: 0x5ff4ff,
      candidate: 0xffa857,
      correct: 0xc8ff4d,
      wrong: 0xff5d8f,
      playerPiece: 0xff8e61,
      enemyPiece: 0x65f2ff,
      accent: 0xffc86f,
    };
  }

  if (mode === "chess_endgame") {
    return {
      squareDark: 0x101828,
      squareLight: 0x16223b,
      edge: 0x7cf3ff,
      candidate: 0x8ad8ff,
      correct: 0xc8ff4d,
      wrong: 0xff5d8f,
      playerPiece: 0xffe27a,
      enemyPiece: 0x9ac2ff,
      accent: 0xc8ff4d,
    };
  }

  if (mode === "chess_opening") {
    return {
      squareDark: 0x101828,
      squareLight: 0x182744,
      edge: 0x65f2ff,
      candidate: 0x7cd7ff,
      correct: 0xc8ff4d,
      wrong: 0xff5d8f,
      playerPiece: 0xffd76e,
      enemyPiece: 0x8fa8ff,
      accent: 0x65f2ff,
    };
  }

  if (mode === "chess_mate_net") {
    return {
      squareDark: 0x130f22,
      squareLight: 0x1a2440,
      edge: 0xff86d3,
      candidate: 0xffc56a,
      correct: 0xc8ff4d,
      wrong: 0xff5d8f,
      playerPiece: 0xffe27a,
      enemyPiece: 0xb48eff,
      accent: 0xff86d3,
    };
  }

  return {
    squareDark: 0x101828,
    squareLight: 0x17243d,
    edge: 0x65f2ff,
    candidate: 0xb88aff,
    correct: 0xc8ff4d,
    wrong: 0xff5d8f,
    playerPiece: 0xffe27a,
    enemyPiece: 0x8fa8ff,
    accent: 0xffe27a,
  };
}

function getStrategyPuzzleKind(mode: NeonRivalsRunMode): StrategyPuzzleKind {
  if (mode === "checkers_trap") {
    return "checkers_tactic";
  }
  if (mode === "chess_endgame") {
    return "chess_endgame";
  }
  if (mode === "chess_opening") {
    return "chess_opening";
  }
  if (mode === "chess_mate_net") {
    return "chess_mate_net";
  }
  return "chess_tactic";
}

function getPieceSide(piece: StrategyPieceCode): StrategySide {
  if (piece.startsWith("w")) {
    return "white";
  }
  if (piece.startsWith("r")) {
    return "red";
  }
  return "black";
}

function formatSideLabel(side: StrategySide) {
  if (side === "white") return "WHITE";
  if (side === "red") return "RED";
  return "BLACK";
}

function getPieceGlyph(piece: StrategyPieceCode, game: StrategyRound["game"]) {
  if (game === "checkers") {
    return piece.endsWith("K") ? "K" : "";
  }

  switch (piece) {
    case "wK": return "?";
    case "wQ": return "?";
    case "wR": return "?";
    case "wB": return "?";
    case "wN": return "?";
    case "wP": return "?";
    case "bK": return "?";
    case "bQ": return "?";
    case "bR": return "?";
    case "bB": return "?";
    case "bN": return "?";
    case "bP": return "?";
    default: return "";
  }
}

export default class StrategyBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private difficulty: 1 | 2 | 3 | 4 | 5;
  private objective = buildNeonRivalsObjective("chess_shot", 1);
  private rounds: StrategyRound[] = [];
  private status: NeonRivalsGameStatus = "booting";
  private inputLocked = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 10;
  private targetScore = 1780;
  private runStartedAtMs = 0;
  private roundIndex = 0;
  private solvedMoves: StrategyMove[] = [];
  private size = 8;
  private cellSize = 70;
  private boardLeft = 0;
  private boardTop = 0;
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private scanLine?: Phaser.GameObjects.Rectangle;
  private promptText?: Phaser.GameObjects.Text;
  private roundText?: Phaser.GameObjects.Text;
  private helperText?: Phaser.GameObjects.Text;
  private boardSquares: SquareVisual[] = [];
  private rankLabels: Phaser.GameObjects.Text[] = [];
  private fileLabels: Phaser.GameObjects.Text[] = [];
  private pieceVisuals = new Map<number, PieceVisual>();
  private hoverBeam?: Phaser.GameObjects.Graphics;
  private currentRound?: StrategyRound;
  private selectedSquare: number | null = null;
  private hoveredMove: StrategyMove | null = null;

  constructor(scene: Phaser.Scene, options: StrategyBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.difficulty = options.difficulty ?? 4;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.rounds = buildStrategyRounds(getStrategyPuzzleKind(this.mode), this.sessionSeed, this.difficulty);
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
    this.solvedMoves = [];
    this.buildBoardSurface();
    this.renderRound();
    this.status = "running";
    this.emitState();
  }

  destroy() {
    this.clearRoundVisuals();
    this.boardSquares.forEach((square) => {
      square.base.destroy();
      square.glow.destroy();
      square.hit.destroy();
    });
    this.rankLabels.forEach((label) => label.destroy());
    this.fileLabels.forEach((label) => label.destroy());
    this.boardShadow?.destroy();
    this.boardFrame?.destroy();
    this.scanLine?.destroy();
    this.promptText?.destroy();
    this.roundText?.destroy();
    this.helperText?.destroy();
    this.hoverBeam?.destroy();
  }

  private buildBoardSurface() {
    const palette = boardPalette(this.mode);
    const boardSize = Math.min(BOARD_VIEWPORT_WIDTH - 54, BOARD_VIEWPORT_HEIGHT - 142);
    this.cellSize = Math.floor(boardSize / this.size);
    const actualBoardSize = this.cellSize * this.size;
    this.boardLeft = Math.round(BOARD_VIEWPORT_CENTER_X - actualBoardSize / 2);
    this.boardTop = Math.round(BOARD_VIEWPORT_CENTER_Y - actualBoardSize / 2 + 34);

    this.boardShadow = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y + 34,
      actualBoardSize + 84,
      actualBoardSize + 150,
      0x070f1d,
      0.9,
    );
    this.boardShadow.setStrokeStyle(2, palette.edge, 0.16);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y + 34,
      actualBoardSize + 40,
      actualBoardSize + 106,
      0x0a1630,
      0.56,
    );
    this.boardFrame.setStrokeStyle(3, palette.edge, 0.28);
    this.boardFrame.setDepth(20);

    this.scanLine = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      this.boardTop - 34,
      actualBoardSize + 24,
      10,
      palette.edge,
      0.08,
    );
    this.scanLine.setDepth(21);
    this.scene.tweens.add({
      targets: this.scanLine,
      y: this.boardTop + actualBoardSize + 34,
      alpha: { from: 0.03, to: 0.14 },
      duration: 2200,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.roundText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, this.boardTop - 86, "ROUND 1/1", {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "20px",
      color: "#65f2ff",
      letterSpacing: 6,
      align: "center",
    }).setOrigin(0.5).setDepth(28);

    this.promptText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, this.boardTop - 56, "", {
      fontFamily: "Arial Black, Arial",
      fontSize: "22px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: actualBoardSize + 10 },
      lineSpacing: 8,
    }).setOrigin(0.5, 0).setDepth(28);

    this.helperText = this.scene.add.text(BOARD_VIEWPORT_CENTER_X, this.boardTop + 4, "", {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "14px",
      color: "#b8c9de",
      align: "center",
      wordWrap: { width: actualBoardSize + 20 },
    }).setOrigin(0.5, 0).setDepth(28);

    this.createBoardSquares();
    this.createCoordinateLabels();
    this.hoverBeam = this.scene.add.graphics().setDepth(36);
  }

  private createBoardSquares() {
    const palette = boardPalette(this.mode);
    this.boardSquares = [];
    for (let row = 0; row < this.size; row += 1) {
      for (let col = 0; col < this.size; col += 1) {
        const squareIndex = row * this.size + col;
        const center = this.getSquareCenter(squareIndex);
        const isLight = (row + col) % 2 === 0;
        const glow = this.scene.add.rectangle(center.x, center.y, this.cellSize - 2, this.cellSize - 2, palette.candidate, 0);
        const base = this.scene.add.rectangle(center.x, center.y, this.cellSize - 4, this.cellSize - 4, isLight ? palette.squareLight : palette.squareDark, 0.96);
        const hit = this.scene.add.zone(center.x, center.y, this.cellSize - 4, this.cellSize - 4);
        hit.setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => {
          void this.handleSquarePointerDown(squareIndex);
        });
        hit.on("pointerover", () => this.handleSquarePointerOver(squareIndex));
        hit.on("pointerout", () => this.handleSquarePointerOut(squareIndex));
        base.setStrokeStyle(1, palette.edge, isLight ? 0.16 : 0.08);
        glow.setDepth(22);
        base.setDepth(23);
        hit.setDepth(32);
        this.boardSquares.push({ base, glow, hit });
      }
    }
  }

  private createCoordinateLabels() {
    const alphabet = "ABCDEFGH";
    this.rankLabels = [];
    this.fileLabels = [];
    for (let row = 0; row < this.size; row += 1) {
      const label = this.scene.add.text(this.boardLeft - 18, this.boardTop + row * this.cellSize + this.cellSize / 2, String(8 - row), {
        fontFamily: "Chakra Petch, Arial",
        fontSize: "18px",
        color: "#7fa4c9",
      }).setOrigin(0.5).setDepth(24);
      this.rankLabels.push(label);
    }

    for (let col = 0; col < this.size; col += 1) {
      const label = this.scene.add.text(this.boardLeft + col * this.cellSize + this.cellSize / 2, this.boardTop + this.size * this.cellSize + 16, alphabet[col], {
        fontFamily: "Chakra Petch, Arial",
        fontSize: "18px",
        color: "#7fa4c9",
      }).setOrigin(0.5).setDepth(24);
      this.fileLabels.push(label);
    }
  }

  private renderRound() {
    this.clearRoundVisuals();
    this.currentRound = this.rounds[this.roundIndex];
    this.selectedSquare = null;
    this.hoveredMove = null;

    this.roundText?.setText(`ROUND ${this.roundIndex + 1}/${this.rounds.length} | ${formatSideLabel(this.currentRound.sideToMove)} TO MOVE`);
    this.promptText?.setText(this.currentRound.prompt);
    this.helperText?.setText(this.currentRound.helperText);

    this.currentRound.pieces.forEach((piece) => {
      const visual = this.createPiece(piece);
      this.pieceVisuals.set(piece.square, visual);
    });

    this.syncBoardHighlights();
  }

  private clearRoundVisuals() {
    this.pieceVisuals.forEach((visual) => visual.container.destroy());
    this.pieceVisuals.clear();
    this.hoverBeam?.clear();
  }

  private createPiece(piece: StrategyPiece) {
    const currentRound = this.currentRound;
    if (!currentRound) {
      throw new Error("Strategy round not loaded before piece render.");
    }

    const center = this.getSquareCenter(piece.square);
    const palette = boardPalette(this.mode);
    const friendly = getPieceSide(piece.piece) === currentRound.sideToMove;
    const fillColor = friendly ? palette.playerPiece : palette.enemyPiece;
    const glyph = getPieceGlyph(piece.piece, currentRound.game);
    const container = this.scene.add.container(center.x, center.y).setDepth(friendly ? 38 : 31);
    const glow = this.scene.add.circle(0, 0, this.cellSize * 0.28, fillColor, friendly ? 0.14 : 0.08);
    const base = this.scene.add.circle(0, 0, this.cellSize * 0.22, fillColor, 0.92);
    const rim = this.scene.add.circle(0, 0, this.cellSize * 0.18, currentRound.game === "checkers" ? 0x122039 : 0x0c1628, currentRound.game === "checkers" ? 0.3 : 0.14);
    rim.setStrokeStyle(2, 0xffffff, friendly ? 0.24 : 0.14);
    const label = this.scene.add.text(0, 0, glyph, {
      fontFamily: currentRound.game === "checkers" ? "Chakra Petch, Arial" : "Segoe UI Symbol, Arial Unicode MS, Arial",
      fontSize: `${Math.max(16, Math.floor(this.cellSize * (currentRound.game === "checkers" ? 0.2 : 0.34)))}px`,
      color: currentRound.game === "checkers" ? "#f8fbff" : friendly ? "#08131f" : "#0b1525",
      align: "center",
    }).setOrigin(0.5);
    let badge: Phaser.GameObjects.Text | undefined;
    if (currentRound.game === "checkers" && piece.piece.endsWith("K")) {
      badge = this.scene.add.text(0, -this.cellSize * 0.02, "?", {
        fontFamily: "Chakra Petch, Arial",
        fontSize: `${Math.max(14, Math.floor(this.cellSize * 0.22))}px`,
        color: "#f8fbff",
        align: "center",
      }).setOrigin(0.5);
    }
    container.add([glow, base, rim, label]);
    if (badge) {
      container.add(badge);
    }

    this.scene.tweens.add({
      targets: [glow, base],
      alpha: { from: friendly ? 0.82 : 0.66, to: 1 },
      scaleX: { from: 0.97, to: 1.04 },
      scaleY: { from: 0.97, to: 1.04 },
      yoyo: true,
      repeat: -1,
      duration: friendly ? 760 : 1040,
      ease: "Sine.easeInOut",
    });

    return { piece, container, glow, base, rim, label, badge };
  }

  private syncBoardHighlights() {
    const currentRound = this.currentRound;
    if (!currentRound) {
      return;
    }

    const palette = boardPalette(this.mode);
    const allMoves = getStrategyLegalMoves(currentRound);
    const selectableSquares = new Set(allMoves.map((move) => move.from));
    const selectedMoves = this.selectedSquare === null ? [] : getStrategyLegalMoves(currentRound, this.selectedSquare);
    const destinationSquares = new Set(selectedMoves.map((move) => move.to));
    const pathSquares = new Set(this.hoveredMove ? getStrategyMovePath(currentRound, this.hoveredMove) : []);
    const captureSquares = new Set(this.hoveredMove?.captures ?? []);

    this.boardSquares.forEach((square, index) => {
      let fillAlpha = 0;
      let strokeWidth = 1;
      let strokeColor = palette.edge;
      let strokeAlpha = ((Math.floor(index / this.size) + (index % this.size)) % 2 === 0) ? 0.16 : 0.08;

      if (selectableSquares.has(index)) {
        fillAlpha = 0.03;
      }
      if (destinationSquares.has(index)) {
        fillAlpha = 0.12;
        strokeWidth = 2;
        strokeColor = palette.candidate;
        strokeAlpha = 0.32;
      }
      if (this.selectedSquare === index) {
        fillAlpha = 0.18;
        strokeWidth = 2.25;
        strokeColor = palette.edge;
        strokeAlpha = 0.54;
      }
      if (pathSquares.has(index)) {
        fillAlpha = 0.16;
        strokeWidth = 2.25;
        strokeColor = palette.candidate;
        strokeAlpha = 0.46;
      }
      if (captureSquares.has(index)) {
        fillAlpha = 0.18;
        strokeWidth = 2.4;
        strokeColor = palette.wrong;
        strokeAlpha = 0.54;
      }

      square.glow.setFillStyle(pathSquares.has(index) ? palette.candidate : captureSquares.has(index) ? palette.wrong : palette.edge, fillAlpha);
      square.base.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);
    });

    this.hoverBeam?.clear();
    if (this.hoveredMove) {
      const path = [this.hoveredMove.from, ...getStrategyMovePath(currentRound, this.hoveredMove)];
      if (path.length > 1) {
        this.hoverBeam?.lineStyle(6, palette.edge, 0.34);
        this.hoverBeam?.beginPath();
        const first = this.getSquareCenter(path[0]);
        this.hoverBeam?.moveTo(first.x, first.y);
        for (let index = 1; index < path.length; index += 1) {
          const point = this.getSquareCenter(path[index]);
          this.hoverBeam?.lineTo(point.x, point.y);
        }
        this.hoverBeam?.strokePath();
        const final = this.getSquareCenter(path[path.length - 1]);
        this.hoverBeam?.fillStyle(palette.edge, 0.42);
        this.hoverBeam?.fillCircle(final.x, final.y, Math.max(7, Math.round(this.cellSize * 0.1)));
      }
    }

    this.pieceVisuals.forEach((visual, squareIndex) => {
      const friendly = getPieceSide(visual.piece.piece) === currentRound.sideToMove;
      visual.glow.setAlpha(this.selectedSquare === squareIndex ? 0.28 : selectableSquares.has(squareIndex) ? 0.16 : friendly ? 0.1 : 0.06);
      visual.base.setStrokeStyle(2, 0xffffff, this.selectedSquare === squareIndex ? 0.46 : selectableSquares.has(squareIndex) ? 0.28 : friendly ? 0.2 : 0.12);
      visual.container.setScale(this.selectedSquare === squareIndex ? 1.08 : 1);
    });
  }

  private handleSquarePointerOver(squareIndex: number) {
    if (this.inputLocked || !this.currentRound || this.selectedSquare === null) {
      return;
    }

    const move = getStrategyLegalMoves(this.currentRound, this.selectedSquare).find((entry) => entry.to === squareIndex) ?? null;
    this.hoveredMove = move;
    this.syncBoardHighlights();
  }

  private handleSquarePointerOut(squareIndex: number) {
    if (!this.hoveredMove || this.hoveredMove.to !== squareIndex) {
      return;
    }
    this.hoveredMove = null;
    this.syncBoardHighlights();
  }

  private async handleSquarePointerDown(squareIndex: number) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed" || !this.currentRound) {
      return;
    }

    if (this.selectedSquare !== null) {
      const selectedMove = getStrategyLegalMoves(this.currentRound, this.selectedSquare).find((entry) => entry.to === squareIndex);
      if (selectedMove) {
        await this.commitMove(selectedMove);
        return;
      }
    }

    const piece = this.currentRound.pieces.find((entry) => entry.square === squareIndex);
    const currentMoves = getStrategyLegalMoves(this.currentRound);
    const selectableSquares = new Set(currentMoves.map((move) => move.from));

    if (piece && getPieceSide(piece.piece) === this.currentRound.sideToMove && selectableSquares.has(squareIndex)) {
      this.selectedSquare = this.selectedSquare === squareIndex ? null : squareIndex;
      this.hoveredMove = null;
      this.syncBoardHighlights();
      return;
    }

    this.selectedSquare = null;
    this.hoveredMove = null;
    this.syncBoardHighlights();
  }

  private async commitMove(move: StrategyMove) {
    if (!this.currentRound) {
      return;
    }

    this.inputLocked = true;
    this.movesLeft = Math.max(0, this.movesLeft - 1);
    const palette = boardPalette(this.mode);
    this.hoveredMove = move;
    this.syncBoardHighlights();

    if (isStrategySolutionMove(this.currentRound, move)) {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.matchedTiles = this.roundIndex + 1;
      this.score += 180 + Math.max(0, this.movesLeft * 7);
      this.solvedMoves[this.roundIndex] = { from: move.from, to: move.to };
      await this.playCorrectMove(move, palette.correct);

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
    this.score = Math.max(0, this.score - (105 + this.roundIndex * 12));
    await this.playWrongMove(move, palette.wrong);

    if (this.movesLeft <= 0) {
      this.status = "failed";
      this.emitState();
      await this.playFailure();
      this.emitState();
      this.bridge?.onFailed?.(this.snapshotState());
      return;
    }

    this.inputLocked = false;
    this.hoveredMove = null;
    this.syncBoardHighlights();
    this.emitState();
  }

  private async playCorrectMove(move: StrategyMove, color: number) {
    const movingVisual = this.pieceVisuals.get(move.from);
    if (!movingVisual) {
      return;
    }

    const burst = this.scene.add.image(this.getSquareCenter(move.to).x, this.getSquareCenter(move.to).y, "impact_ring");
    burst.setTint(color);
    burst.setDepth(42);
    burst.setAlpha(0.22);
    burst.setScale(0.34);

    const captureVisuals = (move.captures ?? [])
      .map((square) => this.pieceVisuals.get(square))
      .filter((entry): entry is PieceVisual => Boolean(entry));

    await Promise.all([
      this.tweenPromise(movingVisual.container, {
        x: this.getSquareCenter(move.to).x,
        y: this.getSquareCenter(move.to).y,
        duration: 220,
        ease: "Cubic.easeOut",
      }),
      this.tweenPromise(burst, {
        alpha: 0,
        scaleX: 1.24,
        scaleY: 1.24,
        duration: 240,
        ease: "Cubic.easeOut",
      }),
      ...captureVisuals.map((visual) => this.tweenPromise(visual.container, {
        alpha: 0,
        scaleX: 0.76,
        scaleY: 0.76,
        duration: 180,
        ease: "Cubic.easeIn",
      })),
    ]);

    burst.destroy();
  }

  private async playWrongMove(move: StrategyMove, color: number) {
    const targetSquare = this.boardSquares[move.to];
    const movingVisual = this.pieceVisuals.get(move.from);
    targetSquare.glow.setFillStyle(color, 0.24);
    targetSquare.base.setStrokeStyle(2.4, color, 0.9);
    this.scene.cameras.main.shake(100, 0.0017);
    await Promise.all([
      this.tweenPromise(targetSquare.base, {
        angle: 4,
        duration: 70,
        yoyo: true,
        repeat: 1,
        ease: "Sine.easeInOut",
      }),
      this.tweenPromise(movingVisual?.container, {
        angle: 6,
        duration: 70,
        yoyo: true,
        repeat: 1,
        ease: "Sine.easeInOut",
      }),
    ]);
    targetSquare.base.setAngle(0);
    movingVisual?.container.setAngle(0);
  }

  private async playCompletion() {
    const burst = this.scene.add.image(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y + 44, "combo_burst");
    burst.setTint(boardPalette(this.mode).accent);
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

  private buildSubmission(): PuzzleSubmission {
    return {
      kind: getStrategyPuzzleKind(this.mode),
      moves: this.solvedMoves.map((move) => ({ from: move.from, to: move.to })),
    } as PuzzleSubmission;
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

  private getSquareCenter(squareIndex: number) {
    const row = Math.floor(squareIndex / this.size);
    const col = squareIndex % this.size;
    return {
      x: this.boardLeft + col * this.cellSize + this.cellSize / 2,
      y: this.boardTop + row * this.cellSize + this.cellSize / 2,
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
