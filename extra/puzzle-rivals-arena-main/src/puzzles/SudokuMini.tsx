import React, { useState, useCallback } from 'react';

interface Props {
  onSolve: () => void;
  isPractice: boolean;
  disabled: boolean;
}

interface SudokuData {
  puzzle: (number | null)[];
  solution: number[];
}

function generateSudoku(): SudokuData {
  // Generate a valid 4x4 Sudoku
  const solution = new Array(16).fill(0);

  function isValid(grid: number[], pos: number, num: number): boolean {
    const row = Math.floor(pos / 4);
    const col = pos % 4;
    // Check row
    for (let c = 0; c < 4; c++) if (grid[row * 4 + c] === num) return false;
    // Check col
    for (let r = 0; r < 4; r++) if (grid[r * 4 + col] === num) return false;
    // Check 2x2 box
    const boxR = Math.floor(row / 2) * 2;
    const boxC = Math.floor(col / 2) * 2;
    for (let r = boxR; r < boxR + 2; r++)
      for (let c = boxC; c < boxC + 2; c++)
        if (grid[r * 4 + c] === num) return false;
    return true;
  }

  function solve(grid: number[], pos: number): boolean {
    if (pos === 16) return true;
    const nums = [1, 2, 3, 4];
    // Shuffle for randomness
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    for (const n of nums) {
      if (isValid(grid, pos, n)) {
        grid[pos] = n;
        if (solve(grid, pos + 1)) return true;
        grid[pos] = 0;
      }
    }
    return false;
  }

  solve(solution, 0);

  // Remove cells (keep 6-8 given)
  const given = 7;
  const indices = Array.from({ length: 16 }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const removeSet = new Set(indices.slice(0, 16 - given));
  const puzzle = solution.map((v, i) => removeSet.has(i) ? null : v);

  return { puzzle, solution };
}

export default function SudokuMini({ onSolve, isPractice, disabled }: Props) {
  const [data] = useState(() => generateSudoku());
  const [values, setValues] = useState<(number | null)[]>(data.puzzle);
  const [solved, setSolved] = useState(false);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const isGiven = useCallback((i: number) => data.puzzle[i] !== null, [data.puzzle]);

  const handleCellTap = useCallback((i: number) => {
    if (disabled || solved || isGiven(i)) return;
    setSelectedCell(i);
  }, [disabled, solved, isGiven]);

  const handleNumberTap = useCallback((num: number) => {
    if (selectedCell === null || disabled || solved) return;
    setValues(prev => {
      const next = [...prev];
      next[selectedCell] = num === 0 ? null : num;

      // Check if solved
      const filled = next.every(v => v !== null);
      if (filled && next.every((v, i) => v === data.solution[i])) {
        setSolved(true);
        setTimeout(onSolve, 400);
      }
      return next;
    });
  }, [selectedCell, disabled, solved, data.solution, onSolve]);

  return (
    <div className="flex flex-col items-center gap-4">
      {isPractice && (
        <div className="text-sm text-muted-foreground text-center px-4 font-hud">
          Fill 1-4 in each row, column, and 2×2 box. No repeats!
        </div>
      )}
      <div className="grid grid-cols-4 gap-0.5 p-2 rounded-xl bg-card">
        {values.map((val, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const borderR = col === 1 ? 'border-r-2 border-r-primary/30' : '';
          const borderB = row === 1 ? 'border-b-2 border-b-primary/30' : '';
          return (
            <button
              key={i}
              onClick={() => handleCellTap(i)}
              disabled={disabled || solved || isGiven(i)}
              className={`w-16 h-16 flex items-center justify-center text-xl font-bold rounded-md transition-all ${borderR} ${borderB} ${
                isGiven(i)
                  ? 'bg-secondary text-foreground'
                  : selectedCell === i
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : val !== null
                      ? 'bg-muted text-foreground'
                      : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              {val || ''}
            </button>
          );
        })}
      </div>

      {/* Number pad */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map(n => (
          <button
            key={n}
            onClick={() => handleNumberTap(n)}
            disabled={disabled || solved || selectedCell === null}
            className="w-14 h-14 flex items-center justify-center rounded-xl bg-card text-foreground font-bold text-xl border-2 border-border hover:border-primary active:scale-90 transition-all"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => handleNumberTap(0)}
          disabled={disabled || solved || selectedCell === null}
          className="w-14 h-14 flex items-center justify-center rounded-xl bg-card text-muted-foreground font-bold text-sm border-2 border-border hover:border-destructive active:scale-90 transition-all"
        >
          ✕
        </button>
      </div>

      {solved && <div className="text-primary font-bold text-lg animate-scale-in">✓ Solved!</div>}
    </div>
  );
}
