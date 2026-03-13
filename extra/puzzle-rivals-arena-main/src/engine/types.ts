export type PuzzleId = 'rotate-pipes' | 'number-grid' | 'pattern-match' | 'word-scramble' | 'tile-sliding' | 'sudoku-mini';

export type GamePhase = 'idle' | 'matchmaking' | 'lobby' | 'announcement' | 'practice' | 'live' | 'results';

export interface PuzzleStats {
  played: number;
  wins: number;
  avgTime: number;
  bestTime: number;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  avatarFrame: string;
  rating: number;
  coins: number;
  xp: number;
  level: number;
  rank: string;
  puzzleStats: Record<PuzzleId, PuzzleStats>;
  friends: string[];
  clan: string;
  battlePassLevel: number;
  isVip: boolean;
  theme: string;
}

export interface PuzzleConfig {
  id: PuzzleId;
  name: string;
  icon: string;
  description: string;
  tutorialText: string;
  timeLimit: number;
}

export interface MatchPlayer {
  profile: PlayerProfile;
  isReady: boolean;
  progress: number;
  finishTime: number | null;
  score: number;
  isAI: boolean;
}

export interface MatchResult {
  playerId: string;
  playerName: string;
  rank: number;
  score: number;
  time: number;
  rewards: { coins: number; xp: number; ratingChange: number };
}

export interface MatchState {
  phase: GamePhase;
  puzzleId: PuzzleId | null;
  lobbyCode: string;
  players: MatchPlayer[];
  timeRemaining: number;
  results: MatchResult[];
  isRevenge: boolean;
  revengeMessage: string;
}

export const PUZZLE_CONFIGS: Record<PuzzleId, PuzzleConfig> = {
  'rotate-pipes': {
    id: 'rotate-pipes',
    name: 'Rotate Pipes',
    icon: '🔧',
    description: 'Connect source to drain by rotating pipe tiles',
    tutorialText: 'Tap pipes to rotate them 90°. Connect the green source to the red drain!',
    timeLimit: 90,
  },
  'number-grid': {
    id: 'number-grid',
    name: 'Number Grid',
    icon: '🔢',
    description: 'Fill the grid so rows and columns hit the target sums',
    tutorialText: 'Fill empty cells with numbers 1-9. Each row and column must match the target sum!',
    timeLimit: 60,
  },
  'pattern-match': {
    id: 'pattern-match',
    name: 'Pattern Match',
    icon: '🎯',
    description: 'Find the matching pattern from the choices',
    tutorialText: 'Study the pattern. Pick the correct piece that completes it!',
    timeLimit: 45,
  },
  'word-scramble': {
    id: 'word-scramble',
    name: 'Word Scramble',
    icon: '🔤',
    description: 'Unscramble the letters to form a valid word',
    tutorialText: 'Tap letters in order to spell the word. Tap placed letters to remove them!',
    timeLimit: 60,
  },
  'tile-sliding': {
    id: 'tile-sliding',
    name: 'Tile Slide',
    icon: '🧩',
    description: 'Slide tiles into the correct order',
    tutorialText: 'Tap a tile next to the empty space to slide it. Arrange numbers 1-8 in order!',
    timeLimit: 90,
  },
  'sudoku-mini': {
    id: 'sudoku-mini',
    name: 'Mini Sudoku',
    icon: '📐',
    description: 'Complete the 4×4 Sudoku grid',
    tutorialText: 'Fill cells with 1-4. Each row, column, and 2×2 box must contain 1-4 exactly once!',
    timeLimit: 75,
  },
};

export const ALL_PUZZLE_IDS: PuzzleId[] = [
  'rotate-pipes', 'number-grid', 'pattern-match',
  'word-scramble', 'tile-sliding', 'sudoku-mini',
];

export function createDefaultStats(): Record<PuzzleId, PuzzleStats> {
  const stats = {} as Record<PuzzleId, PuzzleStats>;
  for (const id of ALL_PUZZLE_IDS) {
    stats[id] = { played: 0, wins: 0, avgTime: 0, bestTime: 0 };
  }
  return stats;
}

export function getRankFromRating(rating: number): string {
  if (rating >= 2000) return 'Grandmaster';
  if (rating >= 1600) return 'Diamond';
  if (rating >= 1300) return 'Platinum';
  if (rating >= 1000) return 'Gold';
  if (rating >= 700) return 'Silver';
  return 'Bronze';
}

export function getLevelFromXp(xp: number): number {
  return Math.floor(xp / 500) + 1;
}
