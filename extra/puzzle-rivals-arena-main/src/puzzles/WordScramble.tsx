import React, { useState, useCallback } from 'react';

interface Props {
  onSolve: () => void;
  isPractice: boolean;
  disabled: boolean;
}

const WORDS = [
  'BRAIN', 'SPEED', 'QUICK', 'FLASH', 'POWER', 'SMART', 'BLAZE', 'STORM',
  'CLASH', 'RIVAL', 'CROWN', 'DREAM', 'FLAME', 'GLEAM', 'HEART', 'JOLTS',
  'KNACK', 'LEMON', 'MANGO', 'NERVE', 'ORBIT', 'PRISM', 'QUEST', 'REIGN',
  'PIXEL', 'DRIFT', 'SPARK', 'CHASE', 'PULSE', 'TIGER', 'GIANT', 'NOBLE',
];

function scramble(word: string): string[] {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // Make sure it's actually scrambled
  if (letters.join('') === word) {
    [letters[0], letters[1]] = [letters[1], letters[0]];
  }
  return letters;
}

export default function WordScramble({ onSolve, isPractice, disabled }: Props) {
  const [targetWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [scrambled] = useState(() => scramble(targetWord));
  const [selected, setSelected] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [shake, setShake] = useState(false);

  const currentWord = selected.map(i => scrambled[i]).join('');

  const handleTapLetter = useCallback((index: number) => {
    if (disabled || solved) return;
    if (selected.includes(index)) {
      setSelected(prev => prev.filter(i => i !== index));
      return;
    }
    const newSelected = [...selected, index];
    setSelected(newSelected);

    if (newSelected.length === scrambled.length) {
      const word = newSelected.map(i => scrambled[i]).join('');
      if (word === targetWord) {
        setSolved(true);
        setTimeout(onSolve, 400);
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setSelected([]); }, 500);
      }
    }
  }, [disabled, solved, selected, scrambled, targetWord, onSolve]);

  const handleClear = useCallback(() => {
    if (!disabled && !solved) setSelected([]);
  }, [disabled, solved]);

  return (
    <div className="flex flex-col items-center gap-5">
      {isPractice && (
        <div className="text-sm text-muted-foreground text-center px-4 font-hud">
          Tap letters in order to spell the word. Tap again to deselect!
        </div>
      )}
      {/* Answer slots */}
      <div className={`flex gap-2 ${shake ? 'animate-pulse-threat' : ''}`}>
        {scrambled.map((_, i) => (
          <div key={i} className={`w-12 h-14 flex items-center justify-center rounded-xl text-xl font-bold border-2 transition-all ${
            i < selected.length
              ? solved ? 'border-primary bg-primary/20 text-primary' : 'border-primary/60 bg-card text-foreground'
              : 'border-border bg-muted text-muted-foreground'
          }`}>
            {i < selected.length ? scrambled[selected[i]] : ''}
          </div>
        ))}
      </div>

      {/* Scrambled letters */}
      <div className="flex gap-2 flex-wrap justify-center">
        {scrambled.map((letter, i) => {
          const isUsed = selected.includes(i);
          return (
            <button
              key={i}
              onClick={() => handleTapLetter(i)}
              disabled={disabled || solved}
              className={`w-14 h-14 flex items-center justify-center rounded-xl text-xl font-bold transition-all active:scale-90 ${
                isUsed
                  ? 'bg-secondary/50 text-muted-foreground border-2 border-transparent'
                  : 'bg-card text-foreground border-2 border-border hover:border-primary/50'
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleClear}
        disabled={disabled || solved || selected.length === 0}
        className="text-sm text-muted-foreground font-hud underline"
      >
        Clear
      </button>

      {solved && <div className="text-primary font-bold text-lg animate-scale-in">✓ {targetWord}!</div>}
    </div>
  );
}
