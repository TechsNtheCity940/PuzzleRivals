export type StrategyPuzzleKind =
  | "chess_tactic"
  | "checkers_tactic"
  | "chess_endgame"
  | "chess_opening"
  | "chess_mate_net";

export type StrategySide = "white" | "black" | "red";

export type StrategyPieceCode =
  | "wK" | "wQ" | "wR" | "wB" | "wN" | "wP"
  | "bK" | "bQ" | "bR" | "bB" | "bN" | "bP"
  | "rM" | "rK" | "bM" | "bK";

export interface StrategyPiece {
  piece: StrategyPieceCode;
  square: number;
}

export interface StrategyMove {
  from: number;
  to: number;
  captures?: number[];
}

export interface StrategyRound {
  id: string;
  kind: StrategyPuzzleKind;
  game: "chess" | "checkers";
  sideToMove: StrategySide;
  prompt: string;
  helperText: string;
  pieces: StrategyPiece[];
  solutions: StrategyMove[];
}

interface StrategyRoundDefinition {
  id: string;
  kind: StrategyPuzzleKind;
  game: "chess" | "checkers";
  sideToMove: StrategySide;
  prompt: string;
  helperText: string;
  pieces: Array<{ piece: StrategyPieceCode; square: string }>;
  solutions: Array<{ from: string; to: string; captures?: string[] }>;
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

  shuffle<T>(items: T[]) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.next() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }
}

const STRATEGY_ROUND_TOTAL = 10;
const BOARD_SIZE = 8;

function algebraicToSquare(square: string) {
  const file = square[0]?.toLowerCase().charCodeAt(0) - 97;
  const rank = Number(square.slice(1));
  const row = 8 - rank;
  return row * BOARD_SIZE + file;
}

function mirrorSquare(square: number) {
  const row = Math.floor(square / BOARD_SIZE);
  const col = square % BOARD_SIZE;
  return row * BOARD_SIZE + (BOARD_SIZE - 1 - col);
}

function normalizeMove(move: StrategyMove): StrategyMove {
  const captures = move.captures?.length ? [...move.captures].sort((left, right) => left - right) : undefined;
  return {
    from: move.from,
    to: move.to,
    captures,
  };
}

function moveKey(move: StrategyMove) {
  return `${move.from}:${move.to}`;
}

function transformDefinition(definition: StrategyRoundDefinition, mirrored: boolean): StrategyRound {
  const transform = mirrored ? mirrorSquare : (value: number) => value;

  return {
    id: mirrored ? `${definition.id}:mirror` : definition.id,
    kind: definition.kind,
    game: definition.game,
    sideToMove: definition.sideToMove,
    prompt: definition.prompt,
    helperText: definition.helperText,
    pieces: definition.pieces.map((entry) => ({
      piece: entry.piece,
      square: transform(algebraicToSquare(entry.square)),
    })),
    solutions: definition.solutions.map((entry) => ({
      from: transform(algebraicToSquare(entry.from)),
      to: transform(algebraicToSquare(entry.to)),
      captures: entry.captures?.map((square) => transform(algebraicToSquare(square))),
    })),
  };
}

function getRoundBank(kind: StrategyPuzzleKind) {
  switch (kind) {
    case "checkers_tactic":
      return CHECKERS_TACTIC_CORES;
    case "chess_endgame":
      return CHESS_ENDGAME_CORES;
    case "chess_opening":
      return CHESS_OPENING_CORES;
    case "chess_mate_net":
      return CHESS_MATE_NET_CORES;
    default:
      return CHESS_TACTIC_CORES;
  }
}

function buildRoundVariants(kind: StrategyPuzzleKind) {
  return getRoundBank(kind).flatMap((definition) => [
    transformDefinition(definition, false),
    transformDefinition(definition, true),
  ]);
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

function getPieceAt(pieces: StrategyPiece[], square: number) {
  return pieces.find((piece) => piece.square === square) ?? null;
}

function isInside(row: number, col: number) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function squareToRowCol(square: number) {
  return {
    row: Math.floor(square / BOARD_SIZE),
    col: square % BOARD_SIZE,
  };
}

function rowColToSquare(row: number, col: number) {
  return row * BOARD_SIZE + col;
}

function collectSlidingMoves(
  pieces: StrategyPiece[],
  piece: StrategyPiece,
  directions: Array<[number, number]>,
) {
  const moves: StrategyMove[] = [];
  const { row, col } = squareToRowCol(piece.square);
  const ownSide = getPieceSide(piece.piece);

  for (const [dr, dc] of directions) {
    let nextRow = row + dr;
    let nextCol = col + dc;
    while (isInside(nextRow, nextCol)) {
      const targetSquare = rowColToSquare(nextRow, nextCol);
      const blocker = getPieceAt(pieces, targetSquare);
      if (!blocker) {
        moves.push({ from: piece.square, to: targetSquare });
      } else {
        if (getPieceSide(blocker.piece) !== ownSide) {
          moves.push({ from: piece.square, to: targetSquare, captures: [targetSquare] });
        }
        break;
      }
      nextRow += dr;
      nextCol += dc;
    }
  }

  return moves;
}

function getChessPseudoMoves(pieces: StrategyPiece[], piece: StrategyPiece): StrategyMove[] {
  const { row, col } = squareToRowCol(piece.square);
  const side = getPieceSide(piece.piece);
  const moves: StrategyMove[] = [];
  const type = piece.piece[1];

  const addStepMove = (nextRow: number, nextCol: number) => {
    if (!isInside(nextRow, nextCol)) {
      return;
    }
    const targetSquare = rowColToSquare(nextRow, nextCol);
    const targetPiece = getPieceAt(pieces, targetSquare);
    if (!targetPiece) {
      moves.push({ from: piece.square, to: targetSquare });
      return;
    }
    if (getPieceSide(targetPiece.piece) !== side) {
      moves.push({ from: piece.square, to: targetSquare, captures: [targetSquare] });
    }
  };

  switch (type) {
    case "N": {
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
        addStepMove(row + dr, col + dc);
      }
      break;
    }
    case "B":
      return collectSlidingMoves(pieces, piece, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
    case "R":
      return collectSlidingMoves(pieces, piece, [[-1, 0], [1, 0], [0, -1], [0, 1]]);
    case "Q":
      return collectSlidingMoves(pieces, piece, [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
    case "K": {
      for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
        addStepMove(row + dr, col + dc);
      }
      break;
    }
    case "P": {
      const direction = side === "white" ? -1 : 1;
      const startRow = side === "white" ? 6 : 1;
      const oneStepRow = row + direction;
      if (isInside(oneStepRow, col) && !getPieceAt(pieces, rowColToSquare(oneStepRow, col))) {
        moves.push({ from: piece.square, to: rowColToSquare(oneStepRow, col) });
        const twoStepRow = row + direction * 2;
        if (row === startRow && isInside(twoStepRow, col) && !getPieceAt(pieces, rowColToSquare(twoStepRow, col))) {
          moves.push({ from: piece.square, to: rowColToSquare(twoStepRow, col) });
        }
      }
      for (const dc of [-1, 1]) {
        const captureRow = row + direction;
        const captureCol = col + dc;
        if (!isInside(captureRow, captureCol)) {
          continue;
        }
        const captureSquare = rowColToSquare(captureRow, captureCol);
        const targetPiece = getPieceAt(pieces, captureSquare);
        if (targetPiece && getPieceSide(targetPiece.piece) !== side) {
          moves.push({ from: piece.square, to: captureSquare, captures: [captureSquare] });
        }
      }
      break;
    }
  }

  return moves;
}

function getAttackSquares(pieces: StrategyPiece[], piece: StrategyPiece) {
  const { row, col } = squareToRowCol(piece.square);
  const type = piece.piece[1];
  const side = getPieceSide(piece.piece);

  if (type === "P") {
    const direction = side === "white" ? -1 : 1;
    return [-1, 1]
      .map((dc) => ({ row: row + direction, col: col + dc }))
      .filter((target) => isInside(target.row, target.col))
      .map((target) => rowColToSquare(target.row, target.col));
  }

  return getChessPseudoMoves(pieces, piece).map((move) => move.to);
}

function applyMove(pieces: StrategyPiece[], move: StrategyMove): StrategyPiece[] {
  const captureSet = new Set([...(move.captures ?? []), move.to]);
  const movingPiece = getPieceAt(pieces, move.from);
  if (!movingPiece) {
    return pieces;
  }

  const nextPieces = pieces
    .filter((piece) => piece.square !== move.from)
    .filter((piece) => !captureSet.has(piece.square))
    .map((piece) => ({ ...piece }));

  nextPieces.push({
    piece: movingPiece.piece,
    square: move.to,
  });

  return nextPieces;
}

function isChessKingInCheck(pieces: StrategyPiece[], side: StrategySide) {
  const kingCode = side === "white" ? "wK" : "bK";
  const kingSquare = pieces.find((piece) => piece.piece === kingCode)?.square;
  if (kingSquare === undefined) {
    return false;
  }

  return pieces
    .filter((piece) => getPieceSide(piece.piece) !== side && piece.piece[1] !== "M")
    .some((piece) => getAttackSquares(pieces, piece).includes(kingSquare));
}

function getChessLegalMoves(pieces: StrategyPiece[], piece: StrategyPiece) {
  const side = getPieceSide(piece.piece);
  return getChessPseudoMoves(pieces, piece).filter((move) => {
    const nextPieces = applyMove(pieces, move);
    return !isChessKingInCheck(nextPieces, side);
  });
}

function getCheckersMovesForPiece(pieces: StrategyPiece[], piece: StrategyPiece) {
  const { row, col } = squareToRowCol(piece.square);
  const side = getPieceSide(piece.piece);
  const isKing = piece.piece.endsWith("K");
  const forwardDirections = side === "red" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  const directions = isKing ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : forwardDirections;
  const stepMoves: StrategyMove[] = [];
  const captureMoves: StrategyMove[] = [];

  for (const [dr, dc] of directions) {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (!isInside(nextRow, nextCol)) {
      continue;
    }

    const nextSquare = rowColToSquare(nextRow, nextCol);
    const nextPiece = getPieceAt(pieces, nextSquare);
    if (!nextPiece) {
      stepMoves.push({ from: piece.square, to: nextSquare });
      continue;
    }

    if (getPieceSide(nextPiece.piece) === side) {
      continue;
    }

    const jumpRow = row + dr * 2;
    const jumpCol = col + dc * 2;
    if (!isInside(jumpRow, jumpCol)) {
      continue;
    }

    const jumpSquare = rowColToSquare(jumpRow, jumpCol);
    if (!getPieceAt(pieces, jumpSquare)) {
      captureMoves.push({
        from: piece.square,
        to: jumpSquare,
        captures: [nextSquare],
      });
    }
  }

  return {
    stepMoves,
    captureMoves,
  };
}

function getCheckersLegalMoves(pieces: StrategyPiece[], piece: StrategyPiece, allPieces: StrategyPiece[]) {
  const hasAnyCapture = allPieces
    .filter((entry) => getPieceSide(entry.piece) === getPieceSide(piece.piece))
    .some((entry) => getCheckersMovesForPiece(allPieces, entry).captureMoves.length > 0);

  const moves = getCheckersMovesForPiece(pieces, piece);
  return hasAnyCapture ? moves.captureMoves : [...moves.captureMoves, ...moves.stepMoves];
}

export function buildStrategyRounds(kind: StrategyPuzzleKind, seed: number, difficulty: number) {
  const rng = new SeededRandom(seed + difficulty * 101);
  return rng.shuffle(buildRoundVariants(kind)).slice(0, STRATEGY_ROUND_TOTAL);
}

export function getStrategyLegalMoves(round: StrategyRound, fromSquare?: number) {
  const movablePieces = round.pieces.filter((piece) => getPieceSide(piece.piece) === round.sideToMove);
  const pieces = fromSquare === undefined ? movablePieces : movablePieces.filter((piece) => piece.square === fromSquare);

  if (round.game === "checkers") {
    return pieces.flatMap((piece) => getCheckersLegalMoves(round.pieces, piece, round.pieces));
  }

  return pieces.flatMap((piece) => getChessLegalMoves(round.pieces, piece));
}

export function isStrategySolutionMove(round: StrategyRound, move: StrategyMove) {
  const nextKey = moveKey(move);
  return round.solutions.some((solution) => moveKey(solution) === nextKey);
}

export function evaluateStrategyMoveSequence(rounds: StrategyRound[], moves: StrategyMove[]) {
  let correct = 0;
  for (let index = 0; index < moves.length && index < rounds.length; index += 1) {
    if (!isStrategySolutionMove(rounds[index], moves[index])) {
      break;
    }
    correct += 1;
  }
  return Math.max(0, Math.min(100, Math.round((correct / Math.max(rounds.length, 1)) * 100)));
}

export function getStrategyMovePath(round: StrategyRound, move: StrategyMove) {
  const movingPiece = getPieceAt(round.pieces, move.from);
  if (!movingPiece) {
    return [move.to];
  }

  const type = movingPiece.piece[1];
  const from = squareToRowCol(move.from);
  const to = squareToRowCol(move.to);

  if (round.game === "checkers") {
    const path = [];
    if (move.captures?.length) {
      path.push(move.captures[0]);
    }
    path.push(move.to);
    return path;
  }

  if (type === "N") {
    const rowStep = Math.abs(to.row - from.row) === 2 ? Math.sign(to.row - from.row) : 0;
    const colStep = Math.abs(to.col - from.col) === 2 ? Math.sign(to.col - from.col) : 0;
    const midpoint = rowStep || colStep
      ? rowColToSquare(from.row + rowStep, from.col + colStep)
      : move.to;
    return midpoint === move.to ? [move.to] : [midpoint, move.to];
  }

  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;
  const rowStep = rowDelta === 0 ? 0 : rowDelta / Math.abs(rowDelta);
  const colStep = colDelta === 0 ? 0 : colDelta / Math.abs(colDelta);
  const path: number[] = [];
  let row = from.row + rowStep;
  let col = from.col + colStep;
  while (row !== to.row || col !== to.col) {
    path.push(rowColToSquare(row, col));
    row += rowStep;
    col += colStep;
  }
  path.push(move.to);
  return path;
}

const CHESS_TACTIC_CORES: StrategyRoundDefinition[] = [
  {
    id: "ct-queen-break",
    kind: "chess_tactic",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Break the king shelter with the direct queen strike.",
    helperText: "The cleanest line tears open the pawn cover immediately.",
    pieces: [
      { piece: "wK", square: "g1" },
      { piece: "wQ", square: "g4" },
      { piece: "wB", square: "d3" },
      { piece: "wR", square: "f1" },
      { piece: "bK", square: "g8" },
      { piece: "bP", square: "g7" },
      { piece: "bP", square: "h7" },
      { piece: "bR", square: "e8" }
    ],
    solutions: [{ from: "g4", to: "g7", captures: ["g7"] }]
  },
  {
    id: "ct-knight-fork",
    kind: "chess_tactic",
    game: "chess",
    sideToMove: "black",
    prompt: "Black to move. Jump into the fork that hits the king and queen together.",
    helperText: "The knight lands where both high-value targets fall under one tempo.",
    pieces: [
      { piece: "bK", square: "g8" },
      { piece: "bN", square: "f4" },
      { piece: "bQ", square: "d8" },
      { piece: "wK", square: "e1" },
      { piece: "wQ", square: "b4" },
      { piece: "wR", square: "d1" },
      { piece: "wP", square: "e2" }
    ],
    solutions: [{ from: "f4", to: "d3" }]
  },
  {
    id: "ct-back-rank",
    kind: "chess_tactic",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Crash onto the back rank before the defender can breathe.",
    helperText: "The open file is already there. Use it now.",
    pieces: [
      { piece: "wK", square: "g1" },
      { piece: "wQ", square: "d2" },
      { piece: "wR", square: "e1" },
      { piece: "bK", square: "g8" },
      { piece: "bR", square: "e8" },
      { piece: "bP", square: "f7" },
      { piece: "bP", square: "g7" },
      { piece: "bP", square: "h7" }
    ],
    solutions: [{ from: "e1", to: "e8", captures: ["e8"] }]
  },
  {
    id: "ct-bishop-break",
    kind: "chess_tactic",
    game: "chess",
    sideToMove: "black",
    prompt: "Black to move. Rip open the king cover with the bishop sacrifice.",
    helperText: "The dark-square diagonal is the whole tactic. Commit to it.",
    pieces: [
      { piece: "bK", square: "g8" },
      { piece: "bQ", square: "h4" },
      { piece: "bB", square: "d6" },
      { piece: "wK", square: "g1" },
      { piece: "wR", square: "f1" },
      { piece: "wP", square: "g2" },
      { piece: "wP", square: "h2" }
    ],
    solutions: [{ from: "d6", to: "h2", captures: ["h2"] }]
  },
  {
    id: "ct-deflection",
    kind: "chess_tactic",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Deflect the queen defender before finishing the attack.",
    helperText: "Remove the key defender with check, not with a slow move.",
    pieces: [
      { piece: "wK", square: "g1" },
      { piece: "wQ", square: "d3" },
      { piece: "wR", square: "e1" },
      { piece: "bK", square: "g8" },
      { piece: "bQ", square: "d7" },
      { piece: "bR", square: "e8" }
    ],
    solutions: [{ from: "d3", to: "d7", captures: ["d7"] }]
  }
];

const CHESS_ENDGAME_CORES: StrategyRoundDefinition[] = [
  {
    id: "ce-opposition",
    kind: "chess_endgame",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Take the key opposition step before pushing the pawn.",
    helperText: "Win the king race first. The pawn can wait one move.",
    pieces: [
      { piece: "wK", square: "e5" },
      { piece: "wP", square: "e4" },
      { piece: "bK", square: "e7" }
    ],
    solutions: [{ from: "e5", to: "d5" }]
  },
  {
    id: "ce-king-front",
    kind: "chess_endgame",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Step the king into the square in front of the passer.",
    helperText: "The king belongs in front of the pawn, not beside it.",
    pieces: [
      { piece: "wK", square: "d4" },
      { piece: "wP", square: "e3" },
      { piece: "bK", square: "g6" }
    ],
    solutions: [{ from: "d4", to: "e4" }]
  },
  {
    id: "ce-rook-behind",
    kind: "chess_endgame",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Put the rook behind the passed pawn before the race begins.",
    helperText: "Rook activity matters more than one immediate pawn push here.",
    pieces: [
      { piece: "wK", square: "g2" },
      { piece: "wR", square: "a1" },
      { piece: "wP", square: "d5" },
      { piece: "bK", square: "g7" }
    ],
    solutions: [{ from: "a1", to: "d1" }]
  },
  {
    id: "ce-cutoff",
    kind: "chess_endgame",
    game: "chess",
    sideToMove: "black",
    prompt: "Black to move. Activate the rook and cut the king away from the passer.",
    helperText: "The rook move matters because it fences the king first.",
    pieces: [
      { piece: "bK", square: "g7" },
      { piece: "bR", square: "a7" },
      { piece: "wK", square: "e4" },
      { piece: "wP", square: "e5" }
    ],
    solutions: [{ from: "a7", to: "e7" }]
  },
  {
    id: "ce-shoulder",
    kind: "chess_endgame",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Shoulder the king away from the queening route.",
    helperText: "This is a body-blocking move, not a pawn move.",
    pieces: [
      { piece: "wK", square: "e5" },
      { piece: "wP", square: "d5" },
      { piece: "bK", square: "a7" }
    ],
    solutions: [{ from: "e5", to: "d6" }]
  }
];

const CHESS_OPENING_CORES: StrategyRoundDefinition[] = [
  {
    id: "co-ruy-pin",
    kind: "chess_opening",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Develop with tempo and apply the pin immediately.",
    helperText: "Choose the bishop move that increases pressure without wasting time.",
    pieces: [
      { piece: "wK", square: "e1" },
      { piece: "wQ", square: "d1" },
      { piece: "wB", square: "f1" },
      { piece: "wN", square: "g1" },
      { piece: "wP", square: "d4" },
      { piece: "wP", square: "e4" },
      { piece: "bK", square: "e8" },
      { piece: "bN", square: "c6" },
      { piece: "bP", square: "e5" }
    ],
    solutions: [{ from: "f1", to: "b5" }]
  },
  {
    id: "co-knight-center",
    kind: "chess_opening",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Improve development with the clean central knight move.",
    helperText: "Ignore side-pawn noise. Bring the knight into the fight.",
    pieces: [
      { piece: "wK", square: "e1" },
      { piece: "wQ", square: "d1" },
      { piece: "wN", square: "g1" },
      { piece: "wB", square: "c4" },
      { piece: "wP", square: "e4" },
      { piece: "bK", square: "e8" },
      { piece: "bN", square: "c6" },
      { piece: "bP", square: "e5" }
    ],
    solutions: [{ from: "g1", to: "f3" }]
  },
  {
    id: "co-black-c-break",
    kind: "chess_opening",
    game: "chess",
    sideToMove: "black",
    prompt: "Black to move. Strike the center with the thematic pawn break.",
    helperText: "The central tension is ready. Challenge it now.",
    pieces: [
      { piece: "bK", square: "e8" },
      { piece: "bQ", square: "d8" },
      { piece: "bP", square: "c7" },
      { piece: "bP", square: "e5" },
      { piece: "wK", square: "e1" },
      { piece: "wN", square: "f3" },
      { piece: "wP", square: "d4" },
      { piece: "wP", square: "e4" }
    ],
    solutions: [{ from: "c7", to: "c5" }]
  },
  {
    id: "co-white-d-break",
    kind: "chess_opening",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Reinforce the center with the principled pawn break.",
    helperText: "This is the move that claims space and opens your dark bishop.",
    pieces: [
      { piece: "wK", square: "e1" },
      { piece: "wQ", square: "d1" },
      { piece: "wN", square: "c3" },
      { piece: "wB", square: "f1" },
      { piece: "wP", square: "d2" },
      { piece: "wP", square: "e3" },
      { piece: "bK", square: "e8" },
      { piece: "bN", square: "f6" },
      { piece: "bP", square: "d6" },
      { piece: "bP", square: "e6" }
    ],
    solutions: [{ from: "d2", to: "d4" }]
  },
  {
    id: "co-black-pin",
    kind: "chess_opening",
    game: "chess",
    sideToMove: "black",
    prompt: "Black to move. Use the bishop to pin the knight and increase central pressure.",
    helperText: "One developing move should add pressure immediately.",
    pieces: [
      { piece: "bK", square: "e8" },
      { piece: "bQ", square: "d8" },
      { piece: "bB", square: "f8" },
      { piece: "bN", square: "c6" },
      { piece: "bP", square: "e6" },
      { piece: "wK", square: "e1" },
      { piece: "wN", square: "c3" },
      { piece: "wP", square: "d4" },
      { piece: "wP", square: "e4" }
    ],
    solutions: [{ from: "f8", to: "b4" }]
  }
];

const CHESS_MATE_NET_CORES: StrategyRoundDefinition[] = [
  {
    id: "cm-queen-crash",
    kind: "chess_mate_net",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Seal the king box with the forcing queen move.",
    helperText: "The queen move should remove luft and keep checks coming.",
    pieces: [
      { piece: "wK", square: "g1" },
      { piece: "wQ", square: "h5" },
      { piece: "wR", square: "f1" },
      { piece: "bK", square: "g8" },
      { piece: "bP", square: "g7" },
      { piece: "bP", square: "h7" }
    ],
    solutions: [{ from: "h5", to: "h7", captures: ["h7"] }]
  },
  {
    id: "cm-rook-invasion",
    kind: "chess_mate_net",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Crash onto the eighth rank and keep the mating net forced.",
    helperText: "The decisive move is the heavy-piece entry, not a quiet improvement.",
    pieces: [
      { piece: "wK", square: "g1" },
      { piece: "wQ", square: "d1" },
      { piece: "wR", square: "e1" },
      { piece: "bK", square: "g8" },
      { piece: "bR", square: "e8" },
      { piece: "bP", square: "g7" },
      { piece: "bP", square: "h7" }
    ],
    solutions: [{ from: "e1", to: "e8", captures: ["e8"] }]
  },
  {
    id: "cm-black-queen-hit",
    kind: "chess_mate_net",
    game: "chess",
    sideToMove: "black",
    prompt: "Black to move. Drive the queen into the king shelter and keep the attack forcing.",
    helperText: "The queen lands in the cover squares, not beside them.",
    pieces: [
      { piece: "bK", square: "g8" },
      { piece: "bQ", square: "d6" },
      { piece: "bB", square: "c7" },
      { piece: "wK", square: "g1" },
      { piece: "wR", square: "f1" },
      { piece: "wP", square: "g2" },
      { piece: "wP", square: "h2" }
    ],
    solutions: [{ from: "d6", to: "h2", captures: ["h2"] }]
  },
  {
    id: "cm-bishop-seal",
    kind: "chess_mate_net",
    game: "chess",
    sideToMove: "white",
    prompt: "White to move. Use the bishop to close the final escape square.",
    helperText: "The bishop move matters because it seals the route the king still has.",
    pieces: [
      { piece: "wK", square: "g1" },
      { piece: "wQ", square: "g4" },
      { piece: "wB", square: "d3" },
      { piece: "bK", square: "h8" },
      { piece: "bP", square: "g7" },
      { piece: "bP", square: "h7" }
    ],
    solutions: [{ from: "d3", to: "h7", captures: ["h7"] }]
  },
  {
    id: "cm-rook-lift",
    kind: "chess_mate_net",
    game: "chess",
    sideToMove: "black",
    prompt: "Black to move. Land the rook on the entry square and keep every check forcing.",
    helperText: "The line only works if the rook arrives with tempo right now.",
    pieces: [
      { piece: "bK", square: "g8" },
      { piece: "bQ", square: "h4" },
      { piece: "bR", square: "e8" },
      { piece: "wK", square: "g1" },
      { piece: "wR", square: "f1" },
      { piece: "wP", square: "g2" },
      { piece: "wP", square: "h2" }
    ],
    solutions: [{ from: "e8", to: "e1" }]
  }
];

const CHECKERS_TACTIC_CORES: StrategyRoundDefinition[] = [
  {
    id: "ck-double-jump",
    kind: "checkers_tactic",
    game: "checkers",
    sideToMove: "red",
    prompt: "Red to move. Start the forcing jump lane before the edge collapses.",
    helperText: "The first jump matters. Once it lands, the rest of the lane opens.",
    pieces: [
      { piece: "rM", square: "c3" },
      { piece: "bM", square: "d4" },
      { piece: "bM", square: "f6" },
      { piece: "rM", square: "a3" }
    ],
    solutions: [{ from: "c3", to: "e5", captures: ["d4"] }]
  },
  {
    id: "ck-edge-capture",
    kind: "checkers_tactic",
    game: "checkers",
    sideToMove: "black",
    prompt: "Black to move. Cash the edge capture before the red piece escapes.",
    helperText: "This is the tempo move that keeps the outside lane under control.",
    pieces: [
      { piece: "bM", square: "f6" },
      { piece: "rM", square: "e5" },
      { piece: "rM", square: "c3" }
    ],
    solutions: [{ from: "f6", to: "d4", captures: ["e5"] }]
  },
  {
    id: "ck-king-trap",
    kind: "checkers_tactic",
    game: "checkers",
    sideToMove: "red",
    prompt: "Red to move. Use the king to spring the trap and keep the diagonal shut.",
    helperText: "The king move is a capture. Take it before the line opens the other way.",
    pieces: [
      { piece: "rK", square: "c3" },
      { piece: "bM", square: "d4" },
      { piece: "bM", square: "f4" },
      { piece: "rM", square: "g1" }
    ],
    solutions: [{ from: "c3", to: "e5", captures: ["d4"] }]
  },
  {
    id: "ck-promotion-race",
    kind: "checkers_tactic",
    game: "checkers",
    sideToMove: "black",
    prompt: "Black to move. Use the capture that keeps the promotion race in your favor.",
    helperText: "The best move jumps forward with tempo instead of drifting sideways.",
    pieces: [
      { piece: "bM", square: "c7" },
      { piece: "rM", square: "b6" },
      { piece: "rM", square: "e3" }
    ],
    solutions: [{ from: "c7", to: "a5", captures: ["b6"] }]
  },
  {
    id: "ck-back-row",
    kind: "checkers_tactic",
    game: "checkers",
    sideToMove: "red",
    prompt: "Red to move. Take the capture that keeps the home lane intact.",
    helperText: "There is only one jump that preserves the defensive shape afterward.",
    pieces: [
      { piece: "rM", square: "f2" },
      { piece: "bM", square: "g3" },
      { piece: "rM", square: "d2" }
    ],
    solutions: [{ from: "f2", to: "h4", captures: ["g3"] }]
  }
];
