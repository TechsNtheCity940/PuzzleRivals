import React, { useState, useCallback, useMemo } from 'react';

interface Props {
  onSolve: () => void;
  isPractice: boolean;
  disabled: boolean;
}

interface GridData {
  grid: (number | null)[];
  solution: number[];
  rowSums: number[];
  colSums: number[];
  size: number;
}

function generateGrid(): GridData {
  const size = 3;
  // Create a solved grid with numbers 1-9
  const solution: number[] = [];
  const used = new Set<number>();

  // Generate valid grid where row/col sums are reasonable
  for (let i = 0; i < size * size; i++) {
    let n: number;
    do { n = Math.floor(Math.random() * 9) + 1; } while (used.has(n));
    used.add(n);
    solution.push(n);
  }

  const rowSums = Array.from({ length: size }, (_, r) =>
    solution.slice(r * size, (r + 1) * size).reduce((a, b) => a + b, 0)
  );
  const colSums = Array.from({ length: size }, (_, c) =>
    Array.from({ length: size }, (_, r) => solution[r * size + c]).reduce((a, b) => a + b, 0)
  );

  // Remove 4-5 cells
  const removeCount = 4 + Math.floor(Math.random() * 2);
  const indices = Array.from({ length: size * size }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const removedIndices = new Set(indices.slice(0, removeCount));

  const grid: (number | null)[] = solution.map((v, i) => removedIndices.has(i) ? null : v);

  return { grid, solution, rowSums, colSums, size };
}

export default function NumberGrid({ onSolve, isPractice, disabled }: Props) {
  const [data] = useState(() => generateGrid());
  const [values, setValues] = useState<(number | null)[]>(data.grid);
  const [solved, setSolved] = useState(false);

  const handleChange = useCallback((index: number, val: string) => {
    if (disabled || solved) return;
    const num = val === '' ? null : Math.min(9, Math.max(1, parseInt(val) || 0));
    setValues(prev => {
      const next = [...prev];
      next[index] = num;

      // Check if solved
      const filled = next.every(v => v !== null);
      if (filled) {
        const correct = next.every((v, i) => v === data.solution[i]);
        if (correct) {
          setSolved(true);
          setTimeout(onSolve, 300);
        }
      }
      return next;
    });
  }, [disabled, solved, data.solution, onSolve]);

  return (
    <div className="flex flex-col items-center gap-3">
      {isPractice && (
        <div className="text-sm text-muted-foreground text-center px-4 font-hud">
          Fill empty cells (1-9). Match the row & column sums!
        </div>
      )}
      <div className="bg-card rounded-xl p-3">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${data.size + 1}, 1fr)` }}>
          {Array.from({ length: data.size }, (_, r) => (
            <React.Fragment key={r}>
              {Array.from({ length: data.size }, (_, c) => {
                const idx = r * data.size + c;
                const isGiven = data.grid[idx] !== null;
                return (
                  <div key={`${r}-${c}`} className="w-16 h-16 flex items-center justify-center">
                    {isGiven ? (
                      <div className="w-full h-full flex items-center justify-center rounded-lg bg-secondary text-foreground font-bold text-xl">
                        {values[idx]}
                      </div>
                    ) : (
                      <input
                        type="number"
                        min={1} max={9}
                        value={values[idx] ?? ''}
                        onChange={e => handleChange(idx, e.target.value)}
                        className="w-full h-full text-center rounded-lg bg-muted text-foreground font-bold text-xl border-2 border-primary/30 focus:border-primary outline-none"
                        disabled={disabled || solved}
                      />
                    )}
                  </div>
                );
              })}
              <div className="w-16 h-16 flex items-center justify-center text-primary font-hud font-bold text-sm">
                ={data.rowSums[r]}
              </div>
            </React.Fragment>
          ))}
          {Array.from({ length: data.size }, (_, c) => (
            <div key={`sum-${c}`} className="w-16 h-16 flex items-center justify-center text-primary font-hud font-bold text-sm">
              ={data.colSums[c]}
            </div>
          ))}
          <div />
        </div>
      </div>
      {solved && <div className="text-primary font-bold text-lg animate-scale-in">✓ Correct!</div>}
    </div>
  );
}
