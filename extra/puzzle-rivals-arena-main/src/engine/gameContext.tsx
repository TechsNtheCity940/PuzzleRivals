import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  PlayerProfile, MatchState, MatchPlayer, MatchResult, GamePhase,
  PuzzleId, ALL_PUZZLE_IDS, PUZZLE_CONFIGS, createDefaultStats,
  getRankFromRating, getLevelFromXp,
} from './types';
import { getRandomOpponent, generateLobbyCode } from './mockData';

function loadPlayer(): PlayerProfile {
  try {
    const saved = localStorage.getItem('puzzle-rivals-player');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    id: 'player-1',
    name: 'You',
    avatar: '😎',
    avatarFrame: 'default',
    rating: 1000,
    coins: 500,
    xp: 0,
    level: 1,
    rank: 'Gold',
    puzzleStats: createDefaultStats(),
    friends: ['bot-1', 'bot-3'],
    clan: 'Newcomers',
    battlePassLevel: 1,
    isVip: false,
    theme: 'default',
  };
}

function savePlayer(p: PlayerProfile) {
  localStorage.setItem('puzzle-rivals-player', JSON.stringify(p));
}

const initialMatch: MatchState = {
  phase: 'idle',
  puzzleId: null,
  lobbyCode: '',
  players: [],
  timeRemaining: 0,
  results: [],
  isRevenge: false,
  revengeMessage: '',
};

interface GameContextType {
  player: PlayerProfile;
  match: MatchState;
  updatePlayer: (u: Partial<PlayerProfile>) => void;
  startQuickMatch: () => void;
  createRoom: () => string;
  joinRoom: (code: string) => void;
  setReady: () => void;
  proceedToAnnouncement: () => void;
  proceedToPractice: () => void;
  proceedToLive: () => void;
  reportSolved: (timeMs: number) => void;
  requestRevenge: () => void;
  goHome: () => void;
  setPhase: (p: GamePhase) => void;
  updateOpponentProgress: (progress: number) => void;
}

const GameContext = createContext<GameContextType>(null!);

export const useGame = () => useContext(GameContext);

function selectPuzzleForRevenge(player: PlayerProfile, opponent: PlayerProfile): { puzzleId: PuzzleId; message: string } {
  const scores: { id: PuzzleId; weakness: number }[] = ALL_PUZZLE_IDS.map(id => {
    const ps = player.puzzleStats[id];
    const os = opponent.puzzleStats[id];
    const playerWeak = ps.played > 0 ? (1 - ps.wins / ps.played) + ps.avgTime / 60 : 1.5;
    const opponentWeak = os.played > 0 ? (1 - os.wins / os.played) + os.avgTime / 60 : 1.5;
    return { id, weakness: playerWeak + opponentWeak };
  });
  scores.sort((a, b) => b.weakness - a.weakness);
  const chosen = scores[0];
  return {
    puzzleId: chosen.id,
    message: `Revenge mode: challenge based on both players' weak spots — ${PUZZLE_CONFIGS[chosen.id].name}!`,
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayer] = useState<PlayerProfile>(loadPlayer);
  const [match, setMatch] = useState<MatchState>(initialMatch);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const aiTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { savePlayer(player); }, [player]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  const updatePlayer = useCallback((u: Partial<PlayerProfile>) => {
    setPlayer(prev => {
      const updated = { ...prev, ...u };
      updated.level = getLevelFromXp(updated.xp);
      updated.rank = getRankFromRating(updated.rating);
      return updated;
    });
  }, []);

  const makeMatchPlayer = useCallback((profile: PlayerProfile, isAI: boolean): MatchPlayer => ({
    profile, isReady: isAI, progress: 0, finishTime: null, score: 0, isAI,
  }), []);

  const startQuickMatch = useCallback(() => {
    const opponent = getRandomOpponent();
    setMatch({
      ...initialMatch,
      phase: 'lobby',
      lobbyCode: generateLobbyCode(),
      players: [makeMatchPlayer(player, false), makeMatchPlayer(opponent, true)],
    });
  }, [player, makeMatchPlayer]);

  const createRoom = useCallback(() => {
    const code = generateLobbyCode();
    const opponent = getRandomOpponent();
    setMatch({
      ...initialMatch,
      phase: 'lobby',
      lobbyCode: code,
      players: [makeMatchPlayer(player, false), makeMatchPlayer(opponent, true)],
    });
    return code;
  }, [player, makeMatchPlayer]);

  const joinRoom = useCallback((_code: string) => {
    const opponent = getRandomOpponent();
    setMatch({
      ...initialMatch,
      phase: 'lobby',
      lobbyCode: _code,
      players: [makeMatchPlayer(player, false), makeMatchPlayer(opponent, true)],
    });
  }, [player, makeMatchPlayer]);

  const setReady = useCallback(() => {
    setMatch(prev => ({
      ...prev,
      players: prev.players.map((p, i) => i === 0 ? { ...p, isReady: true } : p),
    }));
  }, []);

  const proceedToAnnouncement = useCallback(() => {
    const puzzleId = ALL_PUZZLE_IDS[Math.floor(Math.random() * ALL_PUZZLE_IDS.length)];
    setMatch(prev => ({ ...prev, phase: 'announcement', puzzleId }));
  }, []);

  const proceedToPractice = useCallback(() => {
    setMatch(prev => ({ ...prev, phase: 'practice', timeRemaining: 10 }));
  }, []);

  const proceedToLive = useCallback(() => {
    const timeLimit = match.puzzleId ? PUZZLE_CONFIGS[match.puzzleId].timeLimit : 60;
    setMatch(prev => ({ ...prev, phase: 'live', timeRemaining: timeLimit }));

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setMatch(prev => {
        if (prev.phase !== 'live') { clearInterval(timerRef.current); return prev; }
        const t = prev.timeRemaining - 1;
        if (t <= 0) {
          clearInterval(timerRef.current);
          return { ...prev, timeRemaining: 0, phase: 'results' };
        }
        return { ...prev, timeRemaining: t };
      });
    }, 1000);

    // AI opponent finishes at random time
    const aiTime = (Math.random() * 0.6 + 0.3) * (match.puzzleId ? PUZZLE_CONFIGS[match.puzzleId].timeLimit : 60) * 1000;
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = setTimeout(() => {
      setMatch(prev => {
        if (prev.phase !== 'live') return prev;
        return {
          ...prev,
          players: prev.players.map(p => p.isAI ? { ...p, progress: 100, finishTime: aiTime, score: 1000 } : p),
        };
      });
    }, aiTime);

    // AI progress simulation
    const progressInterval = setInterval(() => {
      setMatch(prev => {
        if (prev.phase !== 'live') { clearInterval(progressInterval); return prev; }
        const aiPlayer = prev.players.find(p => p.isAI);
        if (aiPlayer && aiPlayer.progress >= 100) { clearInterval(progressInterval); return prev; }
        return {
          ...prev,
          players: prev.players.map(p =>
            p.isAI && p.progress < 100 ? { ...p, progress: Math.min(100, p.progress + Math.random() * 5) } : p
          ),
        };
      });
    }, 500);
  }, [match.puzzleId]);

  const reportSolved = useCallback((timeMs: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const score = Math.max(100, Math.round(1000 - timeMs / 100));
    const ai = match.players.find(p => p.isAI);
    const playerWon = !ai?.finishTime || timeMs < ai.finishTime;
    const rewards = {
      coins: playerWon ? 100 : 30,
      xp: playerWon ? 50 : 15,
      ratingChange: playerWon ? 25 : -10,
    };
    const results: MatchResult[] = [
      { playerId: player.id, playerName: player.name, rank: playerWon ? 1 : 2, score, time: timeMs, rewards },
      {
        playerId: ai?.profile.id || 'bot', playerName: ai?.profile.name || 'Bot',
        rank: playerWon ? 2 : 1, score: ai?.score || 0, time: ai?.finishTime || 999999,
        rewards: { coins: 0, xp: 0, ratingChange: 0 },
      },
    ].sort((a, b) => a.rank - b.rank);

    updatePlayer({
      coins: player.coins + rewards.coins,
      xp: player.xp + rewards.xp,
      rating: Math.max(0, player.rating + rewards.ratingChange),
    });

    setMatch(prev => ({
      ...prev,
      phase: 'results',
      players: prev.players.map(p => !p.isAI ? { ...p, progress: 100, finishTime: timeMs, score } : p),
      results,
    }));
  }, [match.players, player, updatePlayer]);

  const requestRevenge = useCallback(() => {
    const opponent = match.players.find(p => p.isAI);
    if (!opponent) return;
    const { puzzleId, message } = selectPuzzleForRevenge(player, opponent.profile);
    setMatch({
      ...initialMatch,
      phase: 'announcement',
      puzzleId,
      lobbyCode: generateLobbyCode(),
      players: [makeMatchPlayer(player, false), makeMatchPlayer(opponent.profile, true)],
      isRevenge: true,
      revengeMessage: message,
    });
  }, [match.players, player, makeMatchPlayer]);

  const goHome = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setMatch(initialMatch);
  }, []);

  const setPhase = useCallback((p: GamePhase) => {
    setMatch(prev => ({ ...prev, phase: p }));
  }, []);

  const updateOpponentProgress = useCallback((progress: number) => {
    setMatch(prev => ({
      ...prev,
      players: prev.players.map(p => p.isAI ? { ...p, progress } : p),
    }));
  }, []);

  return (
    <GameContext.Provider value={{
      player, match, updatePlayer, startQuickMatch, createRoom, joinRoom,
      setReady, proceedToAnnouncement, proceedToPractice, proceedToLive,
      reportSolved, requestRevenge, goHome, setPhase, updateOpponentProgress,
    }}>
      {children}
    </GameContext.Provider>
  );
}
