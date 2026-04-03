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
  { prompt: "What has hands but cannot clap?", answer: "A clock", distractors: ["A robot", "A statue", "A dealer"] },
  { prompt: "What can travel around the world while staying in one corner?", answer: "A stamp", distractors: ["A satellite", "A compass", "A shadow"] },
  { prompt: "What has one eye but cannot see?", answer: "A needle", distractors: ["A storm", "A potato", "A camera"] },
  { prompt: "What gets bigger the more you take away?", answer: "A hole", distractors: ["A mountain", "A clue", "A vault"] },
  { prompt: "What has many teeth but cannot bite?", answer: "A comb", distractors: ["A saw", "A zipper", "A key ring"] },
  { prompt: "What can you catch but not throw?", answer: "A cold", distractors: ["A train", "A fish", "A clue"] },
  { prompt: "What goes up but never comes down?", answer: "Your age", distractors: ["Steam", "The sun", "A ladder"] },
  { prompt: "What has a neck but no head?", answer: "A bottle", distractors: ["A shirt", "A guitar", "A lamp"] },
  { prompt: "What has words but never speaks?", answer: "A book", distractors: ["A radio", "A mirror", "A poster"] },
  { prompt: "What building has the most stories?", answer: "A library", distractors: ["A theater", "A hotel", "A museum"] },
  { prompt: "What can fill a room but takes up no space?", answer: "Light", distractors: ["Steam", "Music", "Fog"] },
  { prompt: "What has a thumb and four fingers but is not alive?", answer: "A glove", distractors: ["A mannequin", "A robot hand", "A statue"] },
  { prompt: "What has a head and a tail but no body?", answer: "A coin", distractors: ["A comet", "A kite", "A fish hook"] },
  { prompt: "What begins with T, ends with T, and has T in it?", answer: "A teapot", distractors: ["A tent", "A train", "A tablet"] },
  { prompt: "What runs around a yard without moving?", answer: "A fence", distractors: ["A hose", "A dog", "A mower"] },
  { prompt: "What comes once in a minute, twice in a moment, and never in a thousand years?", answer: "The letter M", distractors: ["The moon", "A breath", "A blink"] },
  { prompt: "What breaks when you say its name?", answer: "Silence", distractors: ["Glass", "A spell", "A promise"] },
  { prompt: "What has a bed but never sleeps?", answer: "A river", distractors: ["A hotel", "A cat", "A cloud"] },
  { prompt: "What has a ring but no finger?", answer: "A phone", distractors: ["A bell", "A coin", "A planet"] },
  { prompt: "What is full of holes but still holds water?", answer: "A sponge", distractors: ["A net", "A bucket", "A sieve"] },
  { prompt: "What can be cracked, made, told, and played?", answer: "A joke", distractors: ["A gem", "A rope", "A map"] },
];

const TRIVIA_PLANETS = [
  ["Which planet is known as the Red Planet?", "Mars", ["Venus", "Mercury", "Jupiter"]],
  ["Which planet is famous for its rings?", "Saturn", ["Mars", "Venus", "Mercury"]],
  ["Which planet is closest to the Sun?", "Mercury", ["Venus", "Earth", "Mars"]],
  ["Which planet is known for the Great Red Spot?", "Jupiter", ["Neptune", "Mars", "Saturn"]],
];

const TRIVIA_ARTS = [
  ["Which instrument has 88 keys?", "Piano", ["Violin", "Trumpet", "Harp"]],
  ["Which string instrument is usually played with a bow?", "Violin", ["Drum", "Flute", "Trumpet"]],
  ["Which instrument has black and white keys and pedals?", "Piano", ["Clarinet", "Harp", "Cello"]],
  ["Which instrument keeps time with sticks and cymbals?", "Drums", ["Flute", "Violin", "Tuba"]],
];

const TRIVIA_MIXES = [
  ["What color do you get by mixing blue and yellow?", "Green", ["Purple", "Orange", "Red"]],
  ["What color do you get by mixing red and blue?", "Purple", ["Green", "Orange", "Yellow"]],
  ["What color do you get by mixing red and yellow?", "Orange", ["Purple", "Green", "Blue"]],
  ["Which color is made by mixing black and white?", "Gray", ["Silver", "Brown", "Blue"]],
];

const TRIVIA_MISC = [
  ["Which ocean is the largest on Earth?", "Pacific Ocean", ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"]],
  ["How many days are in a leap year?", "366", ["365", "364", "360"]],
  ["Which shape has eight sides?", "Octagon", ["Hexagon", "Pentagon", "Decagon"]],
  ["Which holiday is celebrated on December 25?", "Christmas", ["Halloween", "Thanksgiving", "New Year's Day"]],
  ["Which game piece usually moves in an L-shape?", "Knight", ["Bishop", "Rook", "Queen"]],
  ["Which continent is the Sahara Desert mostly in?", "Africa", ["Asia", "Europe", "Australia"]],
  ["What do bees make?", "Honey", ["Maple syrup", "Wax paper", "Milk"]],
  ["Which sport uses a shuttlecock?", "Badminton", ["Tennis", "Squash", "Volleyball"]],
  ["Which month has the fewest days?", "February", ["April", "June", "September"]],
  ["Which animal is known as the king of the jungle?", "Lion", ["Tiger", "Elephant", "Leopard"]],
  ["How many continents are there?", "7", ["5", "6", "8"]],
  ["Which gas do humans breathe in to survive?", "Oxygen", ["Carbon dioxide", "Hydrogen", "Helium"]],
];

const SCIENCE_FACT_BANK: FixedQuizEntry[] = [
  { prompt: "What gas do plants absorb from the atmosphere?", answer: "Carbon dioxide", distractors: ["Oxygen", "Nitrogen", "Helium"] },
  { prompt: "How many bones does an adult human typically have?", answer: "206", distractors: ["201", "212", "198"] },
  { prompt: "Which device measures earthquakes?", answer: "Seismograph", distractors: ["Barometer", "Telescope", "Altimeter"] },
  { prompt: "What is the boiling point of water at sea level in Celsius?", answer: "100", distractors: ["90", "110", "120"] },
  { prompt: "Which blood cells carry oxygen?", answer: "Red blood cells", distractors: ["White blood cells", "Platelets", "Plasma cells"] },
  { prompt: "What force keeps planets in orbit around the sun?", answer: "Gravity", distractors: ["Magnetism", "Friction", "Static charge"] },
  { prompt: "What part of the cell contains most genetic material?", answer: "Nucleus", distractors: ["Membrane", "Ribosome", "Vacuole"] },
  { prompt: "Which organ pumps blood through the body?", answer: "Heart", distractors: ["Liver", "Lungs", "Kidney"] },
  { prompt: "What is H2O commonly called?", answer: "Water", distractors: ["Hydrogen", "Oxygen", "Salt"] },
  { prompt: "Which simple machine helps lift a bucket from a well?", answer: "Pulley", distractors: ["Wedge", "Screw", "Wheel axle"] },
  { prompt: "What kind of energy is stored in food?", answer: "Chemical energy", distractors: ["Solar energy", "Sound energy", "Nuclear energy"] },
  { prompt: "Which planet has the most prominent ring system?", answer: "Saturn", distractors: ["Mars", "Venus", "Neptune"] },
  { prompt: "What part of a plant usually absorbs water from soil?", answer: "Roots", distractors: ["Leaves", "Stem", "Petals"] },
  { prompt: "Which star is at the center of our solar system?", answer: "The Sun", distractors: ["Polaris", "Sirius", "Betelgeuse"] },
  { prompt: "What state of matter has a definite shape and volume?", answer: "Solid", distractors: ["Liquid", "Gas", "Plasma"] },
  { prompt: "Which organ helps the body exchange oxygen and carbon dioxide?", answer: "Lungs", distractors: ["Stomach", "Kidneys", "Pancreas"] },
  { prompt: "What do magnets attract?", answer: "Certain metals", distractors: ["Plastic", "Glass", "Wood"] },
  { prompt: "What is the center of an atom called?", answer: "Nucleus", distractors: ["Shell", "Proton ring", "Orbit"] },
];
const SCIENCE_ELEMENTS = [
  ["O", "Oxygen"], ["H", "Hydrogen"], ["N", "Nitrogen"], ["Fe", "Iron"], ["Na", "Sodium"],
  ["K", "Potassium"], ["Ca", "Calcium"], ["Au", "Gold"], ["Ag", "Silver"], ["He", "Helium"],
  ["Ne", "Neon"], ["Cu", "Copper"],
];

const SCIENCE_BODY_SYSTEMS = [
  ["heart", "circulatory system"],
  ["lungs", "respiratory system"],
  ["brain", "nervous system"],
  ["stomach", "digestive system"],
  ["bones", "skeletal system"],
  ["muscles", "muscular system"],
  ["kidneys", "urinary system"],
  ["skin", "integumentary system"],
];

const SCIENCE_STATES = [
  ["ice", "solid"],
  ["steam", "gas"],
  ["lava", "liquid"],
  ["fog", "gas"],
  ["granite", "solid"],
  ["mercury at room temperature", "liquid"],
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
  { word: "steady", synonym: "stable", definition: "firmly fixed, supported, or consistent" },
  { word: "nimble", synonym: "agile", definition: "quick and light in movement or action" },
  { word: "ancient", synonym: "very old", definition: "belonging to the distant past" },
  { word: "curious", synonym: "eager to know", definition: "wanting to learn or understand more" },
  { word: "fierce", synonym: "intense", definition: "strong, aggressive, or powerful in energy" },
  { word: "luminous", synonym: "glowing", definition: "giving off or reflecting bright light" },
  { word: "careful", synonym: "cautious", definition: "taking pains to avoid mistakes or harm" },
  { word: "massive", synonym: "huge", definition: "very large and heavy or solid" },
  { word: "brief", synonym: "short", definition: "lasting only a little time" },
  { word: "vital", synonym: "essential", definition: "absolutely necessary or important" },
];

const ANALOGY_BANK = [
  { prompt: "Knight is to chess as king is to ?", answer: "checkers", distractors: ["cards", "board", "crown"] },
  { prompt: "Puzzle is to solve as race is to ?", answer: "win", distractors: ["sprint", "track", "start"] },
  { prompt: "Seed is to tree as clue is to ?", answer: "answer", distractors: ["timer", "question", "penalty"] },
  { prompt: "Brush is to paint as keyboard is to ?", answer: "type", distractors: ["erase", "sleep", "fold"] },
  { prompt: "Map is to navigate as recipe is to ?", answer: "cook", distractors: ["paint", "measure", "repair"] },
  { prompt: "Coach is to team as teacher is to ?", answer: "class", distractors: ["grade", "desk", "bell"] },
  { prompt: "Battery is to power as lungs are to ?", answer: "breathing", distractors: ["thinking", "hearing", "balance"] },
  { prompt: "Compass is to direction as clock is to ?", answer: "time", distractors: ["speed", "distance", "weather"] },
  { prompt: "Helmet is to safety as bookmark is to ?", answer: "placekeeping", distractors: ["decoration", "drawing", "typing"] },
  { prompt: "Painter is to canvas as coder is to ?", answer: "editor", distractors: ["ladder", "helmet", "stadium"] },
  { prompt: "Rook is to file as bishop is to ?", answer: "diagonal", distractors: ["circle", "column", "fork"] },
  { prompt: "Thermometer is to temperature as scale is to ?", answer: "weight", distractors: ["volume", "height", "speed"] },
];

const CHESS_BANK: FixedQuizEntry[] = [
  { prompt: "White to move: your queen and bishop line up on the king. Find the forcing tactic.", answer: "Qg7#", distractors: ["Bxh7+", "Qd8+", "Re8+"] },
  { prompt: "Black to move: win material with a fork.", answer: "Nd3+", distractors: ["Qh2+", "Rc1+", "Bf2+"] },
  { prompt: "White to move: convert the back-rank weakness immediately.", answer: "Re8+", distractors: ["Qh7+", "Bb5+", "Nd6+"] },
  { prompt: "White to move: exploit the pinned knight first.", answer: "Bxf7+", distractors: ["Qd5", "Nh4", "a4"] },
  { prompt: "Black to move: remove the defender and open the king.", answer: "Bxh2+", distractors: ["Qg5", "Rc8", "a5"] },
  { prompt: "White to move: a discovered attack wins the queen. Start with?", answer: "Nd5", distractors: ["Qc2", "Re1", "h4"] },
  { prompt: "Black to move: a skewer on the open file wins material. Which move starts it?", answer: "Rc1+", distractors: ["Qg5", "Bb4", "a6"] },
  { prompt: "White to move: force the king onto a mating square with the first check.", answer: "Qh7+", distractors: ["Re1", "Nd5", "a3"] },
  { prompt: "Black to move: the knight jump forks king and queen. Which move lands it?", answer: "Nc2+", distractors: ["Ne2+", "Qa5+", "Rf2+"] },
  { prompt: "White to move: deflect the rook defender before the final strike. What starts it?", answer: "Qxd7+", distractors: ["Re7", "Bh6", "Nc6"] },
];

const CHECKERS_BANK: FixedQuizEntry[] = [
  { prompt: "Your red piece can force a double jump. Which landing square starts it?", answer: "D6", distractors: ["B6", "F6", "H6"] },
  { prompt: "Black to move: preserve tempo and threaten promotion.", answer: "G5", distractors: ["C3", "E5", "B4"] },
  { prompt: "Red to move: take the only capture that keeps king pressure.", answer: "C5", distractors: ["A5", "E3", "G3"] },
  { prompt: "Black to move: force the trade that opens your promotion lane.", answer: "F4", distractors: ["B6", "D2", "H4"] },
  { prompt: "Red to move: which jump keeps your back row intact?", answer: "E5", distractors: ["A3", "C7", "G5"] },
  { prompt: "Black to move: set up a king trap on the next turn.", answer: "D4", distractors: ["B2", "F6", "H2"] },
  { prompt: "Red to move: open the longest forcing jump lane. Which landing square starts it?", answer: "B4", distractors: ["D2", "F4", "H6"] },
  { prompt: "Black to move: cash in the edge capture before it escapes. Which square do you land on?", answer: "E3", distractors: ["C5", "G5", "A3"] },
  { prompt: "Red to move: choose the jump that keeps your king lane alive.", answer: "F6", distractors: ["B6", "D4", "H4"] },
  { prompt: "Black to move: force the recapture so your next piece queens. Which square starts it?", answer: "C3", distractors: ["E5", "G3", "A5"] },
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
  { prompt: "King activity in rook endings usually means your king should head toward?", answer: "The center and pawns", distractors: ["The corner only", "Your own back rank", "The enemy rook file only"] },
  { prompt: "If the defending king is cut off by one file, the attacking side often wants to?", answer: "Bring the king closer", distractors: ["Trade the rook immediately", "Push all pawns blindly", "Repeat checks forever"] },
  { prompt: "In king and pawn endings, what key square concept tells you whether a lone king can stop the pawn?", answer: "The square of the pawn", distractors: ["The color complex", "The bishop pair", "The rook file"] },
  { prompt: "When two passed pawns race, what should you compare before pushing?", answer: "Who queens with tempo", distractors: ["Which pawn is prettier", "Whose rook moved first", "The opening variation"] },
];

const CHESS_OPENING_BANK: FixedQuizEntry[] = [
  { prompt: "After 1.e4 e5 2.Nf3 Nc6, what is a classical developing move for White?", answer: "Bb5", distractors: ["h4", "Qh5", "a3"] },
  { prompt: "What is the main purpose of castling early in the opening?", answer: "King safety and rook activity", distractors: ["Win a pawn", "Develop the queen", "Threaten mate immediately"] },
  { prompt: "In many openings, why fight for the center?", answer: "It gives pieces more influence", distractors: ["It makes bishops weaker", "It avoids development", "It locks your king in place"] },
  { prompt: "Which is usually better in the opening: moving one piece three times or developing a new piece?", answer: "Developing a new piece", distractors: ["Moving one piece three times", "Early king walk", "Rook pawn push"] },
  { prompt: "What does development usually mean?", answer: "Bringing pieces to active squares", distractors: ["Trading queens early", "Moving only pawns", "Forcing a draw"] },
  { prompt: "Before launching an attack, what opening goal should you usually complete?", answer: "King safety", distractors: ["Pawn storms only", "Edge pawn pushes", "Rook sacrifices"] },
  { prompt: "When both bishops and knights are undeveloped, what is usually best?", answer: "Develop minor pieces before the queen", distractors: ["Launch a rook pawn", "Walk the king", "Trade your best bishop"] },
  { prompt: "Why is grabbing a poisoned wing pawn risky in the opening?", answer: "You can fall behind in development", distractors: ["It castles your king", "It guarantees a draw", "It removes central tension"] },
  { prompt: "In open positions, which piece pair usually improves fastest with active development?", answer: "Bishops", distractors: ["Kings", "Edge pawns", "Only rooks"] },
  { prompt: "If your opponent ignores development and hunts pawns, your practical reply is usually to?", answer: "Develop with tempo", distractors: ["Copy the greed", "Retreat every piece", "Trade queens immediately"] },
];

const CHESS_MATE_NET_BANK: FixedQuizEntry[] = [
  { prompt: "Your queen and rook align on the back rank. What kind of move often starts the mate net?", answer: "Forcing check", distractors: ["Random pawn push", "Quiet luft move", "Knight retreat"] },
  { prompt: "A boxed king with no escape squares is most vulnerable to?", answer: "A discovered check", distractors: ["A perpetual shuffle", "Trading queens", "Opposite-side castling"] },
  { prompt: "When your bishop covers the escape square, what should your heavy piece look for?", answer: "A checking line", distractors: ["A fork", "A retreat square", "A pawn trade"] },
  { prompt: "The easiest mate nets usually begin by taking away what?", answer: "Escape squares", distractors: ["Material only", "Center pawns", "Opening theory"] },
  { prompt: "If the king has one safe square left, your next move should try to?", answer: "Cover that square with tempo", distractors: ["Trade all pieces", "Push a rook pawn", "Force repetition"] },
  { prompt: "A mating net is strongest when your attack is?", answer: "Forcing and coordinated", distractors: ["Slow and random", "Material-only", "Passive"] },
  { prompt: "If your queen gives check and the king only has one file left, what matters next?", answer: "Closing the final file", distractors: ["Trading rooks", "Opening the center", "Retreating the bishop"] },
  { prompt: "Why is a rook on the seventh rank dangerous in mating attacks?", answer: "It cuts escape lanes", distractors: ["It blocks your queen", "It forces stalemate", "It weakens your king"] },
  { prompt: "When both rooks and queen attack the king box, your first priority is usually to?", answer: "Keep checks forcing", distractors: ["Cash in pawns", "Retreat to defend", "Trade queens"] },
  { prompt: "A classic mating net often succeeds because the defender cannot do what?", answer: "Create luft in time", distractors: ["Develop a bishop", "Win a pawn", "Trade a knight"] },
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
  const totalRounds = 10;

  switch (kind) {
    case "riddle_choice":
      return buildFixedRounds(rng, totalRounds, RIDDLE_BANK);
    case "chess_tactic":
      return buildFixedRounds(rng, totalRounds, CHESS_BANK);
    case "checkers_tactic":
      return buildFixedRounds(rng, totalRounds, CHECKERS_BANK);
    case "trivia_blitz":
      return buildUniqueRounds(rng, totalRounds, () => buildTriviaRound(rng));
    case "science_quiz":
      return buildUniqueRounds(rng, totalRounds, () => buildScienceRound(rng));
    case "deduction_grid":
      return buildFixedRounds(rng, totalRounds, DEDUCTION_BANK);
    case "chess_endgame":
      return buildFixedRounds(rng, totalRounds, CHESS_ENDGAME_BANK);
    case "chess_opening":
      return buildFixedRounds(rng, totalRounds, CHESS_OPENING_BANK);
    case "chess_mate_net":
      return buildFixedRounds(rng, totalRounds, CHESS_MATE_NET_BANK);
    case "geography_quiz":
      return buildUniqueRounds(rng, totalRounds, () => buildGeographyRound(rng));
    case "logic_sequence":
      return buildUniqueRounds(rng, totalRounds, () => buildLogicSequenceRound(rng));
    case "math_race":
      return buildUniqueRounds(rng, totalRounds, () => buildMathRound(rng));
    case "code_breaker":
      return buildUniqueRounds(rng, totalRounds, () => buildCodeBreakerRound(rng));
    case "analogies":
      return buildUniqueRounds(rng, totalRounds, () => buildAnalogyRound(rng));
    case "vocabulary_duel":
      return buildUniqueRounds(rng, totalRounds, () => buildVocabularyRound(rng));
  }
}

function buildFixedRounds(rng: SeededRandom, totalRounds: number, bank: FixedQuizEntry[]): GeneratedQuizRound[] {
  return rng.shuffle(bank).slice(0, totalRounds).map((entry) => createRound(rng, entry.prompt, entry.answer, entry.distractors));
}

function buildUniqueRounds(rng: SeededRandom, totalRounds: number, builder: () => GeneratedQuizRound): GeneratedQuizRound[] {
  const seenPrompts = new Set<string>();
  const rounds: GeneratedQuizRound[] = [];
  let attempts = 0;

  while (rounds.length < totalRounds && attempts < totalRounds * 30) {
    attempts += 1;
    const round = builder();
    if (seenPrompts.has(round.prompt)) continue;
    seenPrompts.add(round.prompt);
    rounds.push(round);
  }

  return rounds;
}

function buildTriviaRound(rng: SeededRandom): GeneratedQuizRound {
  const mode = rng.nextInt(0, 5);

  if (mode === 0) {
    const [prompt, answer, distractors] = rng.pick(TRIVIA_PLANETS);
    return createRound(rng, prompt, answer, distractors);
  }

  if (mode === 1) {
    const [prompt, answer, distractors] = rng.pick(TRIVIA_ARTS);
    return createRound(rng, prompt, answer, distractors);
  }

  if (mode === 2) {
    const [prompt, answer, distractors] = rng.pick(TRIVIA_MIXES);
    return createRound(rng, prompt, answer, distractors);
  }

  if (mode === 3) {
    const [prompt, answer, distractors] = rng.pick(TRIVIA_MISC);
    return createRound(rng, prompt, answer, distractors);
  }

  if (mode === 4) {
    const [country, capital] = rng.pick(CAPITALS);
    const distractors = rng.shuffle(CAPITALS.filter((entry) => entry[0] !== country).map((entry) => entry[1])).slice(0, 3);
    return createRound(rng, `Which capital belongs to ${country}?`, capital, distractors);
  }

  const [country, landmark] = rng.pick(LANDMARKS);
  const distractors = rng.shuffle(LANDMARKS.filter((entry) => entry[0] !== country).map((entry) => entry[0])).slice(0, 3);
  return createRound(rng, `${landmark} is found in which country?`, country, distractors);
}

function buildScienceRound(rng: SeededRandom): GeneratedQuizRound {
  const mode = rng.nextInt(0, 3);

  if (mode === 0) {
    return buildFixedRounds(rng, 1, SCIENCE_FACT_BANK)[0];
  }

  if (mode === 1) {
    const [symbol, name] = rng.pick(SCIENCE_ELEMENTS);
    const distractors = rng.shuffle(SCIENCE_ELEMENTS.filter((entry) => entry[1] !== name).map((entry) => entry[1])).slice(0, 3);
    return createRound(rng, `Which element uses the symbol ${symbol}?`, name, distractors);
  }

  if (mode === 2) {
    const [part, system] = rng.pick(SCIENCE_BODY_SYSTEMS);
    const distractors = rng.shuffle(SCIENCE_BODY_SYSTEMS.filter((entry) => entry[1] !== system).map((entry) => entry[1])).slice(0, 3);
    return createRound(rng, `${part.charAt(0).toUpperCase()}${part.slice(1)} belong to which body system?`, system, distractors);
  }

  const [example, state] = rng.pick(SCIENCE_STATES);
  const distractors = rng.shuffle(SCIENCE_STATES.filter((entry) => entry[1] !== state).map((entry) => entry[1])).filter((value, index, values) => values.indexOf(value) === index).slice(0, 3);
  return createRound(rng, `What state of matter is ${example}?`, state, distractors);
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
    return createRound(rng, `What comes next: ${values.join(", ")}, ?`, answer, [String(Number(answer) + step), String(Number(answer) - step), String(Number(answer) + step * 2)]);
  }

  if (mode === 1) {
    const base = rng.nextInt(2, 5);
    const values = Array.from({ length: 5 }, (_, index) => base ** (index + 1));
    const answer = String(base ** 6);
    return createRound(rng, `Continue the pattern: ${values.join(", ")}, ?`, answer, [String(base ** 5), String(base ** 6 + base), String(base ** 6 - base)]);
  }

  const symbols = ["circle", "triangle", "square", "diamond", "star"];
  const cycle = rng.shuffle(symbols).slice(0, 3);
  const values = Array.from({ length: 5 }, (_, index) => cycle[index % cycle.length]);
  const answer = cycle[5 % cycle.length];
  return createRound(rng, `Which symbol comes next: ${values.join(", ")}, ?`, answer, rng.shuffle(symbols.filter((symbol) => symbol !== answer)).slice(0, 3));
}

function buildMathRound(rng: SeededRandom): GeneratedQuizRound {
  const mode = rng.nextInt(0, 2);

  if (mode === 0) {
    const left = rng.nextInt(12, 48);
    const right = rng.nextInt(3, 12);
    const answer = left * right;
    return createRound(rng, `What is ${left} x ${right}?`, String(answer), [String(answer + right), String(answer - right), String(answer + left)]);
  }

  if (mode === 1) {
    const divisor = rng.nextInt(3, 12);
    const quotient = rng.nextInt(8, 24);
    const offset = rng.nextInt(4, 16);
    const answer = quotient + offset;
    return createRound(rng, `Solve: ${divisor * quotient} / ${divisor} + ${offset}`, String(answer), [String(answer - 1), String(answer + 1), String(answer + divisor)]);
  }

  const sideA = rng.nextInt(4, 16);
  const sideB = rng.nextInt(4, 16);
  const answer = 2 * (sideA + sideB);
  return createRound(rng, `What is the perimeter of a rectangle with sides ${sideA} and ${sideB}?`, String(answer), [String(answer + 2), String(answer - 2), String(sideA * sideB)]);
}

function buildCodeBreakerRound(rng: SeededRandom): GeneratedQuizRound {
  const mode = rng.nextInt(0, 2);

  if (mode === 0) {
    const start = rng.nextInt(0, 3) * 2;
    const digits = Array.from({ length: 4 }, (_, index) => start + index * 2).join("");
    return createRound(rng, "A lock code uses ascending even digits. Which code fits the rule?", digits, [digits.split("").reverse().join(""), "1357", "2486"]);
  }

  if (mode === 1) {
    const letters = ["A", "B", "C", "D", "E", "F"];
    const first = rng.pick(letters);
    const second = rng.pick(letters.filter((letter) => letter !== first));
    const left = rng.nextInt(1, 7);
    const right = rng.nextInt(1, 7);
    const answer = `${first}${second}${left}${right}`;
    return createRound(rng, "Which code follows the pattern: two letters followed by two digits?", answer, [`${first}${left}${second}${right}`, `${left}${right}${first}${second}`, `${first}${second}${right}`]);
  }

  const correct = `${rng.pick(["2468", "8642", "3579", "9753"])}`;
  const reversed = correct.split("").reverse().join("");
  const odd = "1357";
  return createRound(rng, "Choose the code that stays in strict ascending order.", correct[0] < correct[correct.length - 1] ? correct : reversed, [correct[0] < correct[correct.length - 1] ? reversed : correct, odd, "2486"]);
}

function buildAnalogyRound(rng: SeededRandom): GeneratedQuizRound {
  const entry = rng.pick(ANALOGY_BANK);
  return createRound(rng, entry.prompt, entry.answer, entry.distractors);
}

function buildVocabularyRound(rng: SeededRandom): GeneratedQuizRound {
  const mode = rng.nextInt(0, 1);
  const entry = rng.pick(VOCAB_BANK);
  const distractorWords = rng.shuffle(VOCAB_BANK.filter((candidate) => candidate.word !== entry.word));

  if (mode === 0) {
    return createRound(rng, `Which word is closest in meaning to ${entry.word}?`, entry.synonym, distractorWords.slice(0, 3).map((candidate) => candidate.synonym));
  }

  return createRound(rng, `Choose the best definition of ${entry.word}.`, entry.definition, distractorWords.slice(0, 3).map((candidate) => candidate.definition));
}

function createRound(rng: SeededRandom, prompt: string, answer: string, distractors: string[]): GeneratedQuizRound {
  const options = rng.shuffle([answer, ...distractors.slice(0, 3)]);
  return {
    prompt,
    options,
    correctOption: options.findIndex((option) => option === answer),
  };
}



