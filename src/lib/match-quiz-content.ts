export interface GeneratedQuizRound {
  prompt: string;
  options: string[];
  correctOption: number;
}

export type QuizPuzzleKind =
  | "riddle_choice"
  | "chess_tactic"
  | "checkers_tactic"
  | "logic_sequence"
  | "trivia_blitz"
  | "geography_quiz"
  | "science_quiz"
  | "math_race"
  | "code_breaker"
  | "analogies"
  | "deduction_grid"
  | "chess_endgame"
  | "chess_opening"
  | "chess_mate_net"
  | "vocabulary_duel";

type FixedQuizEntry = {
  prompt: string;
  answer: string;
  distractors: string[];
};

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

  pick<T>(items: T[]) {
    return items[this.nextInt(0, items.length - 1)];
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

const RIDDLE_BANK: FixedQuizEntry[] = [
  { prompt: "What has keys but cannot open locks?", answer: "A piano", distractors: ["A map", "A castle", "A deck of cards"] },
  { prompt: "The more you take, the more you leave behind. What are they?", answer: "Footsteps", distractors: ["Coins", "Hints", "Breaths"] },
  { prompt: "What gets wetter the more it dries?", answer: "A towel", distractors: ["A sponge", "Rain", "Soap"] },
  { prompt: "What has hands but can not clap?", answer: "A clock", distractors: ["A robot", "A statue", "A card dealer"] },
  { prompt: "What has a face and two hands but no arms or legs?", answer: "A clock", distractors: ["A coin", "A mask", "A mirror"] },
  { prompt: "What can travel around the world while staying in one corner?", answer: "A stamp", distractors: ["A satellite", "A shadow", "A compass"] },
  { prompt: "What has one eye but cannot see?", answer: "A needle", distractors: ["A potato", "A storm", "A camera"] },
  { prompt: "What gets bigger the more you take away?", answer: "A hole", distractors: ["A mountain", "A puzzle board", "A trophy case"] },
  { prompt: "What has many teeth but cannot bite?", answer: "A comb", distractors: ["A zipper", "A saw", "A key ring"] },
  { prompt: "What can you catch but not throw?", answer: "A cold", distractors: ["A train", "A clue", "A fish"] },
  { prompt: "What goes up but never comes down?", answer: "Your age", distractors: ["The sun", "Steam", "A ladder"] },
  { prompt: "What has a neck but no head?", answer: "A bottle", distractors: ["A shirt", "A guitar", "A lamp"] },
];

const TRIVIA_BANK: FixedQuizEntry[] = [
  { prompt: "Which planet is known as the Red Planet?", answer: "Mars", distractors: ["Venus", "Mercury", "Jupiter"] },
  { prompt: "Which instrument has 88 keys?", answer: "Piano", distractors: ["Violin", "Trumpet", "Harp"] },
  { prompt: "What color do you get by mixing blue and yellow?", answer: "Green", distractors: ["Purple", "Orange", "Red"] },
  { prompt: "Which ocean is the largest on Earth?", answer: "Pacific Ocean", distractors: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"] },
  { prompt: "How many days are in a leap year?", answer: "366", distractors: ["365", "364", "360"] },
  { prompt: "Which animal is known as the king of the jungle?", answer: "Lion", distractors: ["Tiger", "Elephant", "Leopard"] },
  { prompt: "What do bees make?", answer: "Honey", distractors: ["Wax paper", "Pollen dust", "Maple syrup"] },
  { prompt: "Which sport uses a net, a shuttlecock, and rackets?", answer: "Badminton", distractors: ["Tennis", "Volleyball", "Squash"] },
  { prompt: "Which month has the fewest days?", answer: "February", distractors: ["April", "June", "September"] },
  { prompt: "Which shape has eight sides?", answer: "Octagon", distractors: ["Hexagon", "Pentagon", "Decagon"] },
  { prompt: "Which holiday is celebrated on December 25?", answer: "Christmas", distractors: ["Halloween", "Thanksgiving", "New Year's Day"] },
  { prompt: "Which game piece usually moves in an L-shape?", answer: "Knight", distractors: ["Bishop", "Rook", "Queen"] },
];

const SCIENCE_BANK: FixedQuizEntry[] = [
  { prompt: "What gas do plants absorb from the atmosphere?", answer: "Carbon dioxide", distractors: ["Oxygen", "Nitrogen", "Helium"] },
  { prompt: "How many bones does an adult human typically have?", answer: "206", distractors: ["201", "212", "198"] },
  { prompt: "Which device measures earthquakes?", answer: "Seismograph", distractors: ["Barometer", "Telescope", "Altimeter"] },
  { prompt: "What is the boiling point of water at sea level in Celsius?", answer: "100", distractors: ["90", "110", "120"] },
  { prompt: "Which blood cells carry oxygen?", answer: "Red blood cells", distractors: ["White blood cells", "Platelets", "Plasma cells"] },
  { prompt: "What force keeps planets in orbit around the sun?", answer: "Gravity", distractors: ["Magnetism", "Friction", "Static charge"] },
  { prompt: "What part of the cell contains the genetic material?", answer: "Nucleus", distractors: ["Membrane", "Ribosome", "Vacuole"] },
  { prompt: "Which organ pumps blood through the body?", answer: "Heart", distractors: ["Liver", "Lungs", "Kidney"] },
  { prompt: "What is H2O commonly called?", answer: "Water", distractors: ["Hydrogen", "Oxygen", "Salt"] },
  { prompt: "Which planet has prominent rings?", answer: "Saturn", distractors: ["Mars", "Venus", "Neptune"] },
  { prompt: "What kind of energy is stored in food?", answer: "Chemical energy", distractors: ["Solar energy", "Nuclear energy", "Sound energy"] },
  { prompt: "Which simple machine is used to lift a bucket from a well?", answer: "Pulley", distractors: ["Wedge", "Screw", "Wheel axle"] },
];

const VOCAB_BANK = [
  { word: "rapid", synonym: "swift", definition: "moving very fast" },
  { word: "elusive", synonym: "hard to pin down", definition: "difficult to catch, find, or understand fully" },
  { word: "ingenious", synonym: "clever", definition: "remarkably clever and inventive" },
  { word: "vivid", synonym: "bright", definition: "producing powerful feelings or strong, clear images" },
  { word: "fragile", synonym: "delicate", definition: "easily broken or damaged" },
  { word: "precise", synonym: "exact", definition: "marked by exactness and accuracy" },
  { word: "scarce", synonym: "rare", definition: "in short supply" },
  { word: "bold", synonym: "brave", definition: "showing confidence and willingness to take risks" },
  { word: "subtle", synonym: "delicate", definition: "not obvious; hard to notice at first" },
  { word: "vast", synonym: "immense", definition: "of very great extent or quantity" },
];

const ANALOGY_BANK = [
  { left: "Knight", relation: "plays on", right: "Chessboard", answer: "checkers piece", choices: ["checkers piece", "deck of cards", "soccer ball", "domino tile"] },
  { left: "Puzzle", relation: "is meant to be", right: "Solved", answer: "race", choices: ["race", "book", "rain", "paint"] },
  { left: "Seed", relation: "grows into", right: "Tree", answer: "clue", choices: ["clue", "scoreboard", "timer", "bot"] },
  { left: "Compass", relation: "helps you", right: "Navigate", answer: "flashlight", choices: ["flashlight", "blanket", "trophy", "coin"] },
  { left: "Brush", relation: "is used to", right: "Paint", answer: "keyboard", choices: ["keyboard", "curtain", "backpack", "ladder"] },
  { left: "Coach", relation: "guides a", right: "Team", answer: "teacher", choices: ["teacher", "eraser", "helmet", "traffic light"] },
];

const CHESS_BANK: FixedQuizEntry[] = [
  { prompt: "White to move: your queen and bishop line up on the king. Find the forcing tactic.", answer: "Qg7#", distractors: ["Bxh7+", "Qd8+", "Re8+"] },
  { prompt: "Black to move: win material with a fork.", answer: "Nd3+", distractors: ["Qh2+", "Rc1+", "Bf2+"] },
  { prompt: "White to move: convert the back-rank weakness immediately.", answer: "Re8+", distractors: ["Qh7+", "Bb5+", "Nd6+"] },
  { prompt: "White to move: exploit the pinned knight first.", answer: "Bxf7+", distractors: ["Qd5", "Nh4", "a4"] },
  { prompt: "Black to move: remove the defender and open the king.", answer: "Bxh2+", distractors: ["Qg5", "Rc8", "a5"] },
  { prompt: "White to move: a discovered attack wins the queen. Start with?", answer: "Nd5", distractors: ["Qc2", "Re1", "h4"] },
];

const CHECKERS_BANK: FixedQuizEntry[] = [
  { prompt: "Your red piece can force a double jump. Which landing square starts it?", answer: "D6", distractors: ["B6", "F6", "H6"] },
  { prompt: "Black to move: preserve tempo and threaten promotion.", answer: "G5", distractors: ["C3", "E5", "B4"] },
  { prompt: "Red to move: take the only capture that keeps king pressure.", answer: "C5", distractors: ["A5", "E3", "G3"] },
  { prompt: "Black to move: force the trade that opens your promotion lane.", answer: "F4", distractors: ["B6", "D2", "H4"] },
  { prompt: "Red to move: which jump keeps your back row intact?", answer: "E5", distractors: ["A3", "C7", "G5"] },
  { prompt: "Black to move: set up a king trap on the next turn.", answer: "D4", distractors: ["B2", "F6", "H2"] },
];

const DEDUCTION_BANK: FixedQuizEntry[] = [
  { prompt: "Ava is not red. Ben is not blue. If blue belongs to Cy, what color must Ava have?", answer: "Green", distractors: ["Red", "Blue", "Unknown"] },
  { prompt: "One player solved first, one second, one third. Kim was before Lou. Lou was before Max. Who won?", answer: "Kim", distractors: ["Lou", "Max", "Tie"] },
  { prompt: "Three boxes hold coin, gem, and key. Box A is not gem. Box B is key. What is Box C?", answer: "Gem", distractors: ["Coin", "Key", "Unknown"] },
  { prompt: "Two clues are true: Jade is left of Noah. Noah is left of Iris. Who is in the middle?", answer: "Noah", distractors: ["Jade", "Iris", "Unknown"] },
  { prompt: "If the bronze badge is not in slot 1 and the silver badge is in slot 3, where is bronze if all slots are unique?", answer: "Slot 2", distractors: ["Slot 1", "Slot 3", "Unknown"] },
  { prompt: "If every ranked player has a badge and Kai is ranked, what must be true?", answer: "Kai has a badge", distractors: ["Kai is unranked", "Kai has no badge", "Nothing follows"] },
];

const CHESS_ENDGAME_BANK: FixedQuizEntry[] = [
  { prompt: "King and pawn ending: your king is in front of the pawn. What is the winning plan?", answer: "Opposition first", distractors: ["Push immediately", "Trade kings", "Stalemate trick"] },
  { prompt: "Rook ending with active king: what matters most?", answer: "Cut off the king", distractors: ["Passive rook checks", "Keep pawns split", "Move the rook behind your king"] },
  { prompt: "Opposite-colored bishops with equal pawns usually trend toward?", answer: "Drawish play", distractors: ["Forced win", "Mate net", "Piece fork"] },
  { prompt: "A king and rook versus king ending normally wins by driving the king to?", answer: "The edge", distractors: ["The center", "A knight square", "A dark square only"] },
  { prompt: "In pawn endings, what often decides if a passed pawn queens first?", answer: "Tempo", distractors: ["Piece color", "Opening theory", "Move notation"] },
  { prompt: "If your rook is active behind a passed pawn, your main idea is usually to?", answer: "Support promotion from behind", distractors: ["Trade your rook", "Hide your king", "Avoid checks entirely"] },
];

const CHESS_OPENING_BANK: FixedQuizEntry[] = [
  { prompt: "After 1.e4 e5 2.Nf3 Nc6, what is a classical developing move for White?", answer: "Bb5", distractors: ["h4", "Qh5", "a3"] },
  { prompt: "What is the main purpose of castling early in the opening?", answer: "King safety and rook activity", distractors: ["Win a pawn", "Develop the queen", "Threaten mate immediately"] },
  { prompt: "In many openings, why fight for the center?", answer: "It gives pieces more influence", distractors: ["It makes bishops weaker", "It avoids development", "It locks your king in place"] },
  { prompt: "Which is usually better in the opening: moving one piece three times or developing a new piece?", answer: "Developing a new piece", distractors: ["Moving one piece three times", "Early king walk", "Rook pawn push"] },
  { prompt: "What does development usually mean?", answer: "Bringing pieces to active squares", distractors: ["Trading queens early", "Moving only pawns", "Forcing a draw"] },
  { prompt: "Before launching an attack, what opening goal should you usually complete?", answer: "King safety", distractors: ["Pawn storms only", "Edge pawn pushes", "Rook sacrifices"] },
];

const CHESS_MATE_NET_BANK: FixedQuizEntry[] = [
  { prompt: "Your queen and rook align on the back rank. What kind of move often starts the mate net?", answer: "Forcing check", distractors: ["Random pawn push", "Quiet luft move", "Knight retreat"] },
  { prompt: "A boxed king with no escape squares is most vulnerable to?", answer: "A discovered check", distractors: ["A perpetual shuffle", "Trading queens", "Opposite-side castling"] },
  { prompt: "When your bishop covers the escape square, what should your heavy piece look for?", answer: "A checking line", distractors: ["A fork", "A retreat square", "A pawn trade"] },
  { prompt: "The easiest mate nets usually begin by taking away what?", answer: "Escape squares", distractors: ["Material only", "Center pawns", "Opening theory"] },
  { prompt: "If the king has one safe square left, your next move should try to?", answer: "Cover that square with tempo", distractors: ["Trade all pieces", "Push a rook pawn", "Force repetition"] },
  { prompt: "A mating net is strongest when your attack is?", answer: "Forcing and coordinated", distractors: ["Slow and random", "Material-only", "Passive"] },
];

const CAPITALS = [
  ["Canada", "Ottawa"], ["Japan", "Tokyo"], ["Brazil", "Brasilia"], ["Spain", "Madrid"], ["Egypt", "Cairo"],
  ["Australia", "Canberra"], ["Kenya", "Nairobi"], ["India", "New Delhi"], ["Argentina", "Buenos Aires"], ["Norway", "Oslo"],
  ["Thailand", "Bangkok"], ["Mexico", "Mexico City"], ["Turkey", "Ankara"], ["Peru", "Lima"], ["Morocco", "Rabat"],
  ["Sweden", "Stockholm"], ["South Korea", "Seoul"], ["Germany", "Berlin"], ["Chile", "Santiago"], ["Nigeria", "Abuja"],
];

const LANDMARKS = [
  ["Japan", "Kyoto"], ["France", "the Eiffel Tower"], ["Italy", "the Colosseum"], ["Peru", "Machu Picchu"],
  ["India", "the Taj Mahal"], ["Australia", "the Sydney Opera House"], ["Egypt", "the Great Pyramid of Giza"],
  ["Brazil", "Christ the Redeemer"], ["Greece", "the Acropolis"], ["Jordan", "Petra"],
];

export function buildGeneratedQuizRounds(kind: QuizPuzzleKind, seed: number, difficulty: number): GeneratedQuizRound[] {
  const rng = new SeededRandom(seed);
  const totalRounds = Math.min(5, Math.max(4, difficulty + 1));

  switch (kind) {
    case "riddle_choice":
      return buildFixedRounds(rng, totalRounds, RIDDLE_BANK);
    case "chess_tactic":
      return buildFixedRounds(rng, totalRounds, CHESS_BANK);
    case "checkers_tactic":
      return buildFixedRounds(rng, totalRounds, CHECKERS_BANK);
    case "trivia_blitz":
      return buildFixedRounds(rng, totalRounds, TRIVIA_BANK);
    case "science_quiz":
      return buildFixedRounds(rng, totalRounds, SCIENCE_BANK);
    case "deduction_grid":
      return buildFixedRounds(rng, totalRounds, DEDUCTION_BANK);
    case "chess_endgame":
      return buildFixedRounds(rng, totalRounds, CHESS_ENDGAME_BANK);
    case "chess_opening":
      return buildFixedRounds(rng, totalRounds, CHESS_OPENING_BANK);
    case "chess_mate_net":
      return buildFixedRounds(rng, totalRounds, CHESS_MATE_NET_BANK);
    case "geography_quiz":
      return Array.from({ length: totalRounds }, () => buildGeographyRound(rng));
    case "logic_sequence":
      return Array.from({ length: totalRounds }, () => buildLogicSequenceRound(rng));
    case "math_race":
      return Array.from({ length: totalRounds }, () => buildMathRound(rng));
    case "code_breaker":
      return Array.from({ length: totalRounds }, () => buildCodeBreakerRound(rng));
    case "analogies":
      return Array.from({ length: totalRounds }, () => buildAnalogyRound(rng));
    case "vocabulary_duel":
      return Array.from({ length: totalRounds }, () => buildVocabularyRound(rng));
  }
}

function buildFixedRounds(rng: SeededRandom, totalRounds: number, bank: FixedQuizEntry[]): GeneratedQuizRound[] {
  return rng.shuffle(bank).slice(0, totalRounds).map((entry) => createRound(rng, entry.prompt, entry.answer, entry.distractors));
}

function buildGeographyRound(rng: SeededRandom): GeneratedQuizRound {
  const questionType = rng.nextInt(0, 2);

  if (questionType === 0) {
    const [country, capital] = rng.pick(CAPITALS);
    const distractors = rng.shuffle(CAPITALS.filter((entry) => entry[0] !== country).map((entry) => entry[1])).slice(0, 3);
    return createRound(rng, `What is the capital of ${country}?`, capital, distractors);
  }

  if (questionType === 1) {
    const [country, capital] = rng.pick(CAPITALS);
    const distractors = rng.shuffle(CAPITALS.filter((entry) => entry[0] !== country).map((entry) => entry[0])).slice(0, 3);
    return createRound(rng, `${capital} is the capital of which country?`, country, distractors);
  }

  const [country, landmark] = rng.pick(LANDMARKS);
  const distractors = rng.shuffle(LANDMARKS.filter((entry) => entry[0] !== country).map((entry) => entry[0])).slice(0, 3);
  return createRound(rng, `Which country is home to ${landmark}?`, country, distractors);
}

function buildLogicSequenceRound(rng: SeededRandom): GeneratedQuizRound {
  const mode = rng.nextInt(0, 2);

  if (mode === 0) {
    const start = rng.nextInt(2, 12);
    const step = rng.nextInt(2, 8);
    const values = Array.from({ length: 5 }, (_, index) => start + step * index);
    const answer = String(start + step * 5);
    return createRound(
      rng,
      `What comes next: ${values.join(", ")}, ?`,
      answer,
      [String(Number(answer) + step), String(Number(answer) - step), String(Number(answer) + step * 2)],
    );
  }

  if (mode === 1) {
    const base = rng.nextInt(2, 5);
    const values = Array.from({ length: 5 }, (_, index) => base ** (index + 1));
    const answer = String(base ** 6);
    return createRound(
      rng,
      `Continue the pattern: ${values.join(", ")}, ?`,
      answer,
      [String(base ** 5), String(base ** 6 + base), String(base ** 6 - base)],
    );
  }

  const symbols = ["circle", "triangle", "square", "diamond", "star"];
  const cycle = rng.shuffle(symbols).slice(0, 3);
  const values = Array.from({ length: 5 }, (_, index) => cycle[index % cycle.length]);
  const answer = cycle[5 % cycle.length];
  return createRound(
    rng,
    `Which symbol comes next: ${values.join(", ")}, ?`,
    answer,
    rng.shuffle(symbols.filter((symbol) => symbol !== answer)).slice(0, 3),
  );
}

function buildMathRound(rng: SeededRandom): GeneratedQuizRound {
  const mode = rng.nextInt(0, 2);

  if (mode === 0) {
    const left = rng.nextInt(12, 48);
    const right = rng.nextInt(3, 12);
    const answer = left * right;
    return createRound(
      rng,
      `What is ${left} x ${right}?`,
      String(answer),
      [String(answer + right), String(answer - right), String(answer + left)],
    );
  }

  if (mode === 1) {
    const divisor = rng.nextInt(3, 12);
    const quotient = rng.nextInt(8, 24);
    const offset = rng.nextInt(4, 16);
    const answer = quotient + offset;
    return createRound(
      rng,
      `Solve: ${divisor * quotient} / ${divisor} + ${offset}`,
      String(answer),
      [String(answer - 1), String(answer + 1), String(answer + divisor)],
    );
  }

  const sideA = rng.nextInt(4, 16);
  const sideB = rng.nextInt(4, 16);
  const answer = 2 * (sideA + sideB);
  return createRound(
    rng,
    `What is the perimeter of a rectangle with sides ${sideA} and ${sideB}?`,
    String(answer),
    [String(answer + 2), String(answer - 2), String(sideA * sideB)],
  );
}

function buildCodeBreakerRound(rng: SeededRandom): GeneratedQuizRound {
  const mode = rng.nextInt(0, 2);

  if (mode === 0) {
    const start = rng.nextInt(0, 3) * 2;
    const digits = Array.from({ length: 4 }, (_, index) => start + index * 2).join("");
    return createRound(
      rng,
      "A lock code uses ascending even digits. Which code fits the rule?",
      digits,
      [digits.split("").reverse().join(""), "1357", "2486"],
    );
  }

  if (mode === 1) {
    const letters = ["A", "B", "C", "D", "E", "F"];
    const first = rng.pick(letters);
    const second = rng.pick(letters.filter((letter) => letter !== first));
    const left = rng.nextInt(1, 7);
    const right = rng.nextInt(1, 7);
    const answer = `${first}${second}${left}${right}`;
    return createRound(
      rng,
      "Which code follows the pattern: two letters followed by two digits?",
      answer,
      [`${first}${left}${second}${right}`, `${left}${right}${first}${second}`, `${first}${second}${right}`],
    );
  }

  const correct = `${rng.pick(["2468", "8642", "3579", "9753"])}`;
  const reversed = correct.split("").reverse().join("");
  const odd = "1357";
  return createRound(
    rng,
    "Choose the code that stays in strict ascending order.",
    correct[0] < correct[correct.length - 1] ? correct : reversed,
    [correct[0] < correct[correct.length - 1] ? reversed : correct, odd, "2486"],
  );
}

function buildAnalogyRound(rng: SeededRandom): GeneratedQuizRound {
  const entry = rng.pick(ANALOGY_BANK);
  return createRound(
    rng,
    `${entry.left} is to ${entry.right} as ${entry.answer} is to ?`,
    entry.choices[0],
    entry.choices.slice(1),
  );
}

function buildVocabularyRound(rng: SeededRandom): GeneratedQuizRound {
  const mode = rng.nextInt(0, 1);
  const entry = rng.pick(VOCAB_BANK);
  const distractorWords = rng.shuffle(VOCAB_BANK.filter((candidate) => candidate.word !== entry.word));

  if (mode === 0) {
    return createRound(
      rng,
      `Which word is closest in meaning to ${entry.word}?`,
      entry.synonym,
      distractorWords.slice(0, 3).map((candidate) => candidate.synonym),
    );
  }

  return createRound(
    rng,
    `Choose the best definition of ${entry.word}.`,
    entry.definition,
    distractorWords.slice(0, 3).map((candidate) => candidate.definition),
  );
}

function createRound(rng: SeededRandom, prompt: string, answer: string, distractors: string[]): GeneratedQuizRound {
  const options = rng.shuffle([answer, ...distractors.slice(0, 3)]);
  return {
    prompt,
    options,
    correctOption: options.findIndex((option) => option === answer),
  };
}
