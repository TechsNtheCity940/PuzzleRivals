import { useEffect, useState } from "react";
import {
  SeededRandom,
  checkPipeConnections,
  generatePipePuzzle,
  rotatePipeCell,
  type PipeCell,
} from "@/lib/puzzle-engine";
import type { MatchPlayablePuzzleType } from "@/lib/ai-puzzle-service";
import type { PuzzleSubmission } from "@/lib/backend";
import { buildGeneratedQuizRounds, type QuizPuzzleKind } from "@/lib/match-quiz-content";
import { buildCrosswordMini, buildMatchingPairs, buildMaze, buildMemoryGrid, buildNumberGrid, buildPathfinder, buildPatternRounds, buildSpatialRounds, buildSudokuMini, buildTilePuzzle, buildWordScramble, buildWordSearch, buildWordle, canMoveInMaze, getMazeProgress, isTilePuzzleSolved, normalizeSegment, type PatternItem, type ShapeCells } from "@/lib/match-puzzle-contract";
import NeonPuzzleShell, { type NeonPuzzleFamily } from "@/components/match/NeonPuzzleShell";
import { Button } from "@/components/ui/button";

interface MatchPuzzleBoardProps {
  puzzleType: MatchPlayablePuzzleType;
  seed: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  isPractice: boolean;
  disabled: boolean;
  onSolve: () => void;
  onProgress: (progress: number) => void;
  onStateChange?: (submission: PuzzleSubmission, progress: number) => void;
}

function getPuzzleBoardFamily(puzzleType: MatchPlayablePuzzleType): NeonPuzzleFamily {
  switch (puzzleType) {
    case "word_scramble":
    case "word_search":
    case "wordle_guess":
    case "vocabulary_duel":
      return "letter";
    case "crossword_mini":
      return "crossword";
    case "pattern_match":
    case "matching_pairs":
    case "memory_grid":
      return "match";
    case "rotate_pipes":
    case "tile_slide":
    case "spatial_reasoning":
      return "spatial";
    case "maze":
    case "pathfinder":
      return "maze";
    default:
      return "logic";
  }
}

const RIDDLE_BANK: QuizRound[] = [
  {
    prompt: "What has keys but cannot open locks?",
    options: ["A piano", "A map", "A castle", "A deck of cards"],
    correctOption: 0,
  },
  {
    prompt: "The more you take, the more you leave behind. What are they?",
    options: ["Footsteps", "Coins", "Hints", "Breaths"],
    correctOption: 0,
  },
  {
    prompt: "What gets wetter the more it dries?",
    options: ["A sponge", "Rain", "A towel", "Soap"],
    correctOption: 2,
  },
];

const CHESS_BANK: QuizRound[] = [
  {
    prompt: "White to move: your queen and bishop line up on the king. Find the forcing tactic.",
    options: ["Qg7#", "Bxh7+", "Qd8+", "Re8+"],
    correctOption: 0,
  },
  {
    prompt: "Black to move: win material with a fork.",
    options: ["Nd3+", "Qh2+", "Rc1+", "Bf2+"],
    correctOption: 0,
  },
  {
    prompt: "White to move: convert the back-rank weakness immediately.",
    options: ["Re8+", "Qh7+", "Bb5+", "Nd6+"],
    correctOption: 0,
  },
];

const CHECKERS_BANK: QuizRound[] = [
  {
    prompt: "Your red piece can force a double jump. Which landing square starts it?",
    options: ["B6", "D6", "F6", "H6"],
    correctOption: 1,
  },
  {
    prompt: "Black to move: preserve tempo and threaten promotion.",
    options: ["C3", "E5", "G5", "B4"],
    correctOption: 2,
  },
  {
    prompt: "Red to move: take the only capture that keeps king pressure.",
    options: ["A5", "C5", "E3", "G3"],
    correctOption: 1,
  },
];

const LOGIC_SEQUENCE_BANK: QuizRound[] = [
  { prompt: "What comes next: 2, 6, 12, 20, 30, ?", options: ["36", "40", "42", "48"], correctOption: 2 },
  { prompt: "Find the next value: 1, 1, 2, 3, 5, 8, ?", options: ["11", "12", "13", "21"], correctOption: 2 },
  { prompt: "Which symbol completes the pattern: circle, triangle, square, circle, triangle, ?", options: ["diamond", "square", "circle", "star"], correctOption: 1 },
];

const TRIVIA_BLITZ_BANK: QuizRound[] = [
  { prompt: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Mercury", "Jupiter"], correctOption: 1 },
  { prompt: "Which instrument has 88 keys?", options: ["Violin", "Trumpet", "Piano", "Harp"], correctOption: 2 },
  { prompt: "What color do you get by mixing blue and yellow?", options: ["Green", "Purple", "Orange", "Red"], correctOption: 0 },
];

const GEOGRAPHY_BANK: QuizRound[] = [
  { prompt: "What is the capital of Canada?", options: ["Toronto", "Vancouver", "Ottawa", "Montreal"], correctOption: 2 },
  { prompt: "Which country is home to the city of Kyoto?", options: ["South Korea", "Japan", "China", "Thailand"], correctOption: 1 },
  { prompt: "Which desert covers much of northern Africa?", options: ["Gobi", "Atacama", "Kalahari", "Sahara"], correctOption: 3 },
];

const SCIENCE_BANK: QuizRound[] = [
  { prompt: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], correctOption: 1 },
  { prompt: "How many bones does an adult human typically have?", options: ["206", "201", "212", "198"], correctOption: 0 },
  { prompt: "Which device measures earthquakes?", options: ["Barometer", "Seismograph", "Telescope", "Altimeter"], correctOption: 1 },
];

const MATH_RACE_BANK: QuizRound[] = [
  { prompt: "What is 18 x 7?", options: ["112", "126", "134", "142"], correctOption: 1 },
  { prompt: "If a puzzle round lasts 90 seconds, how many 15-second segments are there?", options: ["5", "6", "7", "8"], correctOption: 1 },
  { prompt: "Solve: 144 / 12 + 9", options: ["18", "19", "20", "21"], correctOption: 3 },
];

const CODE_BREAKER_BANK: QuizRound[] = [
  { prompt: "A lock code uses ascending even digits. Which fits best?", options: ["2468", "2486", "8642", "1357"], correctOption: 0 },
  { prompt: "If A=1, B=2, C=3, what code spells CAB?", options: ["312", "321", "123", "231"], correctOption: 0 },
  { prompt: "Which code breaks the rule: two letters followed by two digits?", options: ["AB12", "QZ77", "A1B2", "RT45"], correctOption: 2 },
];

const ANALOGIES_BANK: QuizRound[] = [
  { prompt: "Knight is to chess as king is to ?", options: ["checkers", "cards", "board", "crown"], correctOption: 0 },
  { prompt: "Puzzle is to solve as race is to ?", options: ["sprint", "win", "track", "start"], correctOption: 1 },
  { prompt: "Seed is to tree as clue is to ?", options: ["answer", "timer", "question", "penalty"], correctOption: 0 },
];

const DEDUCTION_GRID_BANK: QuizRound[] = [
  { prompt: "Ava is not red. Ben is not blue. If blue belongs to Cy, what color must Ava have?", options: ["Red", "Green", "Blue", "Unknown"], correctOption: 1 },
  { prompt: "One player solved first, one second, one third. Kim was before Lou. Lou was before Max. Who won?", options: ["Kim", "Lou", "Max", "Tie"], correctOption: 0 },
  { prompt: "Three boxes hold coin, gem, and key. Box A is not gem. Box B is key. What is Box C?", options: ["Coin", "Gem", "Key", "Unknown"], correctOption: 1 },
];

const CHESS_ENDGAME_BANK: QuizRound[] = [
  { prompt: "King and pawn ending: your king is in front of the pawn. What is the winning plan?", options: ["Push immediately", "Opposition first", "Trade kings", "Stalemate trick"], correctOption: 1 },
  { prompt: "Rook ending with active king: what matters most?", options: ["Passive rook checks", "Cut off the king", "Keep pawns split", "Move the rook behind your king"], correctOption: 1 },
  { prompt: "Opposite-colored bishops with equal pawns usually trend toward?", options: ["Forced win", "Drawish play", "Mate net", "Piece fork"], correctOption: 1 },
];

const CHESS_OPENING_BANK: QuizRound[] = [
  { prompt: "After 1.e4 e5 2.Nf3 Nc6, what is a classical developing move for White?", options: ["Bb5", "h4", "Qh5", "a3"], correctOption: 0 },
  { prompt: "What is the main purpose of castling early in the opening?", options: ["Win a pawn", "Develop the queen", "King safety and rook activity", "Threaten mate immediately"], correctOption: 2 },
  { prompt: "In many openings, why fight for the center?", options: ["It makes bishops weaker", "It gives pieces more influence", "It avoids development", "It locks your king in place"], correctOption: 1 },
];

const CHESS_MATE_NET_BANK: QuizRound[] = [
  { prompt: "Your queen and rook align on the back rank. What kind of move often starts the mate net?", options: ["Random pawn push", "Quiet luft move", "Forcing check", "Knight retreat"], correctOption: 2 },
  { prompt: "A boxed king with no escape squares is most vulnerable to?", options: ["A discovered check", "A perpetual shuffle", "Trading queens", "Opposite-side castling"], correctOption: 0 },
  { prompt: "When your bishop covers the escape square, what should your heavy piece look for?", options: ["A fork", "A checking line", "A retreat square", "A pawn trade"], correctOption: 1 },
];

const VOCABULARY_DUEL_BANK: QuizRound[] = [
  { prompt: "Which word is closest in meaning to rapid?", options: ["Slow", "Swift", "Quiet", "Heavy"], correctOption: 1 },
  { prompt: "Choose the best definition of elusive.", options: ["Easy to catch", "Hard to find or pin down", "Very noisy", "Brightly colored"], correctOption: 1 },
  { prompt: "Which word best completes: The puzzle's elegant design was ____.", options: ["clumsy", "ingenious", "fragile", "ordinary"], correctOption: 1 },
];

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function PatternIcon({ item }: { item: PatternItem }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {item.shape === "circle" && <circle cx="20" cy="20" r="16" fill={item.color} />}
      {item.shape === "square" && <rect x="4" y="4" width="32" height="32" rx="4" fill={item.color} />}
      {item.shape === "triangle" && <polygon points="20,4 36,36 4,36" fill={item.color} />}
      {item.shape === "diamond" && <polygon points="20,2 38,20 20,38 2,20" fill={item.color} />}
    </svg>
  );
}

function RotatePipesBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const size = props.difficulty >= 4 ? 5 : 4;
  const [grid, setGrid] = useState(() => checkPipeConnections(generatePipePuzzle(props.seed, size)));
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const total = grid.flat().filter((cell) => cell.type !== "empty").length;
    const connected = grid.flat().filter((cell) => cell.isConnected).length;
    const progress = clampProgress((connected / Math.max(total, 1)) * 100);
    props.onProgress(progress);
    props.onStateChange?.({
      kind: "rotate_pipes",
      rotations: grid.flat().map((cell) => cell.rotation),
    }, progress);
  }, [grid, props]);

  function handleRotate(rowIndex: number, colIndex: number) {
    if (props.disabled || solved) return;

    setGrid((currentGrid) => {
      const rotated = currentGrid.map((row, r) =>
        row.map((cell, c) => (r === rowIndex && c === colIndex ? rotatePipeCell(cell) : cell)),
      );
      const checked = checkPipeConnections(rotated);
      const total = checked.flat().filter((cell) => cell.type !== "empty").length;
      const connected = checked.flat().filter((cell) => cell.isConnected).length;
      const progress = clampProgress((connected / Math.max(total, 1)) * 100);

      if (progress >= 100) {
        setSolved(true);
        setTimeout(props.onSolve, 250);
      }

      return checked;
    });
  }

  return (
    <div className="match-neon-stage match-spatial-board flex flex-col items-center gap-3">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Rotate tiles until the source path connects cleanly to the sink.
        </p>
      )}
      <div className="grid gap-2 rounded-[28px] bg-card/70 p-3" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleRotate(rowIndex, colIndex)}
              disabled={props.disabled || solved}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all active:scale-95 sm:h-16 sm:w-16 ${
                cell.isSource || cell.isSink
                  ? "border-primary/40 bg-primary/10"
                  : cell.isConnected
                    ? "border-primary/25 bg-primary/5"
                    : "border-border bg-background/30"
              }`}
            >
              <PipeGlyph cell={cell} />
            </button>
          )),
        )}
      </div>
    </div>
  );
}

function PipeGlyph({ cell }: { cell: PipeCell }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`h-10 w-10 ${cell.isConnected ? "text-primary" : "text-muted-foreground"}`}
      style={{ transform: `rotate(${cell.rotation}deg)` }}
    >
      {cell.type === "straight" && (
        <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      )}
      {cell.type === "corner" && (
        <path d="M20 0 L20 20 L40 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {cell.type === "tee" && (
        <>
          <line x1="20" y1="0" x2="20" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {cell.type === "cross" && (
        <>
          <line x1="20" y1="0" x2="20" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <line x1="0" y1="20" x2="40" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {cell.type === "end" && (
        <>
          <line x1="20" y1="0" x2="20" y2="20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="20" r="4" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

function NumberGridBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [puzzle] = useState(() => buildNumberGrid(props.seed, props.difficulty));
  const [values, setValues] = useState<(number | null)[]>(puzzle.grid);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const correctCount = values.filter((value, index) => value === puzzle.solution[index]).length;
    const progress = clampProgress((correctCount / puzzle.solution.length) * 100);
    props.onProgress(progress);
    props.onStateChange?.({
      kind: "number_grid",
      values,
    }, progress);
  }, [puzzle.solution, props, values]);

  function handleChange(index: number, nextValue: string) {
    if (props.disabled || solved) return;
    const parsed = nextValue === "" ? null : Math.min(9, Math.max(1, Number.parseInt(nextValue, 10) || 0));

    setValues((currentValues) => {
      const nextValues = [...currentValues];
      nextValues[index] = parsed;
      const filled = nextValues.every((value) => value !== null);
      const correct = nextValues.every((value, valueIndex) => value === puzzle.solution[valueIndex]);

      if (filled && correct) {
        setSolved(true);
        setTimeout(props.onSolve, 250);
      }

      return nextValues;
    });
  }

  return (
    <div className="match-neon-stage match-logic-board flex flex-col items-center gap-3">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Fill the blanks so every row and column matches its target sum.
        </p>
      )}
      <div className="rounded-[28px] bg-card/70 p-3">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${puzzle.size + 1}, 1fr)` }}>
          {Array.from({ length: puzzle.size }, (_, row) => (
            <div key={row} className="contents">
              {Array.from({ length: puzzle.size }, (_, col) => {
                const index = row * puzzle.size + col;
                const isGiven = puzzle.grid[index] !== null;

                return (
                  <div key={index} className="flex h-14 w-14 items-center justify-center">
                    {isGiven ? (
                      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-secondary text-lg font-black">
                        {values[index]}
                      </div>
                    ) : (
                      <input
                        type="number"
                        min={1}
                        max={9}
                        value={values[index] ?? ""}
                        onChange={(event) => handleChange(index, event.target.value)}
                        disabled={props.disabled || solved}
                        className="h-full w-full rounded-2xl border border-primary/20 bg-background/30 text-center text-lg font-black outline-none focus:border-primary"
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex h-14 w-14 items-center justify-center font-hud text-xs font-semibold text-primary">
                ={puzzle.rowSums[row]}
              </div>
            </div>
          ))}
          {Array.from({ length: puzzle.size }, (_, col) => (
            <div key={`col-${col}`} className="flex h-14 w-14 items-center justify-center font-hud text-xs font-semibold text-primary">
              ={puzzle.colSums[col]}
            </div>
          ))}
          <div />
        </div>
      </div>
    </div>
  );
}

function PatternMatchBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [rounds] = useState(() => buildPatternRounds(props.seed, props.difficulty));
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const currentRound = rounds[roundIndex];

  useEffect(() => {
    const progress = clampProgress((answers.length / rounds.length) * 100);
    props.onProgress(progress);
    props.onStateChange?.({
      kind: "pattern_match",
      answers,
    }, progress);
  }, [answers, props, rounds.length]);

  function handleSelect(optionIndex: number) {
    if (props.disabled || selectedIndex !== null) return;
    setSelectedIndex(optionIndex);

    if (optionIndex === currentRound.correctOption) {
      setFeedback("correct");
      setAnswers((current) => [...current, optionIndex]);

      if (roundIndex === rounds.length - 1) {
        props.onProgress(100);
        setTimeout(props.onSolve, 300);
        return;
      }

      setTimeout(() => {
        setRoundIndex((current) => current + 1);
        setSelectedIndex(null);
        setFeedback(null);
      }, 350);
      return;
    }

    setFeedback("wrong");
    setTimeout(() => {
      setSelectedIndex(null);
      setFeedback(null);
    }, 350);
  }

  return (
    <div className="match-neon-stage match-match-board match-pattern-board flex flex-col items-center">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Find the missing piece. Rows share shapes, columns share colors.
        </p>
      )}
      <p className="font-hud text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Round {roundIndex + 1}/{rounds.length}
      </p>
      <div className="match-pattern-grid grid grid-cols-3 gap-2 rounded-[28px] bg-card/70">
        {currentRound.pattern.map((item, index) => (
          <div
            key={index}
            className={`match-pattern-cell flex items-center justify-center rounded-2xl ${
              index === currentRound.missingIndex
                ? "border border-dashed border-primary/40 bg-background/20"
                : "bg-background/35"
            }`}
          >
            {index === currentRound.missingIndex ? <span className="text-2xl text-primary">?</span> : <PatternIcon item={item} />}
          </div>
        ))}
      </div>
      <div className="match-pattern-options grid grid-cols-4">
        {currentRound.options.map((option, optionIndex) => (
          <button
            key={optionIndex}
            onClick={() => handleSelect(optionIndex)}
            disabled={props.disabled || selectedIndex !== null}
            className={`match-pattern-option flex items-center justify-center rounded-2xl border transition-all active:scale-95 ${
              selectedIndex === optionIndex
                ? feedback === "correct"
                  ? "border-primary bg-primary/10"
                  : "border-destructive bg-destructive/10"
                : "border-border bg-card/70 hover:border-primary/30"
            }`}
          >
            <PatternIcon item={option} />
          </button>
        ))}
      </div>
    </div>
  );
}

function WordScrambleBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [puzzle] = useState(() => buildWordScramble(props.seed, props.difficulty));
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const currentWord = selectedIndices.map((index) => puzzle.scrambled[index]).join("");
    let matchingPrefix = 0;

    while (
      matchingPrefix < currentWord.length &&
      currentWord[matchingPrefix] === puzzle.targetWord[matchingPrefix]
    ) {
      matchingPrefix += 1;
    }

    const progress = clampProgress((matchingPrefix / puzzle.targetWord.length) * 100);
    props.onProgress(progress);
    props.onStateChange?.({
      kind: "word_scramble",
      selectedIndices,
    }, progress);
  }, [props, puzzle.scrambled, puzzle.targetWord, selectedIndices]);

  function handleLetterTap(index: number) {
    if (props.disabled || solved) return;

    if (selectedIndices.includes(index)) {
      setSelectedIndices((current) => current.filter((value) => value !== index));
      return;
    }

    const nextIndices = [...selectedIndices, index];
    setSelectedIndices(nextIndices);

    if (nextIndices.length === puzzle.scrambled.length) {
      const guess = nextIndices.map((value) => puzzle.scrambled[value]).join("");

      if (guess === puzzle.targetWord) {
        setSolved(true);
        props.onProgress(100);
        setTimeout(props.onSolve, 250);
      } else {
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setSelectedIndices([]);
        }, 350);
      }
    }
  }

  return (
    <div className="match-neon-stage match-letter-board flex flex-col items-center gap-4">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Tap the scrambled letters in order to spell the hidden word.
        </p>
      )}
      <div className={`flex gap-2 ${shake ? "animate-pulse" : ""}`}>
        {puzzle.scrambled.map((_, slotIndex) => (
          <div
            key={slotIndex}
            className={`flex h-14 w-12 items-center justify-center rounded-2xl border text-xl font-black ${
              slotIndex < selectedIndices.length
                ? "border-primary/25 bg-background/35"
                : "border-border bg-muted/40 text-muted-foreground"
            }`}
          >
            {slotIndex < selectedIndices.length ? puzzle.scrambled[selectedIndices[slotIndex]] : ""}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {puzzle.scrambled.map((letter, index) => {
          const used = selectedIndices.includes(index);
          return (
            <button
              key={`${letter}-${index}`}
              onClick={() => handleLetterTap(index)}
              disabled={props.disabled || solved}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-xl font-black transition-all active:scale-95 ${
                used
                  ? "border-transparent bg-secondary/50 text-muted-foreground"
                  : "border-border bg-card/70 hover:border-primary/30"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CrosswordMiniBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [entries] = useState(() => buildCrosswordMini(props.seed, props.difficulty));
  const [answers, setAnswers] = useState<string[]>(() => entries.map(() => ""));
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const correct = entries.filter((entry, index) => answers[index].trim().toUpperCase() === entry.answer).length;
    const progress = clampProgress((correct / Math.max(entries.length, 1)) * 100);
    props.onProgress(progress);
    props.onStateChange?.({ kind: "crossword_mini", answers }, progress);
  }, [answers, entries, props]);

  function handleAnswerChange(index: number, value: string) {
    if (props.disabled || solved) return;
    setAnswers((current) => {
      const next = [...current];
      next[index] = value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, entries[index].answer.length);
      const done = next.every((answer, answerIndex) => answer === entries[answerIndex].answer);
      if (done) {
        setSolved(true);
        window.setTimeout(props.onSolve, 250);
      }
      return next;
    });
  }

  return (
    <div className="match-neon-stage match-crossword-board flex w-full max-w-3xl flex-col gap-3">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Solve each clue fast. Every filled answer counts toward the clear.
        </p>
      )}
      {entries.map((entry, index) => (
        <div key={`${entry.clue}-${index}`} className="grid gap-2 rounded-[24px] border border-border bg-card/60 p-3 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-hud text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Clue {index + 1}</p>
            <p className="text-sm font-semibold text-foreground sm:text-base">{entry.clue}</p>
          </div>
          <input
            value={answers[index]}
            onChange={(event) => handleAnswerChange(index, event.target.value)}
            disabled={props.disabled || solved}
            className="h-12 min-w-[12rem] rounded-2xl border border-border bg-background/35 px-4 text-sm font-black uppercase tracking-[0.22em]"
            placeholder={`${entry.answer.length} letters`}
          />
        </div>
      ))}
    </div>
  );
}

function WordSearchBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [puzzle] = useState(() => buildWordSearch(props.seed, props.difficulty));
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [foundSegments, setFoundSegments] = useState<Array<{ start: number; end: number }>>([]);
  const [solved, setSolved] = useState(false);
  const foundKeys = new Set(foundSegments.map((segment) => normalizeSegment(segment.start, segment.end)));

  useEffect(() => {
    const progress = clampProgress((foundSegments.length / Math.max(puzzle.placements.length, 1)) * 100);
    props.onProgress(progress);
    props.onStateChange?.({ kind: "word_search", segments: foundSegments }, progress);
  }, [foundSegments, props, puzzle.placements.length]);

  function handleCellTap(index: number) {
    if (props.disabled || solved) return;
    if (selectionStart === null) {
      setSelectionStart(index);
      return;
    }

    const nextKey = normalizeSegment(selectionStart, index);
    const match = puzzle.placements.find((placement) => normalizeSegment(placement.start, placement.end) === nextKey);
    if (match && !foundKeys.has(nextKey)) {
      setFoundSegments((current) => {
        const next = [...current, { start: selectionStart, end: index }];
        if (next.length === puzzle.placements.length) {
          setSolved(true);
          window.setTimeout(props.onSolve, 250);
        }
        return next;
      });
    }
    setSelectionStart(null);
  }

  return (
    <div className="match-neon-stage match-letter-board flex w-full flex-col items-center gap-4">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Find each word in the grid, then mark it by tapping its first and last letter.
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {puzzle.placements.map((placement) => {
          const found = foundKeys.has(normalizeSegment(placement.start, placement.end));
          return (
            <div
              key={placement.word}
              className={`rounded-full border px-3 py-1 text-xs font-hud uppercase tracking-[0.16em] ${
                found ? "border-primary bg-primary/15 text-primary" : "border-border bg-card/60 text-muted-foreground"
              }`}
            >
              {placement.word}
            </div>
          );
        })}
      </div>
      <div className="grid gap-1 rounded-[28px] bg-card/70 p-3" style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))` }}>
        {puzzle.grid.map((letter, index) => {
          const highlighted = puzzle.placements.some((placement) => {
            const key = normalizeSegment(placement.start, placement.end);
            return foundKeys.has(key) && placement.cells.includes(index);
          });
          return (
            <button
              key={`${letter}-${index}`}
              onClick={() => handleCellTap(index)}
              disabled={props.disabled || solved}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black transition-all ${
                selectionStart === index
                  ? "border-primary bg-primary/15 text-primary"
                  : highlighted
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background/35"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchingPairsBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [pairs] = useState(() => buildMatchingPairs(props.seed, props.difficulty));
  const [selectedCard, setSelectedCard] = useState<{ key: string; pairId: number } | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const cards = pairs.flatMap((pair) => ([
    { key: `left-${pair.pairId}`, pairId: pair.pairId, text: pair.left },
    { key: `right-${pair.pairId}`, pairId: pair.pairId, text: pair.right },
  ]));
  const [deck] = useState(() => new SeededRandom(props.seed).shuffle(cards));

  useEffect(() => {
    const progress = clampProgress((matchedPairIds.length / Math.max(pairs.length, 1)) * 100);
    props.onProgress(progress);
    props.onStateChange?.({ kind: "matching_pairs", matchedPairIds }, progress);
  }, [matchedPairIds, pairs.length, props]);

  function handleCardTap(cardKey: string, pairId: number) {
    if (props.disabled || solved || matchedPairIds.includes(pairId)) return;
    if (selectedCard === null) {
      setSelectedCard({ key: cardKey, pairId });
      return;
    }
    if (selectedCard.key === cardKey) {
      return;
    }
    if (selectedCard.pairId !== pairId) {
      setSelectedCard(null);
      return;
    }

    setMatchedPairIds((current) => {
      const next = [...current, pairId];
      if (next.length === pairs.length) {
        setSolved(true);
        window.setTimeout(props.onSolve, 250);
      }
      return next;
    });
    setSelectedCard(null);
  }

  return (
    <div className="match-neon-stage match-match-board flex w-full max-w-4xl flex-col gap-4">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Tap two cards that belong together. Clear the obvious pairs first.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {deck.map((card) => {
          const isMatched = matchedPairIds.includes(card.pairId);
          const isSelected = selectedCard?.key === card.key && !isMatched;
          return (
            <button
              key={card.key}
              onClick={() => handleCardTap(card.key, card.pairId)}
              disabled={props.disabled || solved}
              className={`rounded-[24px] border p-4 text-left transition-all ${
                isMatched
                  ? "border-primary bg-primary/12 text-primary"
                  : isSelected
                    ? "border-primary/40 bg-card"
                    : "border-border bg-card/60 hover:border-primary/25"
              }`}
            >
              <p className="text-sm font-semibold leading-6 sm:text-base">{card.text}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShapePreview({ cells }: { cells: ShapeCells }) {
  return (
    <div className="grid h-24 w-24 grid-cols-4 gap-1 rounded-[20px] bg-background/35 p-2">
      {Array.from({ length: 16 }, (_, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const active = cells.some(([shapeRow, shapeCol]) => shapeRow === row && shapeCol === col);
        return <div key={index} className={`rounded-lg ${active ? "bg-primary shadow-[0_0_18px_rgba(198,255,0,0.32)]" : "bg-background/25"}`} />;
      })}
    </div>
  );
}

function SpatialReasoningBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [rounds] = useState(() => buildSpatialRounds(props.seed, props.difficulty));
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [locked, setLocked] = useState<number | null>(null);
  const currentRound = rounds[roundIndex];

  useEffect(() => {
    const progress = clampProgress((answers.length / rounds.length) * 100);
    props.onProgress(progress);
    props.onStateChange?.({ kind: "spatial_reasoning", answers }, progress);
  }, [answers, props, rounds.length]);

  function handleOption(optionIndex: number) {
    if (props.disabled || locked !== null) return;
    setLocked(optionIndex);
    if (optionIndex !== currentRound.correctOption) {
      window.setTimeout(() => setLocked(null), 250);
      return;
    }

    const nextAnswers = [...answers, optionIndex];
    setAnswers(nextAnswers);
    if (roundIndex === rounds.length - 1) {
      props.onProgress(100);
      window.setTimeout(props.onSolve, 250);
      return;
    }
    window.setTimeout(() => {
      setRoundIndex((current) => current + 1);
      setLocked(null);
    }, 250);
  }

  return (
    <div className="match-neon-stage match-spatial-board flex w-full max-w-4xl flex-col items-center gap-4">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Track the anchor blocks mentally. One corner usually gives the answer away.
        </p>
      )}
      <p className="font-hud text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Round {roundIndex + 1}/{rounds.length}
      </p>
      <div className="rounded-[28px] border border-border bg-card/60 p-4 text-center">
        <p className="font-hud text-xs uppercase tracking-[0.18em] text-primary">{currentRound.instruction}</p>
        <div className="mt-3 flex justify-center">
          <ShapePreview cells={currentRound.base} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {currentRound.options.map((option, optionIndex) => (
          <button
            key={optionIndex}
            onClick={() => handleOption(optionIndex)}
            disabled={props.disabled || locked !== null}
            className={`rounded-[24px] border p-4 transition-all ${
              locked === optionIndex
                ? optionIndex === currentRound.correctOption
                  ? "border-primary bg-primary/10"
                  : "border-destructive bg-destructive/10"
                : "border-border bg-card/60 hover:border-primary/25"
            }`}
          >
            <ShapePreview cells={option} />
          </button>
        ))}
      </div>
    </div>
  );
}

function TileSlidingBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [puzzle] = useState(() => buildTilePuzzle(props.seed, props.difficulty));
  const [tiles, setTiles] = useState(puzzle.tiles);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const correct = tiles.filter((value, index) => {
      if (index === tiles.length - 1) return value === 0;
      return value === index + 1;
    }).length;

    const progress = clampProgress((correct / tiles.length) * 100);
    props.onProgress(progress);
    props.onStateChange?.({
      kind: "tile_slide",
      tiles,
    }, progress);
  }, [props, tiles]);

  function handleTileTap(index: number) {
    if (props.disabled || solved || tiles[index] === 0) return;

    const emptyIndex = tiles.indexOf(0);
    const size = puzzle.size;
    const row = Math.floor(index / size);
    const col = index % size;
    const emptyRow = Math.floor(emptyIndex / size);
    const emptyCol = emptyIndex % size;
    const isAdjacent = Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;

    if (!isAdjacent) return;

    setTiles((currentTiles) => {
      const nextTiles = [...currentTiles];
      [nextTiles[index], nextTiles[emptyIndex]] = [nextTiles[emptyIndex], nextTiles[index]];

      if (isTilePuzzleSolved(nextTiles)) {
        setSolved(true);
        props.onProgress(100);
        setTimeout(props.onSolve, 250);
      }

      return nextTiles;
    });
  }

  return (
    <div className="match-neon-stage match-spatial-board flex flex-col items-center gap-3">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Slide tiles into order by moving pieces into the empty space.
        </p>
      )}
      <div className="grid grid-cols-3 gap-2 rounded-[28px] bg-card/70 p-3">
        {tiles.map((tile, index) => (
          <button
            key={index}
            onClick={() => handleTileTap(index)}
            disabled={props.disabled || solved || tile === 0}
            className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-xl font-black transition-all active:scale-95 ${
              tile === 0
                ? "border-transparent bg-transparent"
                : "border-border bg-background/35 hover:border-primary/30"
            }`}
          >
            {tile !== 0 ? tile : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function SudokuMiniBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [puzzle] = useState(() => buildSudokuMini(props.seed, props.difficulty));
  const [values, setValues] = useState<(number | null)[]>(puzzle.puzzle);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const correct = values.filter((value, index) => value === puzzle.solution[index]).length;
    const progress = clampProgress((correct / puzzle.solution.length) * 100);
    props.onProgress(progress);
    props.onStateChange?.({
      kind: "sudoku_mini",
      values,
    }, progress);
  }, [props, puzzle.solution, values]);

  function handleCellTap(index: number) {
    if (props.disabled || solved || puzzle.puzzle[index] !== null) return;
    setSelectedCell(index);
  }

  function handleNumberTap(value: number) {
    if (selectedCell === null || props.disabled || solved) return;

    setValues((currentValues) => {
      const nextValues = [...currentValues];
      nextValues[selectedCell] = value === 0 ? null : value;
      const filled = nextValues.every((entry) => entry !== null);
      const correct = nextValues.every((entry, index) => entry === puzzle.solution[index]);

      if (filled && correct) {
        setSolved(true);
        props.onProgress(100);
        setTimeout(props.onSolve, 250);
      }

      return nextValues;
    });
  }

  return (
    <div className="match-neon-stage match-logic-board flex flex-col items-center gap-4">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Fill 1-4 so each row, column, and 2x2 box has no repeats.
        </p>
      )}
      <div className="grid grid-cols-4 gap-1 rounded-[28px] bg-card/70 p-3">
        {values.map((value, index) => {
          const row = Math.floor(index / 4);
          const col = index % 4;
          const isGiven = puzzle.puzzle[index] !== null;
          const dividerRight = col === 1 ? "border-r-2 border-r-primary/30" : "";
          const dividerBottom = row === 1 ? "border-b-2 border-b-primary/30" : "";

          return (
            <button
              key={index}
              onClick={() => handleCellTap(index)}
              disabled={props.disabled || solved || isGiven}
              className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-lg font-black transition-all ${dividerRight} ${dividerBottom} ${
                isGiven
                  ? "border-transparent bg-secondary"
                  : selectedCell === index
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/30"
              }`}
            >
              {value ?? ""}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((value) => (
          <button
            key={value}
            onClick={() => handleNumberTap(value)}
            disabled={props.disabled || solved || selectedCell === null}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card/70 text-lg font-black transition-all active:scale-95"
          >
            {value}
          </button>
        ))}
        <button
          onClick={() => handleNumberTap(0)}
          disabled={props.disabled || solved || selectedCell === null}
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card/70 text-sm font-black text-muted-foreground transition-all active:scale-95"
        >
          X
        </button>
      </div>
    </div>
  );
}

function MazeBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [maze] = useState(() => buildMaze(props.seed, props.difficulty));
  const [position, setPosition] = useState(0);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const progress = getMazeProgress(maze, position);
    props.onProgress(progress);
    props.onStateChange?.({ kind: "maze", position }, progress);
  }, [maze.goalIndex, position, props]);

  function move(delta: number) {
    if (props.disabled || solved) return;
    const nextPosition = position + delta;
    if (nextPosition < 0 || nextPosition >= maze.cells.length) return;
    if (!canMoveInMaze(maze, position, nextPosition)) return;
    setPosition(nextPosition);
    if (nextPosition === maze.goalIndex) {
      setSolved(true);
      props.onProgress(100);
      setTimeout(props.onSolve, 250);
    }
  }

  return (
    <div className="match-neon-stage match-maze-board flex flex-col items-center gap-3">
      {props.isPractice && (
        <p className="match-maze-copy text-center font-hud text-sm text-muted-foreground">
          Navigate the maze by moving to adjacent open cells until you reach the finish.
        </p>
      )}
      <div className="match-maze-grid" style={{ gridTemplateColumns: `repeat(${maze.size}, 1fr)` }}>
        {maze.cells.map((cell, index) => (
          <button
            key={index}
            onClick={() => {
              const delta = index - position;
              move(delta);
            }}
            disabled={props.disabled || solved}
            className={`match-maze-cell ${
              index === position
                ? "match-maze-cell-player"
                : index === maze.goalIndex
                  ? "match-maze-cell-goal"
                  : "match-maze-cell-open"
            }`}
          >
            {cell.top ? <span className="match-maze-wall match-maze-wall-top" /> : null}
            {cell.right ? <span className="match-maze-wall match-maze-wall-right" /> : null}
            {cell.bottom ? <span className="match-maze-wall match-maze-wall-bottom" /> : null}
            {cell.left ? <span className="match-maze-wall match-maze-wall-left" /> : null}
            <span className="match-maze-cell-core" />
            {index === position ? <span className="match-maze-marker match-maze-marker-player">P</span> : null}
            {index === maze.goalIndex ? <span className="match-maze-marker match-maze-marker-goal">G</span> : null}
          </button>
        ))}
      </div>
      <div className="match-maze-controls">
        <div />
        <Button variant="outline" size="sm" className="match-maze-control" onClick={() => move(-maze.size)}>↑</Button>
        <div />
        <Button variant="outline" size="sm" className="match-maze-control" onClick={() => move(-1)}>←</Button>
        <Button variant="outline" size="sm" className="match-maze-control" onClick={() => move(maze.size)}>↓</Button>
        <Button variant="outline" size="sm" className="match-maze-control" onClick={() => move(1)}>→</Button>
      </div>
    </div>
  );
}

function PathfinderBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [puzzle] = useState(() => buildPathfinder(props.seed, props.difficulty));
  const [path, setPath] = useState<number[]>([0]);
  const [solved, setSolved] = useState(false);
  const blocked = new Set(puzzle.blocked);

  useEffect(() => {
    let matchingPrefix = 0;
    while (
      matchingPrefix < path.length &&
      matchingPrefix < puzzle.solutionPath.length &&
      path[matchingPrefix] === puzzle.solutionPath[matchingPrefix]
    ) {
      matchingPrefix += 1;
    }
    const progress = clampProgress((matchingPrefix / Math.max(puzzle.solutionPath.length, 1)) * 100);
    props.onProgress(progress);
    props.onStateChange?.({ kind: "pathfinder", path }, progress);
  }, [path, props, puzzle.solutionPath]);

  function handleCellTap(index: number) {
    if (props.disabled || solved || blocked.has(index)) return;
    const last = path[path.length - 1];
    if (index === 0) {
      setPath([0]);
      return;
    }
    if (path.includes(index)) {
      setPath(path.slice(0, path.indexOf(index) + 1));
      return;
    }
    const size = puzzle.size;
    const isAdjacent = Math.abs(Math.floor(last / size) - Math.floor(index / size)) + Math.abs((last % size) - (index % size)) === 1;
    if (!isAdjacent) return;
    const nextPath = [...path, index];
    setPath(nextPath);
    if (index === size * size - 1 && nextPath.every((cell, cellIndex) => cell === puzzle.solutionPath[cellIndex])) {
      setSolved(true);
      props.onProgress(100);
      window.setTimeout(props.onSolve, 250);
    }
  }

  return (
    <div className="match-neon-stage match-maze-board flex flex-col items-center gap-3">
      {props.isPractice && (
        <p className="match-maze-copy text-center font-hud text-sm text-muted-foreground">
          Trace the open route from start to goal. You can backtrack by tapping a visited cell.
        </p>
      )}
      <div className="match-maze-grid match-path-grid" style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}>
        {Array.from({ length: puzzle.size * puzzle.size }, (_, index) => {
          const inPath = path.includes(index);
          const isStart = index === 0;
          const isGoal = index === puzzle.size * puzzle.size - 1;
          return (
            <button
              key={index}
              onClick={() => handleCellTap(index)}
              disabled={props.disabled || solved || blocked.has(index)}
              className={`match-maze-cell ${
                blocked.has(index)
                  ? "match-path-cell-blocked"
                  : isStart
                    ? "match-maze-cell-player"
                    : isGoal
                      ? "match-maze-cell-goal"
                      : inPath
                        ? "match-path-cell-active"
                        : "match-maze-cell-open"
              }`}
            >
              <span className="match-maze-cell-core" />
              {isStart ? <span className="match-maze-marker match-maze-marker-player">S</span> : null}
              {isGoal ? <span className="match-maze-marker match-maze-marker-goal">G</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MemoryGridBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const [puzzle] = useState(() => buildMemoryGrid(props.seed, props.difficulty));
  const [revealed, setRevealed] = useState(true);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setRevealed(false), 1800);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const correct = selectedIndices.filter((index) => puzzle.targets.includes(index)).length;
    const progress = clampProgress((correct / puzzle.targets.length) * 100);
    props.onProgress(progress);
    props.onStateChange?.({ kind: "memory_grid", selectedIndices }, progress);
  }, [props, puzzle.targets, selectedIndices]);

  function toggle(index: number) {
    if (props.disabled || solved || revealed) return;
    const isTarget = puzzle.targets.includes(index);
    const nextSelected = selectedIndices.includes(index)
      ? selectedIndices.filter((value) => value !== index)
      : [...selectedIndices, index];
    setSelectedIndices(nextSelected);

    if (!isTarget) {
      window.setTimeout(() => setSelectedIndices([]), 300);
      return;
    }

    if (puzzle.targets.every((target) => nextSelected.includes(target))) {
      setSolved(true);
      props.onProgress(100);
      setTimeout(props.onSolve, 250);
    }
  }

  return (
    <div className="match-neon-stage match-match-board flex flex-col items-center gap-4">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Memorize the highlighted cells, then tap the same pattern back from memory.
        </p>
      )}
      <div className="grid grid-cols-4 gap-2 rounded-[28px] bg-card/70 p-3">
        {Array.from({ length: 16 }, (_, index) => {
          const active = revealed ? puzzle.targets.includes(index) : selectedIndices.includes(index);
          return (
            <button
              key={index}
              onClick={() => toggle(index)}
              disabled={props.disabled || solved || revealed}
              className={`h-14 w-14 rounded-2xl border transition-all ${
                active ? "border-primary bg-primary/20" : "border-border bg-background/35"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

function QuizScenarioBoard(
  props: Omit<MatchPuzzleBoardProps, "puzzleType"> & {
    kind: QuizPuzzleKind;
    helper: string;
  },
) {
  const [rounds] = useState(() => buildGeneratedQuizRounds(props.kind, props.seed, props.difficulty));
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [locked, setLocked] = useState<number | null>(null);
  const currentRound = rounds[roundIndex];

  useEffect(() => {
    const progress = clampProgress((answers.length / rounds.length) * 100);
    props.onProgress(progress);
    props.onStateChange?.({ kind: props.kind, answers }, progress);
  }, [answers, props, rounds.length]);

  function handleAnswer(optionIndex: number) {
    if (props.disabled || locked !== null) return;
    setLocked(optionIndex);
    if (optionIndex !== currentRound.correctOption) {
      window.setTimeout(() => setLocked(null), 300);
      return;
    }

    const nextAnswers = [...answers, optionIndex];
    setAnswers(nextAnswers);
    if (roundIndex === rounds.length - 1) {
      props.onProgress(100);
      window.setTimeout(props.onSolve, 250);
      return;
    }

    window.setTimeout(() => {
      setRoundIndex((current) => current + 1);
      setLocked(null);
    }, 300);
  }

  return (
    <div className="match-neon-stage match-logic-board match-quiz-board">
      {props.isPractice && (
        <p className="text-center font-hud text-xs leading-5 text-muted-foreground sm:text-sm">{props.helper}</p>
      )}
      <div className="match-quiz-round">
        <p className="font-hud text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Round {roundIndex + 1}/{rounds.length}
        </p>
        <p className="match-quiz-prompt">{currentRound.prompt}</p>
      </div>
      <div className="match-quiz-options">
        {currentRound.options.map((option, optionIndex) => (
          <button
            key={option}
            onClick={() => handleAnswer(optionIndex)}
            disabled={props.disabled || locked !== null}
            className={`match-quiz-option ${
              locked === optionIndex
                ? optionIndex === currentRound.correctOption
                  ? "border-primary bg-primary/10"
                  : "border-destructive bg-destructive/10"
                : "border-border bg-background/35"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function WordleGuessBoard(props: Omit<MatchPuzzleBoardProps, "puzzleType">) {
  const target = buildWordle(props.seed);
  const [guess, setGuess] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    const latest = guesses[guesses.length - 1] ?? "";
    const correct = latest.split("").filter((letter, index) => letter === target[index]).length;
    const progress = clampProgress((correct / target.length) * 100);
    props.onProgress(progress);
    props.onStateChange?.({ kind: "wordle_guess", guesses }, progress);
  }, [guesses, props, target]);

  function submitGuess() {
    if (props.disabled || solved || guess.length !== target.length) return;
    const nextGuess = guess.toUpperCase();
    const nextGuesses = [...guesses, nextGuess];
    setGuesses(nextGuesses);
    setGuess("");
    if (nextGuess === target) {
      setSolved(true);
      props.onProgress(100);
      setTimeout(props.onSolve, 250);
    }
  }

  return (
    <div className="match-neon-stage match-letter-board flex flex-col items-center gap-4">
      {props.isPractice && (
        <p className="text-center font-hud text-sm text-muted-foreground">
          Guess the five-letter word. Green means the letter is in the right spot.
        </p>
      )}
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, row) => {
          const word = guesses[row] ?? "";
          return (
            <div key={row} className="flex gap-2">
              {Array.from({ length: target.length }, (_, col) => {
                const letter = word[col] ?? "";
                const correct = letter && letter === target[col];
                return (
                  <div
                    key={col}
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-lg font-black ${
                      correct ? "border-primary bg-primary/20 text-primary" : "border-border bg-background/35"
                    }`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="flex w-full gap-2">
        <input
          value={guess}
          onChange={(event) => setGuess(event.target.value.toUpperCase().slice(0, target.length))}
          disabled={props.disabled || solved}
          className="h-12 flex-1 rounded-2xl border border-border bg-background/35 px-4 text-sm font-semibold uppercase tracking-[0.2em]"
          placeholder="ENTER"
        />
        <Button variant="play" size="sm" onClick={submitGuess} disabled={props.disabled || solved || guess.length !== target.length}>
          Guess
        </Button>
      </div>
    </div>
  );
}

export default function MatchPuzzleBoard(props: MatchPuzzleBoardProps) {
  const family = getPuzzleBoardFamily(props.puzzleType);

  let board: JSX.Element;

  if (props.puzzleType === "rotate_pipes") {
    board = <RotatePipesBoard {...props} />;
  } else if (props.puzzleType === "number_grid") {
    board = <NumberGridBoard {...props} />;
  } else if (props.puzzleType === "pattern_match") {
    board = <PatternMatchBoard {...props} />;
  } else if (props.puzzleType === "word_scramble") {
    board = <WordScrambleBoard {...props} />;
  } else if (props.puzzleType === "crossword_mini") {
    board = <CrosswordMiniBoard {...props} />;
  } else if (props.puzzleType === "tile_slide") {
    board = <TileSlidingBoard {...props} />;
  } else if (props.puzzleType === "sudoku_mini") {
    board = <SudokuMiniBoard {...props} />;
  } else if (props.puzzleType === "word_search") {
    board = <WordSearchBoard {...props} />;
  } else if (props.puzzleType === "matching_pairs") {
    board = <MatchingPairsBoard {...props} />;
  } else if (props.puzzleType === "spatial_reasoning") {
    board = <SpatialReasoningBoard {...props} />;
  } else if (props.puzzleType === "maze") {
    board = <MazeBoard {...props} />;
  } else if (props.puzzleType === "pathfinder") {
    board = <PathfinderBoard {...props} />;
  } else if (props.puzzleType === "memory_grid") {
    board = <MemoryGridBoard {...props} />;
  } else if (props.puzzleType === "riddle_choice") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="riddle_choice"
        helper="Read the riddle carefully and pick the strongest answer."
      />
    );
  } else if (props.puzzleType === "wordle_guess") {
    board = <WordleGuessBoard {...props} />;
  } else if (props.puzzleType === "chess_tactic") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="chess_tactic"
        helper="Choose the best tactical continuation from the listed moves."
      />
    );
  } else if (props.puzzleType === "logic_sequence") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="logic_sequence"
        helper="Read the pattern and choose the only answer that continues it cleanly."
      />
    );
  } else if (props.puzzleType === "trivia_blitz") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="trivia_blitz"
        helper="Move fast. These are broad knowledge questions built for speed."
      />
    );
  } else if (props.puzzleType === "geography_quiz") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="geography_quiz"
        helper="Pick the right capital, country, or landmark before the timer closes."
      />
    );
  } else if (props.puzzleType === "science_quiz") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="science_quiz"
        helper="Choose the right science or tech answer from the prompt."
      />
    );
  } else if (props.puzzleType === "math_race") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="math_race"
        helper="Mental math only. Pick the correct answer before momentum drops."
      />
    );
  } else if (props.puzzleType === "code_breaker") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="code_breaker"
        helper="Read the code rule and break the right combination."
      />
    );
  } else if (props.puzzleType === "analogies") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="analogies"
        helper="Pick the option that completes the relationship best."
      />
    );
  } else if (props.puzzleType === "deduction_grid") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="deduction_grid"
        helper="Think through the clues and choose the only consistent answer."
      />
    );
  } else if (props.puzzleType === "chess_endgame") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="chess_endgame"
        helper="Choose the endgame plan that actually converts or saves the draw."
      />
    );
  } else if (props.puzzleType === "chess_opening") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="chess_opening"
        helper="Choose the principled opening move that fits the position."
      />
    );
  } else if (props.puzzleType === "chess_mate_net") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="chess_mate_net"
        helper="Look for the forcing move that creates an unavoidable mating net."
      />
    );
  } else if (props.puzzleType === "vocabulary_duel") {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="vocabulary_duel"
        helper="Pick the strongest synonym, meaning, or word fit."
      />
    );
  } else {
    board = (
      <QuizScenarioBoard
        {...props}
        kind="checkers_tactic"
        helper="Find the best capture or positional continuation in the checkers scenario."
      />
    );
  }

  return (
    <NeonPuzzleShell family={family} puzzleType={props.puzzleType}>
      {board}
    </NeonPuzzleShell>
  );
}
