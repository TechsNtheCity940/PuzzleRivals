import React, { useState, useCallback } from 'react';

interface Props {
  onSolve: () => void;
  isPractice: boolean;
  disabled: boolean;
}

function generatePuzzle(size: number = 3): number[] {
  // Start with solved state [1,2,3,4,5,6,7,8,0] and scramble
  const tiles = Array.from({ length: size * size - 1 }, (_, i) => i + 1);
  tiles.push(0); // empty

  // Scramble by making random valid moves
  let emptyIdx = tiles.length - 1;
  const moves = size === 3 ? 40 : 80;

  for (let m = 0; m < moves; m++) {
    const row = Math.floor(emptyIdx / size);
    const col = emptyIdx % size;
    const neighbors: number[] = [];
    if (row > 0) neighbors.push(emptyIdx - size);
    if (row < size - 1) neighbors.push(emptyIdx + size);
    if (col > 0) neighbors.push(emptyIdx - 1);
    if (col < size - 1) neighbors.push(emptyIdx + 1);
    const swap = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[emptyIdx], tiles[swap]] = [tiles[swap], tiles[emptyIdx]];
    emptyIdx = swap;
  }

  return tiles;
}

function isSolved(tiles: number[]): boolean {
  for (let i = 0; i < tiles.length - 1; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[tiles.length - 1] === 0;
}

export default function TileSliding({ onSolve, isPractice, disabled }: Props) {
  const size = 3;
  const [tiles, setTiles] = useState(() => generatePuzzle(size));
  const [solved, setSolved] = useState(false);
  const [moves, setMoves] = useState(0);

  const handleTap = useCallback((index: number) => {
    if (disabled || solved || tiles[index] === 0) return;

    const emptyIdx = tiles.indexOf(0);
    const row = Math.floor(index / size);
    const col = index % size;
    const emptyRow = Math.floor(emptyIdx / size);
    const emptyCol = emptyIdx % size;

    // Check adjacency
    const isAdj = (Math.abs(row - emptyRow) + Math.abs(col - emptyCol)) === 1;
    if (!isAdj) return;

    setTiles(prev => {
      const next = [...prev];
      [next[index], next[emptyIdx]] = [next[emptyIdx], next[index]];
      if (isSolved(next)) {
        setSolved(true);
        setTimeout(onSolve, 400);
      }
      return next;
    });
    setMoves(m => m + 1);
  }, [disabled, solved, tiles, size, onSolve]);

  const tileSize = Math.floor((Math.min(300, window.innerWidth - 64)) / size);

  return (
    <div className="flex flex-col items-center gap-3">
      {isPractice && (
        <div className="text-sm text-muted-foreground text-center px-4 font-hud">
          Tap tiles next to the empty space to slide them. Arrange 1-8 in order!
        </div>
      )}
      <div className="font-hud text-sm text-muted-foreground">Moves: {moves}</div>
      <div
        className="grid gap-1 p-2 rounded-xl bg-card"
        style={{ gridTemplateColumns: `repeat(${size}, ${tileSize}px)` }}
      >
        {tiles.map((tile, i) => (
          <button
            key={i}
            onClick={() => handleTap(i)}
            disabled={disabled || solved || tile === 0}
            className={`flex items-center justify-center rounded-lg font-bold text-xl transition-all duration-150 active:scale-95 ${
              tile === 0
                ? 'bg-transparent'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
            style={{ width: tileSize, height: tileSize }}
          >
            {tile !== 0 ? tile : ''}
          </button>
        ))}
      </div>
      {solved && <div className="text-primary font-bold text-lg animate-scale-in">✓ Solved in {moves} moves!</div>}
    </div>
  );
}
