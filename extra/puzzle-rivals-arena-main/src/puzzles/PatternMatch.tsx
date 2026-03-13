import React, { useState, useCallback } from 'react';

interface Props {
  onSolve: () => void;
  isPractice: boolean;
  disabled: boolean;
}

type Shape = 'circle' | 'square' | 'triangle' | 'diamond';
type Color = string;

const SHAPES: Shape[] = ['circle', 'square', 'triangle', 'diamond'];
const COLORS: Color[] = [
  'hsl(72, 100%, 50%)',   // lime
  'hsl(269, 100%, 50%)',  // violet
  'hsl(0, 100%, 65%)',    // coral
  'hsl(200, 100%, 60%)',  // blue
  'hsl(45, 100%, 55%)',   // gold
];

interface PatternItem {
  shape: Shape;
  color: Color;
}

interface Round {
  pattern: PatternItem[];
  missingIndex: number;
  options: PatternItem[];
  correctOption: number;
}

function generateRound(): Round {
  // Create a 3x3 pattern with a rule
  const baseShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  // Row-based pattern: each row has same shape, different colors
  const pattern: PatternItem[] = [];
  const rowShapes = [SHAPES[0], SHAPES[1], SHAPES[2]];
  for (let i = rowShapes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rowShapes[i], rowShapes[j]] = [rowShapes[j], rowShapes[i]];
  }
  const colColors = [COLORS[0], COLORS[1], COLORS[2]];
  for (let i = colColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colColors[i], colColors[j]] = [colColors[j], colColors[i]];
  }

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      pattern.push({ shape: rowShapes[r], color: colColors[c] });
    }
  }

  const missingIndex = Math.floor(Math.random() * 9);
  const correctItem = pattern[missingIndex];

  // Generate wrong options
  const options: PatternItem[] = [correctItem];
  while (options.length < 4) {
    const wrongItem = {
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
    if (wrongItem.shape !== correctItem.shape || wrongItem.color !== correctItem.color) {
      options.push(wrongItem);
    }
  }
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const correctOption = options.findIndex(o => o.shape === correctItem.shape && o.color === correctItem.color);

  return { pattern, missingIndex, options, correctOption };
}

function ShapeIcon({ item, size = 40 }: { item: PatternItem; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      {item.shape === 'circle' && <circle cx="20" cy="20" r="16" fill={item.color} />}
      {item.shape === 'square' && <rect x="4" y="4" width="32" height="32" rx="4" fill={item.color} />}
      {item.shape === 'triangle' && <polygon points="20,4 36,36 4,36" fill={item.color} />}
      {item.shape === 'diamond' && <polygon points="20,2 38,20 20,38 2,20" fill={item.color} />}
    </svg>
  );
}

export default function PatternMatch({ onSolve, isPractice, disabled }: Props) {
  const [round, setRound] = useState(() => generateRound());
  const [roundNum, setRoundNum] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const totalRounds = 3;

  const handleSelect = useCallback((idx: number) => {
    if (disabled || selected !== null) return;
    setSelected(idx);

    if (idx === round.correctOption) {
      setFeedback('correct');
      if (roundNum >= totalRounds) {
        setTimeout(onSolve, 500);
      } else {
        setTimeout(() => {
          setRound(generateRound());
          setRoundNum(r => r + 1);
          setSelected(null);
          setFeedback(null);
        }, 600);
      }
    } else {
      setFeedback('wrong');
      setTimeout(() => {
        setSelected(null);
        setFeedback(null);
      }, 500);
    }
  }, [disabled, selected, round.correctOption, roundNum, onSolve]);

  return (
    <div className="flex flex-col items-center gap-4">
      {isPractice && (
        <div className="text-sm text-muted-foreground text-center px-4 font-hud">
          Find the missing piece! Each row has the same shape, each column the same color.
        </div>
      )}
      <div className="font-hud text-sm text-muted-foreground">
        Round {roundNum}/{totalRounds}
      </div>
      <div className="grid grid-cols-3 gap-2 p-3 bg-card rounded-xl">
        {round.pattern.map((item, i) => (
          <div key={i} className={`w-16 h-16 flex items-center justify-center rounded-lg ${
            i === round.missingIndex ? 'bg-muted border-2 border-dashed border-primary/40' : 'bg-secondary'
          }`}>
            {i === round.missingIndex ? (
              <span className="text-2xl text-primary">?</span>
            ) : (
              <ShapeIcon item={item} />
            )}
          </div>
        ))}
      </div>
      <div className="text-sm text-muted-foreground font-hud">Pick the missing piece:</div>
      <div className="grid grid-cols-4 gap-3">
        {round.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            disabled={disabled || selected !== null}
            className={`w-16 h-16 flex items-center justify-center rounded-xl border-2 transition-all ${
              selected === i
                ? feedback === 'correct'
                  ? 'border-primary bg-primary/20'
                  : 'border-destructive bg-destructive/20'
                : 'border-border bg-card hover:border-primary/50'
            } active:scale-90`}
          >
            <ShapeIcon item={opt} />
          </button>
        ))}
      </div>
    </div>
  );
}
