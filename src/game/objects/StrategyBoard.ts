import Phaser from "phaser";
import { buildGeneratedQuizRounds, type GeneratedQuizRound, type QuizPuzzleKind } from "../../../shared/match-quiz-content";
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
}

interface CandidateVisual {
  squareIndex: number;
  optionIndex: number;
  glow: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

interface PieceVisual {
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Arc;
  base: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

type StrategyPieceKind = "knight" | "bishop" | "rook" | "queen" | "checker" | "checker_king";

interface StrategyPieceSpec {
  kind: StrategyPieceKind;
  playerGlyph: string;
  enemyGlyph: string;
  label: string;
}

interface StrategyLayout {
  activeSquare: number;
  candidateSquares: number[];
  ambientSquares: number[];
  activePiece: StrategyPieceSpec;
  ambientPieces: StrategyPieceSpec[];
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

  nextInt(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  shuffle<T>(items: T[]) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(0, index);
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
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

function getQuizKind(mode: NeonRivalsRunMode): QuizPuzzleKind {
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

function getStrategyPiecePool(mode: NeonRivalsRunMode): StrategyPieceSpec[] {
  if (mode === "checkers_trap") {
    return [
      { kind: "checker", playerGlyph: "", enemyGlyph: "", label: "Checker" },
      { kind: "checker_king", playerGlyph: "\u2726", enemyGlyph: "\u2726", label: "Checker King" },
    ];
  }

  return [
    { kind: "knight", playerGlyph: "\u2658", enemyGlyph: "\u265E", label: "Knight" },
    { kind: "bishop", playerGlyph: "\u2657", enemyGlyph: "\u265D", label: "Bishop" },
    { kind: "rook", playerGlyph: "\u2656", enemyGlyph: "\u265C", label: "Rook" },
    { kind: "queen", playerGlyph: "\u2655", enemyGlyph: "\u265B", label: "Queen" },
  ];
}

function addCandidateSquare(candidates: number[], seen: Set<number>, row: number, col: number, size: number) {
  if (row < 0 || row >= size || col < 0 || col >= size) {
    return;
  }
  const squareIndex = row * size + col;
  if (seen.has(squareIndex)) {
    return;
  }
  seen.add(squareIndex);
  candidates.push(squareIndex);
}

function addCandidateRay(candidates: number[], seen: Set<number>, row: number, col: number, dr: number, dc: number, size: number) {
  let nextRow = row + dr;
  let nextCol = col + dc;
  while (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size) {
    addCandidateSquare(candidates, seen, nextRow, nextCol, size);
    nextRow += dr;
    nextCol += dc;
  }
}

function getCandidateSquaresForPiece(kind: StrategyPieceKind, row: number, col: number, size: number) {
  const candidates: number[] = [];
  const seen = new Set<number>();

  switch (kind) {
    case "knight": {
      [[-2, 1], [-1, 2], [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1]].forEach(([dr, dc]) => {
        addCandidateSquare(candidates, seen, row + dr, col + dc, size);
      });
      break;
    }
    case "bishop": {
      [[-1, -1], [-1, 1], [1, 1], [1, -1]].forEach(([dr, dc]) => {
        addCandidateRay(candidates, seen, row, col, dr, dc, size);
      });
      break;
    }
    case "rook": {
      [[-1, 0], [0, 1], [1, 0], [0, -1]].forEach(([dr, dc]) => {
        addCandidateRay(candidates, seen, row, col, dr, dc, size);
      });
      break;
    }
    case "queen": {
      [[-1, -1], [-1, 1], [1, 1], [1, -1], [-1, 0], [0, 1], [1, 0], [0, -1]].forEach(([dr, dc]) => {
        addCandidateRay(candidates, seen, row, col, dr, dc, size);
      });
      break;
    }
    case "checker": {
      [[-1, -1], [-1, 1], [-2, -2], [-2, 2]].forEach(([dr, dc]) => {
        addCandidateSquare(candidates, seen, row + dr, col + dc, size);
      });
      break;
    }
    case "checker_king": {
      [[-1, -1], [-1, 1], [1, 1], [1, -1], [-2, -2], [-2, 2], [2, 2], [2, -2]].forEach(([dr, dc]) => {
        addCandidateSquare(candidates, seen, row + dr, col + dc, size);
      });
      break;
    }
  }

  return candidates;
}

function getPathSquares(
  fromSquare: number,
  toSquare: number,
  kind: StrategyPieceKind,
  size: number,
) {
  const path: number[] = [];
  const fromRow = Math.floor(fromSquare / size);
  const fromCol = fromSquare % size;
  const toRow = Math.floor(toSquare / size);
  const toCol = toSquare % size;
  const dr = toRow - fromRow;
  const dc = toCol - fromCol;

  if (kind === "knight") {
    const stepRow = fromRow + (Math.abs(dr) === 2 ? Math.sign(dr) : 0);
    const stepCol = fromCol + (Math.abs(dc) === 2 ? Math.sign(dc) : 0);
    if (stepRow !== fromRow || stepCol !== fromCol) {
      path.push(stepRow * size + stepCol);
    }
    path.push(toSquare);
    return path;
  }

  const rowStep = dr === 0 ? 0 : dr / Math.abs(dr);
  const colStep = dc === 0 ? 0 : dc / Math.abs(dc);
  let row = fromRow + rowStep;
  let col = fromCol + colStep;
  while (row !== toRow || col !== toCol) {
    path.push(row * size + col);
    row += rowStep;
    col += colStep;
  }

  path.push(toSquare);
  return path;
}

export default class StrategyBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private difficulty: 1 | 2 | 3 | 4 | 5;
  private objective = buildNeonRivalsObjective("chess_shot", 1);
  private rounds: GeneratedQuizRound[] = [];
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
  private answers: number[] = [];
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
  private candidateVisuals: CandidateVisual[] = [];
  private ambientPieces: PieceVisual[] = [];
  private activePiece?: PieceVisual;
  private hoverBeam?: Phaser.GameObjects.Graphics;
  private hoverTargetIndex: number | null = null;
  private currentLayout?: StrategyLayout;

  constructor(scene: Phaser.Scene, options: StrategyBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.difficulty = options.difficulty ?? 4;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.rounds = buildGeneratedQuizRounds(getQuizKind(this.mode), this.sessionSeed, this.difficulty);
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
    this.answers = [];
    this.buildBoardSurface();
    this.renderRound();
    this.status = "running";
    this.emitState();
  }

  destroy() {
    this.boardSquares.forEach((square) => {
      square.base.destroy();
      square.glow.destroy();
    });
    this.rankLabels.forEach((label) => label.destroy());
    this.fileLabels.forEach((label) => label.destroy());
    this.candidateVisuals.forEach((candidate) => {
      candidate.glow.destroy();
      candidate.frame.destroy();
      candidate.label.destroy();
    });
    this.ambientPieces.forEach((piece) => piece.container.destroy());
    this.activePiece?.container.destroy();
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
        const center = this.getSquareCenter(row * this.size + col);
        const isLight = (row + col) % 2 === 0;
        const glow = this.scene.add.rectangle(center.x, center.y, this.cellSize - 2, this.cellSize - 2, palette.candidate, 0);
        const base = this.scene.add.rectangle(center.x, center.y, this.cellSize - 4, this.cellSize - 4, isLight ? palette.squareLight : palette.squareDark, 0.96);
        base.setStrokeStyle(1, palette.edge, isLight ? 0.16 : 0.08);
        glow.setDepth(22);
        base.setDepth(23);
        this.boardSquares.push({ base, glow });
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
    const round = this.rounds[this.roundIndex];
    this.currentLayout = this.buildLayout(this.roundIndex);
    const palette = boardPalette(this.mode);

    this.roundText?.setText(`ROUND ${this.roundIndex + 1}/${this.rounds.length}`);
    this.promptText?.setText(round.prompt);
    this.helperText?.setText(this.getRoundHelperText());

    this.highlightBoardFocus();
    this.activePiece = this.createPiece(this.currentLayout.activeSquare, this.currentLayout.activePiece, palette.playerPiece, true, false);
    this.ambientPieces = this.currentLayout.ambientSquares.map((squareIndex, index) =>
      this.createPiece(squareIndex, this.currentLayout!.ambientPieces[index], palette.enemyPiece, false, true),
    );

    this.candidateVisuals = this.currentLayout.candidateSquares.map((squareIndex, optionIndex) => {
      const center = this.getSquareCenter(squareIndex);
      const glow = this.scene.add.rectangle(center.x, center.y, this.cellSize - 8, this.cellSize - 8, palette.candidate, 0.12);
      const frame = this.scene.add.rectangle(center.x, center.y, this.cellSize - 12, this.cellSize - 12, palette.squareDark, 0.16);
      frame.setStrokeStyle(2, palette.candidate, 0.72);
      const label = this.scene.add.text(center.x, center.y, round.options[optionIndex], {
        fontFamily: "Chakra Petch, Arial",
        fontSize: `${Math.max(12, Math.floor(this.cellSize * 0.17))}px`,
        color: "#ffffff",
        align: "center",
        wordWrap: { width: this.cellSize - 18 },
      }).setOrigin(0.5).setDepth(35);
      glow.setDepth(33);
      frame.setDepth(34);
      glow.setInteractive();
      glow.on("pointerover", () => this.handleHover(optionIndex));
      glow.on("pointerout", () => this.clearHover());
      glow.on("pointerdown", () => {
        void this.handleSelection(optionIndex);
      });
      return { squareIndex, optionIndex, glow, frame, label };
    });
  }

  private getRoundHelperText() {
    if (this.mode === "checkers_trap") {
      return "Tap the glowing landing square that completes the strongest jump line.";
    }
    if (this.mode === "chess_endgame") {
      return "Read the ending plan, then tap the square that converts the position cleanly.";
    }
    if (this.mode === "chess_opening") {
      return "Development, king safety, and center control matter more than flashy early attacks.";
    }
    if (this.mode === "chess_mate_net") {
      return "Look for forcing checks and covered escape squares before you commit the final hit.";
    }
    return "Tap the glowing board target that matches the winning tactical move.";
  }

  private clearRoundVisuals() {
    this.candidateVisuals.forEach((candidate) => {
      candidate.glow.destroy();
      candidate.frame.destroy();
      candidate.label.destroy();
    });
    this.candidateVisuals = [];
    this.ambientPieces.forEach((piece) => piece.container.destroy());
    this.ambientPieces = [];
    this.activePiece?.container.destroy();
    this.activePiece = undefined;
    this.clearHover();
  }

  private buildLayout(roundIndex: number): StrategyLayout {
    const rng = new SeededRandom(this.sessionSeed + roundIndex * 7919 + (this.mode === "checkers_trap" ? 97 : 31));
    const piecePool = getStrategyPiecePool(this.mode);
    const activePiece = piecePool[rng.nextInt(0, piecePool.length - 1)];
    const activeRow = rng.nextInt(2, 5);
    const activeCol = rng.nextInt(2, 5);
    const activeSquare = activeRow * this.size + activeCol;

    const legalSquares = getCandidateSquaresForPiece(activePiece.kind, activeRow, activeCol, this.size)
      .filter((squareIndex) => squareIndex !== activeSquare);
    const candidateSquares = rng.shuffle(legalSquares).slice(0, 4);
    while (candidateSquares.length < 4) {
      const next = rng.nextInt(0, this.size * this.size - 1);
      if (next !== activeSquare && !candidateSquares.includes(next)) {
        candidateSquares.push(next);
      }
    }

    const ambientPool = Array.from({ length: this.size * this.size }, (_, index) => index)
      .filter((index) => index !== activeSquare && !candidateSquares.includes(index));
    const ambientSquares = rng.shuffle(ambientPool).slice(0, this.mode === "checkers_trap" ? 7 : 6);
    const ambientPieces = ambientSquares.map(() => piecePool[rng.nextInt(0, piecePool.length - 1)]);

    return {
      activeSquare,
      candidateSquares,
      ambientSquares,
      activePiece,
      ambientPieces,
    };
  }

  private highlightBoardFocus() {
    this.boardSquares.forEach((square, index) => {
      const highlight = this.currentLayout?.candidateSquares.includes(index) ? 0.06 : 0;
      square.glow.setFillStyle(boardPalette(this.mode).candidate, highlight);
    });
  }

  private createPiece(squareIndex: number, piece: StrategyPieceSpec, fillColor: number, active: boolean, enemy: boolean) {
    const center = this.getSquareCenter(squareIndex);
    const container = this.scene.add.container(center.x, center.y);
    container.setDepth(active ? 38 : 31);
    const glow = this.scene.add.circle(0, 0, this.cellSize * 0.28, fillColor, active ? 0.2 : 0.1);
    const base = this.scene.add.circle(0, 0, this.cellSize * 0.22, fillColor, 0.92);
    base.setStrokeStyle(2, 0xffffff, active ? 0.32 : 0.18);
    const rim = this.scene.add.circle(0, 0, this.cellSize * 0.18, enemy ? 0x091321 : 0x11213c, piece.kind.startsWith("checker") ? 0.36 : 0.18);
    rim.setStrokeStyle(1.5, 0xffffff, piece.kind.startsWith("checker") ? 0.24 : 0.12);
    const glyph = enemy ? piece.enemyGlyph : piece.playerGlyph;
    const label = this.scene.add.text(0, 0, glyph, {
      fontFamily: "Segoe UI Symbol, Arial Unicode MS, Arial",
      fontSize: `${Math.max(18, Math.floor(this.cellSize * (piece.kind.startsWith("checker") ? 0.19 : 0.34)))}px`,
      color: piece.kind.startsWith("checker") ? "#f8fbff" : active ? "#08131f" : "#0b1525",
      align: "center",
    }).setOrigin(0.5);
    if (piece.kind === "checker") {
      label.setText("");
    }
    container.add([glow, base, rim, label]);

    this.scene.tweens.add({
      targets: [glow, base],
      alpha: { from: active ? 0.82 : 0.66, to: 1 },
      scaleX: { from: 0.97, to: 1.04 },
      scaleY: { from: 0.97, to: 1.04 },
      yoyo: true,
      repeat: -1,
      duration: active ? 760 : 1040,
      ease: "Sine.easeInOut",
    });

    return { container, glow, base, label };
  }

  private handleHover(optionIndex: number) {
    if (this.inputLocked || !this.currentLayout || !this.activePiece) {
      return;
    }

    this.hoverTargetIndex = optionIndex;
    const candidate = this.candidateVisuals[optionIndex];
    const palette = boardPalette(this.mode);
    const pathSquares = new Set(
      getPathSquares(
        this.currentLayout.activeSquare,
        candidate.squareIndex,
        this.currentLayout.activePiece.kind,
        this.size,
      ),
    );

    this.boardSquares.forEach((square, index) => {
      const isActive = this.currentLayout?.activeSquare === index;
      const isCandidate = this.currentLayout?.candidateSquares.includes(index) ?? false;
      const onPath = pathSquares.has(index);
      square.glow.setFillStyle(
        isActive ? palette.edge : onPath ? palette.candidate : palette.candidate,
        isActive ? 0.18 : onPath ? 0.14 : isCandidate ? 0.06 : 0,
      );
      square.base.setStrokeStyle(
        isActive || onPath ? 2.25 : 1,
        isActive ? palette.edge : onPath ? palette.candidate : palette.edge,
        isActive ? 0.46 : onPath ? 0.28 : 0.12,
      );
    });

    this.candidateVisuals.forEach((entry) => {
      const active = entry.optionIndex === optionIndex;
      entry.glow.setFillStyle(palette.candidate, active ? 0.2 : 0.12);
      entry.frame.setStrokeStyle(2, active ? palette.edge : palette.candidate, active ? 0.9 : 0.72);
    });

    const points = [
      this.getSquareCenter(this.currentLayout.activeSquare),
      ...Array.from(pathSquares).map((squareIndex) => this.getSquareCenter(squareIndex)),
    ];
    this.hoverBeam?.clear();
    this.hoverBeam?.lineStyle(6, palette.edge, 0.34);
    this.hoverBeam?.beginPath();
    this.hoverBeam?.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      this.hoverBeam?.lineTo(points[index].x, points[index].y);
    }
    this.hoverBeam?.strokePath();
    const target = points[points.length - 1];
    this.hoverBeam?.fillStyle(palette.edge, 0.42);
    this.hoverBeam?.fillCircle(target.x, target.y, Math.max(7, Math.round(this.cellSize * 0.1)));
  }

  private clearHover() {
    this.hoverBeam?.clear();
    this.hoverTargetIndex = null;
    const palette = boardPalette(this.mode);
    this.candidateVisuals.forEach((candidate) => {
      candidate.glow.setFillStyle(palette.candidate, 0.12);
      candidate.frame.setStrokeStyle(2, palette.candidate, 0.72);
    });
    this.highlightBoardFocus();
  }

  private async handleSelection(optionIndex: number) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed" || !this.currentLayout || !this.activePiece) {
      return;
    }

    this.inputLocked = true;
    this.movesLeft = Math.max(0, this.movesLeft - 1);
    this.answers.push(optionIndex);
    const round = this.rounds[this.roundIndex];
    const selected = this.candidateVisuals[optionIndex];
    const palette = boardPalette(this.mode);

    if (optionIndex === round.correctOption) {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.matchedTiles = this.roundIndex + 1;
      this.score += 180 + Math.max(0, this.movesLeft * 7);
      await this.playCorrectMove(selected, palette.correct);

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
    this.score += 35;
    await this.playWrongMove(selected, palette.wrong);

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

  private async playCorrectMove(selected: CandidateVisual, color: number) {
    if (!this.activePiece) {
      return;
    }

    this.clearHover();
    selected.glow.setFillStyle(color, 0.22);
    selected.frame.setStrokeStyle(2, color, 0.92);
    const burst = this.scene.add.image(selected.glow.x, selected.glow.y, "impact_ring");
    burst.setTint(color);
    burst.setDepth(42);
    burst.setAlpha(0.22);
    burst.setScale(0.34);

    await Promise.all([
      this.tweenPromise(this.activePiece.container, {
        x: selected.glow.x,
        y: selected.glow.y,
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
    ]);

    burst.destroy();
  }

  private async playWrongMove(selected: CandidateVisual, color: number) {
    selected.glow.setFillStyle(color, 0.18);
    selected.frame.setStrokeStyle(2, color, 0.88);
    this.scene.cameras.main.shake(100, 0.0017);
    await this.tweenPromise(selected.frame, {
      angle: 5,
      duration: 70,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
    });
    selected.frame.setAngle(0);
    selected.glow.setFillStyle(boardPalette(this.mode).candidate, 0.12);
    selected.frame.setStrokeStyle(2, boardPalette(this.mode).candidate, 0.72);
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
      kind: getQuizKind(this.mode),
      answers: this.answers.slice(),
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

