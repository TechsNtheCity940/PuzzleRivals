import Phaser from "phaser";
import Tile from "./Tile";
import {
  buildNeonRivalsObjective,
  getObjectiveProgressPercent,
  getObjectiveValue,
} from "@/game/config/runModes";
import type {
  NeonRivalsGameBridge,
  NeonRivalsGameState,
  NeonRivalsGameStatus,
  NeonRivalsRunMode,
} from "@/game/types";
import {
  BOARD_ORIGIN_X,
  BOARD_ORIGIN_Y,
  GRID_COLS,
  GRID_ROWS,
  TILE_SIZE,
  TILE_TYPES,
  type TileTextureKey,
} from "@/game/utils/constants";

interface BoardCell {
  type: TileTextureKey | null;
  tileObject: Tile | null;
}

interface MatchPosition {
  row: number;
  col: number;
}

interface PuzzleBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
}

function emptyColorProgress() {
  return TILE_TYPES.reduce((accumulator, tileType) => {
    accumulator[tileType] = 0;
    return accumulator;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

export default class PuzzleBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private rows = GRID_ROWS;
  private cols = GRID_COLS;
  private tileSize = TILE_SIZE;
  private originX = BOARD_ORIGIN_X;
  private originY = BOARD_ORIGIN_Y;
  private grid: BoardCell[][] = [];
  private selectedTile: Tile | null = null;
  private inputLocked = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 18;
  private targetScore = 2400;
  private status: NeonRivalsGameStatus = "booting";
  private randomState: number;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private objective = buildNeonRivalsObjective("score_attack", 1);
  private clearedByColor: Partial<Record<TileTextureKey, number>> = emptyColorProgress();
  private runStartedAtMs = 0;

  constructor(scene: Phaser.Scene, options: PuzzleBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.randomState = this.sessionSeed;
    this.mode = options.mode;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
  }

  create() {
    this.movesLeft = this.objective.startingMoves;
    this.targetScore = this.objective.targetScore;
    this.clearedByColor = emptyColorProgress();
    this.runStartedAtMs = this.scene.time.now;
    this.generateInitialGrid();
    this.renderGrid();
    this.scene.events.on("tile-clicked", this.handleTileClicked, this);
    this.status = "running";
    this.emitState();
  }

  destroy() {
    this.scene.events.off("tile-clicked", this.handleTileClicked, this);
    this.grid.flat().forEach((cell) => cell.tileObject?.destroy());
  }

  private nextRandom() {
    this.randomState += 0x6d2b79f5;
    let value = this.randomState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  private pickRandomType(excluded: TileTextureKey[] = []) {
    const pool = TILE_TYPES.filter((type) => !excluded.includes(type));
    const source = pool.length > 0 ? pool : TILE_TYPES;
    return source[Math.floor(this.nextRandom() * source.length)] as TileTextureKey;
  }

  private generateInitialGrid() {
    this.grid = [];

    for (let row = 0; row < this.rows; row += 1) {
      this.grid[row] = [];

      for (let col = 0; col < this.cols; col += 1) {
        const excluded: TileTextureKey[] = [];
        const leftA = col > 0 ? this.grid[row][col - 1]?.type : null;
        const leftB = col > 1 ? this.grid[row][col - 2]?.type : null;
        const upA = row > 0 ? this.grid[row - 1][col]?.type : null;
        const upB = row > 1 ? this.grid[row - 2][col]?.type : null;

        if (leftA && leftA === leftB) {
          excluded.push(leftA);
        }
        if (upA && upA === upB) {
          excluded.push(upA);
        }

        this.grid[row][col] = {
          type: this.pickRandomType(excluded),
          tileObject: null,
        };
      }
    }
  }

  private renderGrid() {
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const cell = this.grid[row][col];
        if (!cell.type) continue;

        const tile = new Tile(
          this.scene,
          this.getTileWorldX(col),
          this.getTileWorldY(row),
          cell.type,
          row,
          col,
          this.tileSize,
        );

        cell.tileObject = tile;
      }
    }
  }

  private handleTileClicked(tile: Tile) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") {
      return;
    }

    if (!this.selectedTile) {
      this.selectedTile = tile;
      tile.setSelected(true);
      return;
    }

    if (this.selectedTile === tile) {
      tile.setSelected(false);
      this.selectedTile = null;
      return;
    }

    if (this.areAdjacent(this.selectedTile, tile)) {
      const first = this.selectedTile;
      first.setSelected(false);
      this.selectedTile = null;
      void this.trySwap(first, tile);
      return;
    }

    this.selectedTile.setSelected(false);
    this.selectedTile = tile;
    tile.setSelected(true);
  }

  private areAdjacent(tileA: Tile, tileB: Tile) {
    const rowDiff = Math.abs(tileA.row - tileB.row);
    const colDiff = Math.abs(tileA.col - tileB.col);
    return rowDiff + colDiff === 1;
  }

  private async trySwap(tileA: Tile, tileB: Tile) {
    this.inputLocked = true;
    this.movesLeft = Math.max(0, this.movesLeft - 1);
    this.emitState();

    await tileA.swapVisualWith(tileB, 160);
    this.swapGridCells(tileA, tileB);
    this.swapTileMetadata(tileA, tileB);

    let matches = this.collectMatches();

    if (matches.length === 0) {
      await tileA.swapVisualWith(tileB, 160);
      this.swapGridCells(tileA, tileB);
      this.swapTileMetadata(tileA, tileB);
      this.combo = 0;
      this.finalizeTurn();
      return;
    }

    this.combo = 0;
    while (matches.length > 0) {
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const cleared = await this.clearMatches(matches);
      const scoreDelta = cleared * 120 * this.combo;
      this.score += scoreDelta;
      this.matchedTiles += cleared;
      this.scene.events.emit("board-combo", {
        combo: this.combo,
        score: this.score,
        cleared,
      });
      this.emitState();

      await this.collapseColumns();
      await this.refillColumns();
      matches = this.collectMatches();
    }

    this.finalizeTurn();
  }

  private isObjectiveComplete() {
    const objectiveValue = getObjectiveValue(this.objective, {
      score: this.score,
      maxCombo: this.maxCombo,
      matchedTiles: this.matchedTiles,
      clearedByColor: this.clearedByColor,
    });

    return objectiveValue >= this.objective.targetValue;
  }

  private finalizeTurn() {
    if (this.isObjectiveComplete()) {
      this.status = "complete";
      this.inputLocked = true;
      this.emitState();
      this.bridge?.onComplete?.(this.snapshotState());
      return;
    }

    if (this.movesLeft <= 0) {
      this.status = "failed";
      this.inputLocked = true;
      this.combo = 0;
      this.emitState();
      this.bridge?.onFailed?.(this.snapshotState());
      return;
    }

    this.status = "running";
    this.inputLocked = false;
    this.emitState();
  }

  private swapGridCells(tileA: Tile, tileB: Tile) {
    const aRow = tileA.row;
    const aCol = tileA.col;
    const bRow = tileB.row;
    const bCol = tileB.col;
    const temp = this.grid[aRow][aCol];
    this.grid[aRow][aCol] = this.grid[bRow][bCol];
    this.grid[bRow][bCol] = temp;
  }

  private swapTileMetadata(tileA: Tile, tileB: Tile) {
    const oldARow = tileA.row;
    const oldACol = tileA.col;
    const oldBRow = tileB.row;
    const oldBCol = tileB.col;
    tileA.updateGridPosition(oldBRow, oldBCol);
    tileB.updateGridPosition(oldARow, oldACol);
  }

  private collectMatches() {
    const matches = new Map<string, MatchPosition>();

    for (let row = 0; row < this.rows; row += 1) {
      let col = 0;
      while (col < this.cols) {
        const cellType = this.grid[row][col].type;
        if (!cellType) {
          col += 1;
          continue;
        }

        let end = col + 1;
        while (end < this.cols && this.grid[row][end].type === cellType) {
          end += 1;
        }

        if (end - col >= 3) {
          for (let index = col; index < end; index += 1) {
            matches.set(`${row}-${index}`, { row, col: index });
          }
        }

        col = end;
      }
    }

    for (let col = 0; col < this.cols; col += 1) {
      let row = 0;
      while (row < this.rows) {
        const cellType = this.grid[row][col].type;
        if (!cellType) {
          row += 1;
          continue;
        }

        let end = row + 1;
        while (end < this.rows && this.grid[end][col].type === cellType) {
          end += 1;
        }

        if (end - row >= 3) {
          for (let index = row; index < end; index += 1) {
            matches.set(`${index}-${col}`, { row: index, col });
          }
        }

        row = end;
      }
    }

    return Array.from(matches.values());
  }

  private async clearMatches(matches: MatchPosition[]) {
    const clearedTypes = matches
      .map(({ row, col }) => this.grid[row][col].type)
      .filter((type): type is TileTextureKey => Boolean(type));

    await Promise.all(matches.map(async ({ row, col }) => {
      const tile = this.grid[row][col].tileObject;
      if (!tile) return;
      await tile.playMatchEffect();
      tile.destroy();
    }));

    matches.forEach(({ row, col }) => {
      this.grid[row][col] = {
        type: null,
        tileObject: null,
      };
    });

    for (const type of clearedTypes) {
      this.clearedByColor[type] = Number(this.clearedByColor[type] ?? 0) + 1;
    }

    return matches.length;
  }

  private async collapseColumns() {
    const moves: Array<Promise<void>> = [];

    for (let col = 0; col < this.cols; col += 1) {
      let targetRow = this.rows - 1;

      for (let row = this.rows - 1; row >= 0; row -= 1) {
        const cell = this.grid[row][col];
        if (!cell.tileObject || !cell.type) {
          continue;
        }

        if (row !== targetRow) {
          this.grid[targetRow][col] = cell;
          this.grid[row][col] = { type: null, tileObject: null };
          cell.tileObject.updateGridPosition(targetRow, col);
          moves.push(cell.tileObject.moveTo(this.getTileWorldX(col), this.getTileWorldY(targetRow), 180));
        }

        targetRow -= 1;
      }

      for (let row = targetRow; row >= 0; row -= 1) {
        this.grid[row][col] = { type: null, tileObject: null };
      }
    }

    if (moves.length > 0) {
      await Promise.all(moves);
    }
  }

  private async refillColumns() {
    const spawns: Array<Promise<void>> = [];

    for (let col = 0; col < this.cols; col += 1) {
      let spawnOffset = 0;

      for (let row = this.rows - 1; row >= 0; row -= 1) {
        if (this.grid[row][col].tileObject) {
          continue;
        }

        spawnOffset += 1;
        const type = this.pickRandomType();
        const spawnY = this.getTileWorldY(row - spawnOffset - 1);
        const targetY = this.getTileWorldY(row);
        const tile = new Tile(this.scene, this.getTileWorldX(col), spawnY, type, row, col, this.tileSize);
        this.grid[row][col] = { type, tileObject: tile };
        spawns.push(tile.spawnIn(targetY, 220 + spawnOffset * 18));
      }
    }

    if (spawns.length > 0) {
      await Promise.all(spawns);
    }
  }

  private snapshotState(): NeonRivalsGameState {
    const objectiveValue = getObjectiveValue(this.objective, {
      score: this.score,
      maxCombo: this.maxCombo,
      matchedTiles: this.matchedTiles,
      clearedByColor: this.clearedByColor,
    });

    return {
      status: this.status,
      mode: this.mode,
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      movesLeft: this.movesLeft,
      targetScore: this.targetScore,
      matchedTiles: this.matchedTiles,
      objectiveTitle: this.objective.title,
      objectiveLabel: this.objective.label,
      objectiveDescription: this.objective.description,
      objectiveValue,
      objectiveTarget: this.objective.targetValue,
      objectiveProgressPercent: getObjectiveProgressPercent(objectiveValue, this.objective.targetValue),
      targetColor: this.objective.targetColor,
      targetColorLabel: this.objective.targetColorLabel,
      clearedByColor: { ...this.clearedByColor },
      durationMs: Math.max(0, Math.round(this.scene.time.now - this.runStartedAtMs)),
      seed: this.sessionSeed,
    };
  }

  private emitState() {
    const snapshot = this.snapshotState();
    this.scene.events.emit("board-state", snapshot);
    this.bridge?.onStateChange?.(snapshot);
  }

  private getTileWorldX(col: number) {
    return this.originX + col * this.tileSize + this.tileSize / 2;
  }

  private getTileWorldY(row: number) {
    return this.originY + row * this.tileSize + this.tileSize / 2;
  }
}
