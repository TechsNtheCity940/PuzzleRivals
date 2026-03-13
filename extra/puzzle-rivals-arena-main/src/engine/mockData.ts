import { PlayerProfile, PuzzleId, PuzzleStats, createDefaultStats } from './types';

function mockStats(overrides?: Partial<Record<PuzzleId, Partial<PuzzleStats>>>): Record<PuzzleId, PuzzleStats> {
  const stats = createDefaultStats();
  if (overrides) {
    for (const [id, o] of Object.entries(overrides)) {
      stats[id as PuzzleId] = { ...stats[id as PuzzleId], ...o };
    }
  }
  return stats;
}

export const SAMPLE_PLAYERS: PlayerProfile[] = [
  {
    id: 'bot-1', name: 'NeonNinja', avatar: '🥷', avatarFrame: 'cyber',
    rating: 1450, coins: 3200, xp: 8500, level: 18, rank: 'Platinum',
    puzzleStats: mockStats({ 'rotate-pipes': { played: 45, wins: 30, avgTime: 28, bestTime: 15 }, 'word-scramble': { played: 30, wins: 10, avgTime: 42, bestTime: 25 } }),
    friends: [], clan: 'CyberSquad', battlePassLevel: 12, isVip: false, theme: 'cyber',
  },
  {
    id: 'bot-2', name: 'PuzzleQueen', avatar: '👑', avatarFrame: 'gold',
    rating: 1680, coins: 5100, xp: 12000, level: 25, rank: 'Diamond',
    puzzleStats: mockStats({ 'sudoku-mini': { played: 80, wins: 65, avgTime: 20, bestTime: 11 }, 'tile-sliding': { played: 20, wins: 5, avgTime: 55, bestTime: 40 } }),
    friends: [], clan: 'BrainStorm', battlePassLevel: 22, isVip: true, theme: 'fantasy',
  },
  {
    id: 'bot-3', name: 'SpeedDemon', avatar: '⚡', avatarFrame: 'neon',
    rating: 1320, coins: 2800, xp: 6200, level: 13, rank: 'Platinum',
    puzzleStats: mockStats({ 'pattern-match': { played: 55, wins: 40, avgTime: 12, bestTime: 5 }, 'number-grid': { played: 15, wins: 3, avgTime: 50, bestTime: 38 } }),
    friends: [], clan: 'FlashMob', battlePassLevel: 8, isVip: false, theme: 'neon',
  },
  {
    id: 'bot-4', name: 'BrainFrost', avatar: '🧊', avatarFrame: 'default',
    rating: 980, coins: 1500, xp: 3800, level: 8, rank: 'Gold',
    puzzleStats: mockStats({ 'number-grid': { played: 35, wins: 22, avgTime: 30, bestTime: 18 } }),
    friends: [], clan: 'Chillers', battlePassLevel: 5, isVip: false, theme: 'default',
  },
  {
    id: 'bot-5', name: 'PixelWolf', avatar: '🐺', avatarFrame: 'cyber',
    rating: 1120, coins: 2200, xp: 5000, level: 11, rank: 'Gold',
    puzzleStats: mockStats({ 'word-scramble': { played: 40, wins: 28, avgTime: 25, bestTime: 14 }, 'rotate-pipes': { played: 10, wins: 2, avgTime: 60, bestTime: 45 } }),
    friends: [], clan: 'PackAttack', battlePassLevel: 9, isVip: false, theme: 'neon',
  },
  {
    id: 'bot-6', name: 'ZenMaster', avatar: '🧘', avatarFrame: 'gold',
    rating: 1900, coins: 8000, xp: 18000, level: 37, rank: 'Diamond',
    puzzleStats: mockStats({
      'rotate-pipes': { played: 100, wins: 85, avgTime: 18, bestTime: 9 },
      'sudoku-mini': { played: 90, wins: 78, avgTime: 16, bestTime: 8 },
      'pattern-match': { played: 95, wins: 80, avgTime: 8, bestTime: 3 },
    }),
    friends: [], clan: 'BrainStorm', battlePassLevel: 30, isVip: true, theme: 'fantasy',
  },
];

export const MOCK_LEADERBOARD = SAMPLE_PLAYERS
  .sort((a, b) => b.rating - a.rating)
  .map((p, i) => ({ ...p, leaderboardRank: i + 1 }));

export function getRandomOpponent(): PlayerProfile {
  return SAMPLE_PLAYERS[Math.floor(Math.random() * SAMPLE_PLAYERS.length)];
}

export function generateLobbyCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
