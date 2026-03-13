import React, { useState, useCallback, useMemo } from 'react';

interface PipeCell {
  type: 'end' | 'straight' | 'corner' | 'tee' | 'cross';
  rotation: number; // 0-3
  solveRotation: number;
  isSource: boolean;
  isTarget: boolean;
  onPath: boolean;
}

interface Props {
  onSolve: () => void;
  isPractice: boolean;
  disabled: boolean;
}

const DIRS = [
  [0, -1], // 0: top
  [1, 0],  // 1: right
  [0, 1],  // 2: bottom
  [-1, 0], // 3: left
];

function getConnections(type: string, rotation: number): number[] {
  const r = rotation % 4;
  switch (type) {
    case 'end': return [r];
    case 'straight': return [r % 2, (r % 2) + 2];
    case 'corner': return [r, (r + 1) % 4];
    case 'tee': return [r, (r + 1) % 4, (r + 2) % 4];
    case 'cross': return [0, 1, 2, 3];
    default: return [];
  }
}

function opposite(dir: number): number { return (dir + 2) % 4; }

function generatePuzzle(): PipeCell[][] {
  const size = 4;
  const grid: PipeCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      type: 'straight' as const, rotation: 0, solveRotation: 0,
      isSource: false, isTarget: false, onPath: false,
    }))
  );

  // Generate path using random walk
  const path: [number, number][] = [[0, 0]];
  const visited = new Set<string>();
  visited.add('0,0');

  let [cx, cy] = [0, 0];
  const target: [number, number] = [size - 1, size - 1];

  while (cx !== target[0] || cy !== target[1]) {
    const neighbors: [number, number, number][] = [];
    for (let d = 0; d < 4; d++) {
      const nx = cx + DIRS[d][0];
      const ny = cy + DIRS[d][1];
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited.has(`${nx},${ny}`)) {
        // Prefer moving toward target
        const dist = Math.abs(nx - target[0]) + Math.abs(ny - target[1]);
        neighbors.push([nx, ny, d]);
      }
    }
    if (neighbors.length === 0) break;
    // Bias toward target
    neighbors.sort((a, b) => {
      const da = Math.abs(a[0] - target[0]) + Math.abs(a[1] - target[1]);
      const db = Math.abs(b[0] - target[0]) + Math.abs(b[1] - target[1]);
      return da - db;
    });
    const pick = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * neighbors.length);
    const [nx, ny] = neighbors[pick];
    path.push([nx, ny]);
    visited.add(`${nx},${ny}`);
    [cx, cy] = [nx, ny];
  }

  // Mark path cells and determine pipe types
  const pathSet = new Map<string, number>();
  path.forEach(([x, y], i) => pathSet.set(`${x},${y}`, i));

  for (let i = 0; i < path.length; i++) {
    const [x, y] = path[i];
    const connections: number[] = [];

    for (let d = 0; d < 4; d++) {
      const nx = x + DIRS[d][0];
      const ny = y + DIRS[d][1];
      const ni = pathSet.get(`${nx},${ny}`);
      if (ni !== undefined && Math.abs(ni - i) === 1) {
        connections.push(d);
      }
    }

    let type: PipeCell['type'] = 'straight';
    let solveRotation = 0;

    if (connections.length === 1) {
      type = 'end';
      solveRotation = connections[0];
    } else if (connections.length === 2) {
      if ((connections[0] + 2) % 4 === connections[1]) {
        type = 'straight';
        solveRotation = connections[0] % 2;
      } else {
        type = 'corner';
        // Find rotation where connections match
        for (let r = 0; r < 4; r++) {
          const c = getConnections('corner', r);
          if (c.includes(connections[0]) && c.includes(connections[1])) {
            solveRotation = r;
            break;
          }
        }
      }
    } else if (connections.length === 3) {
      type = 'tee';
      for (let r = 0; r < 4; r++) {
        const c = getConnections('tee', r);
        if (connections.every(d => c.includes(d))) {
          solveRotation = r;
          break;
        }
      }
    } else if (connections.length === 4) {
      type = 'cross';
      solveRotation = 0;
    }

    grid[y][x] = {
      type,
      rotation: (solveRotation + Math.floor(Math.random() * 3) + 1) % 4,
      solveRotation,
      isSource: i === 0,
      isTarget: i === path.length - 1,
      onPath: true,
    };
  }

  // Fill non-path cells with random pipes
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!pathSet.has(`${x},${y}`)) {
        const types: PipeCell['type'][] = ['straight', 'corner', 'tee'];
        grid[y][x] = {
          type: types[Math.floor(Math.random() * types.length)],
          rotation: Math.floor(Math.random() * 4),
          solveRotation: 0,
          isSource: false,
          isTarget: false,
          onPath: false,
        };
      }
    }
  }

  return grid;
}

function checkSolved(grid: PipeCell[][]): boolean {
  const size = grid.length;
  let sourceX = -1, sourceY = -1;

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (grid[y][x].isSource) { sourceX = x; sourceY = y; }

  if (sourceX === -1) return false;

  const visited = new Set<string>();
  const queue: [number, number][] = [[sourceX, sourceY]];
  visited.add(`${sourceX},${sourceY}`);

  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    if (grid[y][x].isTarget) return true;

    const conns = getConnections(grid[y][x].type, grid[y][x].rotation);
    for (const d of conns) {
      const nx = x + DIRS[d][0];
      const ny = y + DIRS[d][1];
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited.has(`${nx},${ny}`)) {
        const neighborConns = getConnections(grid[ny][nx].type, grid[ny][nx].rotation);
        if (neighborConns.includes(opposite(d))) {
          visited.add(`${nx},${ny}`);
          queue.push([nx, ny]);
        }
      }
    }
  }
  return false;
}

function PipeSVG({ cell, size }: { cell: PipeCell; size: number }) {
  const mid = size / 2;
  const conns = getConnections(cell.type, cell.rotation);
  const strokeW = size * 0.18;
  const color = cell.isSource ? 'hsl(72, 100%, 50%)' : cell.isTarget ? 'hsl(0, 100%, 65%)' : 'hsl(0, 0%, 60%)';

  const endPoints: Record<number, [number, number]> = {
    0: [mid, 0],
    1: [size, mid],
    2: [mid, size],
    3: [0, mid],
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="hsl(228, 20%, 12%)" rx={4} />
      {conns.map(d => (
        <line key={d} x1={mid} y1={mid} x2={endPoints[d][0]} y2={endPoints[d][1]}
          stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      ))}
      <circle cx={mid} cy={mid} r={strokeW * 0.6} fill={color} />
      {cell.isSource && <circle cx={mid} cy={mid} r={strokeW * 0.3} fill="hsl(228, 25%, 5%)" />}
      {cell.isTarget && <circle cx={mid} cy={mid} r={strokeW * 0.3} fill="hsl(228, 25%, 5%)" />}
    </svg>
  );
}

export default function RotatePipes({ onSolve, isPractice, disabled }: Props) {
  const [grid, setGrid] = useState(() => generatePuzzle());
  const [solved, setSolved] = useState(false);

  const handleRotate = useCallback((x: number, y: number) => {
    if (disabled || solved) return;
    setGrid(prev => {
      const next = prev.map(row => row.map(c => ({ ...c })));
      next[y][x].rotation = (next[y][x].rotation + 1) % 4;
      if (checkSolved(next)) {
        setSolved(true);
        setTimeout(onSolve, 300);
      }
      return next;
    });
  }, [disabled, solved, onSolve]);

  const cellSize = Math.floor((Math.min(320, window.innerWidth - 48)) / 4);

  return (
    <div className="flex flex-col items-center gap-3">
      {isPractice && (
        <div className="text-sm text-muted-foreground text-center px-4 font-hud">
          Tap pipes to rotate. Connect 🟢 source to 🔴 drain!
        </div>
      )}
      <div className="grid grid-cols-4 gap-1 p-2 rounded-xl bg-card">
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              onClick={() => handleRotate(x, y)}
              className="transition-transform duration-150 active:scale-90 rounded-md overflow-hidden"
              disabled={disabled || solved}
            >
              <PipeSVG cell={cell} size={cellSize} />
            </button>
          ))
        )}
      </div>
      {solved && <div className="text-primary font-bold text-lg animate-scale-in">✓ Connected!</div>}
    </div>
  );
}
