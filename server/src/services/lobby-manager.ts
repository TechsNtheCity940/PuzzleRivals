import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";
import type {
  LobbyPlayer,
  LobbyRecord,
  LobbyReward,
  MatchMode,
  PuzzleSubmission,
  UserProfileRecord,
} from "../types.js";
import { DatabaseService } from "./database-service.js";
import { createAuthoritativePuzzleSelection } from "./puzzle-seed-service.js";
import { evaluatePuzzleSubmission, isSolvedPuzzleSubmission } from "./puzzle-validation-service.js";
import { getRankTier } from "../seed/users.js";

const PRACTICE_DURATION_MS = 12_000;
const LIVE_DURATION_MS = 90_000;
const INTERMISSION_DURATION_MS = 10_000;

function averageElo(players: LobbyPlayer[]) {
  return Math.round(players.reduce((sum, player) => sum + player.elo, 0) / players.length);
}

function calculatePace(playerId: string, elo: number) {
  const offset = [...playerId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 12;
  return 1.8 + elo / 1800 + offset / 10;
}

function rankPlayers(players: LobbyPlayer[]) {
  return [...players].sort((left, right) => {
    if (right.progress !== left.progress) return right.progress - left.progress;
    if (left.solvedAtMs === null && right.solvedAtMs === null) return 0;
    if (left.solvedAtMs === null) return 1;
    if (right.solvedAtMs === null) return -1;
    return left.solvedAtMs - right.solvedAtMs;
  });
}

function getReward(rank: number): LobbyReward {
  if (rank === 1) return { xp: 420, coins: 700, elo: 28 };
  if (rank === 2) return { xp: 260, coins: 420, elo: 12 };
  if (rank === 3) return { xp: 170, coins: 260, elo: -4 };
  return { xp: 90, coins: 140, elo: -16 };
}

export class LobbyManager extends EventEmitter {
  private lobbySockets = new Map<string, Set<WebSocket>>();
  private botFillTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private phaseTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private liveIntervals = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    private readonly database: DatabaseService,
    private readonly maxPlayers: number,
    private readonly lobbyTtlMs: number,
    private readonly botFillDelayMs: number,
  ) {
    super();
  }

  joinMatchmaking(user: UserProfileRecord, mode: MatchMode) {
    const now = new Date().toISOString();
    const existingLobby = this.database.findJoinableLobby(mode, user.id);
    const lobby = existingLobby ?? this.createLobby(mode, now);

    if (!lobby.players.some((player) => player.playerId === user.id)) {
      lobby.players.push(this.createLobbyPlayer(user, false, now));
    }

    lobby.updatedAt = now;
    lobby.expiresAt = new Date(Date.now() + this.lobbyTtlMs).toISOString();
    this.database.saveLobby(lobby);
    this.broadcastSnapshot(lobby.id);

    if (lobby.players.length < lobby.maxPlayers) {
      this.scheduleBotFill(lobby.id);
    } else {
      this.prepareLobby(lobby.id);
    }

    return this.requireLobby(lobby.id);
  }

  getLobby(lobbyId: string) {
    return this.database.getLobby(lobbyId);
  }

  markPlayerReady(lobbyId: string, playerId: string) {
    const lobby = this.requireLobby(lobbyId);
    const player = lobby.players.find((entry) => entry.playerId === playerId);
    if (!player) throw new Error("Player not found in lobby.");

    player.ready = true;
    lobby.updatedAt = new Date().toISOString();
    this.database.saveLobby(lobby);
    this.broadcastSnapshot(lobby.id);

    if (lobby.status === "ready" && lobby.players.every((entry) => entry.ready)) {
      this.startPractice(lobby.id);
    }

    return this.requireLobby(lobby.id);
  }

  setNextRoundVote(lobbyId: string, playerId: string, vote: "continue" | "exit") {
    const lobby = this.requireLobby(lobbyId);
    if (lobby.status !== "intermission") {
      throw new Error("Lobby is not in intermission.");
    }

    const player = lobby.players.find((entry) => entry.playerId === playerId);
    if (!player) {
      throw new Error("Player not found in lobby.");
    }

    player.nextRoundVote = vote;
    lobby.updatedAt = new Date().toISOString();
    this.database.saveLobby(lobby);
    this.broadcastSnapshot(lobby.id);

    if (vote === "exit") {
      this.resolveIntermission(lobby.id);
      return this.requireLobby(lobby.id);
    }

    if (lobby.players.every((entry) => entry.nextRoundVote === "continue")) {
      this.startNextRound(lobby.id);
    }

    return this.requireLobby(lobby.id);
  }

  reportProgress(lobbyId: string, playerId: string, stage: "practice" | "live", submission: PuzzleSubmission) {
    const lobby = this.requireLobby(lobbyId);
    if (!lobby.selection) throw new Error("Lobby does not have a selected puzzle.");
    if (stage === "practice" && lobby.status !== "practice") throw new Error("Lobby is not in practice.");
    if (stage === "live" && lobby.status !== "live") throw new Error("Lobby is not live.");

    const seed = stage === "practice" ? lobby.selection.practiceSeed : lobby.selection.liveSeed;
    const progress = evaluatePuzzleSubmission(lobby.selection.puzzleType, seed, lobby.selection.difficulty, submission);
    const player = lobby.players.find((entry) => entry.playerId === playerId);
    if (!player) throw new Error("Player not found in lobby.");

    if (stage === "practice") {
      player.practiceProgress = progress;
    } else {
      player.progress = progress;
    }

    lobby.updatedAt = new Date().toISOString();
    this.database.saveLobby(lobby);
    this.broadcastSnapshot(lobby.id);
    return { lobby, progress };
  }

  submitSolve(lobbyId: string, playerId: string, stage: "practice" | "live", submission: PuzzleSubmission) {
    const lobby = this.requireLobby(lobbyId);
    if (!lobby.selection) throw new Error("Lobby does not have a selected puzzle.");
    const seed = stage === "practice" ? lobby.selection.practiceSeed : lobby.selection.liveSeed;

    if (!isSolvedPuzzleSubmission(lobby.selection.puzzleType, seed, lobby.selection.difficulty, submission)) {
      throw new Error("Submitted puzzle state is not solved.");
    }

    const player = lobby.players.find((entry) => entry.playerId === playerId);
    if (!player) throw new Error("Player not found in lobby.");

    if (stage === "practice") {
      player.practiceProgress = 100;
    } else {
      player.progress = 100;
      if (player.solvedAtMs === null && lobby.liveStartsAt) {
        player.solvedAtMs = Date.now() - new Date(lobby.liveStartsAt).getTime();
      }
    }

    lobby.updatedAt = new Date().toISOString();
    this.database.saveLobby(lobby);
    this.broadcastSnapshot(lobby.id);

    if (stage === "live" && lobby.players.every((entry) => entry.solvedAtMs !== null)) {
      this.completeLobby(lobbyId);
    }

    return this.requireLobby(lobbyId);
  }

  completeLobby(lobbyId: string) {
    const lobby = this.requireLobby(lobbyId);
    if (lobby.status === "intermission" || lobby.status === "complete") return lobby;

    lobby.status = "intermission";
    lobby.updatedAt = new Date().toISOString();
    const standings = rankPlayers(lobby.players).map((player, index) => {
      const reward = getReward(index + 1);
      const target = lobby.players.find((entry) => entry.playerId === player.playerId);
      if (target) {
        target.reward = reward;
      }
      this.applyReward(player.playerId, reward, index === 0);
      return {
        playerId: player.playerId,
        username: player.username,
        progress: player.progress,
        solvedAtMs: player.solvedAtMs,
        rank: index + 1,
        reward,
        isBot: player.isBot,
      };
    });

    lobby.results = {
      completedAt: new Date().toISOString(),
      standings,
    };
    lobby.intermissionStartsAt = new Date().toISOString();
    lobby.intermissionEndsAt = new Date(Date.now() + INTERMISSION_DURATION_MS).toISOString();
    lobby.players = lobby.players.map((player) => ({
      ...player,
      nextRoundVote: player.isBot ? "continue" : null,
    }));

    this.clearLobbyTimers(lobbyId);
    this.database.saveLobby(lobby);
    this.broadcastSnapshot(lobby.id);

    const timeout = setTimeout(() => {
      this.phaseTimeouts.delete(lobbyId);
      this.resolveIntermission(lobbyId);
    }, INTERMISSION_DURATION_MS);
    timeout.unref();
    this.phaseTimeouts.set(lobbyId, timeout);

    return lobby;
  }

  subscribe(lobbyId: string, socket: WebSocket) {
    const bucket = this.lobbySockets.get(lobbyId) ?? new Set<WebSocket>();
    bucket.add(socket);
    this.lobbySockets.set(lobbyId, bucket);
    this.broadcastSnapshot(lobbyId, socket);
  }

  unsubscribe(lobbyId: string, socket: WebSocket) {
    const bucket = this.lobbySockets.get(lobbyId);
    if (!bucket) return;
    bucket.delete(socket);
    if (bucket.size === 0) {
      this.lobbySockets.delete(lobbyId);
    }
  }

  cleanupExpiredLobbies() {
    this.database.cleanupExpiredSessions();
    this.database.cleanupExpiredLobbies();
  }

  private createLobby(mode: MatchMode, now: string): LobbyRecord {
    const maxPlayers = mode === "revenge" || mode === "head_to_head" ? 2 : this.maxPlayers;
    const lobby: LobbyRecord = {
      id: randomUUID(),
      mode,
      status: "filling",
      maxPlayers,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + this.lobbyTtlMs).toISOString(),
      players: [],
      selection: null,
      practiceStartsAt: null,
      practiceEndsAt: null,
      liveStartsAt: null,
      liveEndsAt: null,
      intermissionStartsAt: null,
      intermissionEndsAt: null,
      results: null,
    };

    this.database.saveLobby(lobby);
    return lobby;
  }

  private createLobbyPlayer(user: UserProfileRecord, isBot: boolean, joinedAt: string): LobbyPlayer {
    return {
      playerId: user.id,
      username: user.username,
      elo: user.elo,
      rank: user.rank,
      isBot,
      ready: isBot,
      nextRoundVote: null,
      joinedAt,
      progress: 0,
      practiceProgress: 0,
      solvedAtMs: null,
      pace: calculatePace(user.id, user.elo),
    };
  }

  private scheduleBotFill(lobbyId: string) {
    if (this.botFillTimeouts.has(lobbyId)) return;

    const timeout = setTimeout(() => {
      this.botFillTimeouts.delete(lobbyId);
      const lobby = this.database.getLobby(lobbyId);
      if (!lobby || lobby.status !== "filling") return;

      const needed = lobby.maxPlayers - lobby.players.length;
      if (needed <= 0) {
        this.prepareLobby(lobbyId);
        return;
      }

      const bots = this.database.listAvailableBots(lobby.players.map((player) => player.playerId), 1);
      for (const bot of bots) {
        lobby.players.push(this.createLobbyPlayer(bot, true, new Date().toISOString()));
      }

      lobby.updatedAt = new Date().toISOString();
      this.database.saveLobby(lobby);
      this.broadcastSnapshot(lobby.id);

      if (lobby.players.length < lobby.maxPlayers) {
        this.scheduleBotFill(lobby.id);
      } else {
        this.prepareLobby(lobby.id);
      }
    }, this.botFillDelayMs);

    timeout.unref();
    this.botFillTimeouts.set(lobbyId, timeout);
  }

  private prepareLobby(lobbyId: string) {
    const lobby = this.requireLobby(lobbyId);
    if (lobby.selection || lobby.players.length < lobby.maxPlayers) return;

    lobby.selection = createAuthoritativePuzzleSelection(averageElo(lobby.players), lobby.mode);
    lobby.status = "ready";
    lobby.updatedAt = new Date().toISOString();
    lobby.players = lobby.players.map((player) => ({
      ...player,
      ready: player.isBot,
      nextRoundVote: null,
    }));
    this.database.saveLobby(lobby);
    this.broadcastSnapshot(lobby.id);
  }

  private startPractice(lobbyId: string) {
    const lobby = this.requireLobby(lobbyId);
    lobby.status = "practice";
    lobby.practiceStartsAt = new Date().toISOString();
    lobby.practiceEndsAt = new Date(Date.now() + PRACTICE_DURATION_MS).toISOString();
    lobby.updatedAt = new Date().toISOString();
    this.database.saveLobby(lobby);
    this.broadcastSnapshot(lobby.id);

    const timeout = setTimeout(() => {
      this.phaseTimeouts.delete(lobbyId);
      this.startLive(lobbyId);
    }, PRACTICE_DURATION_MS);

    timeout.unref();
    this.phaseTimeouts.set(lobbyId, timeout);
  }

  private startLive(lobbyId: string) {
    const lobby = this.requireLobby(lobbyId);
    if (!lobby.selection) throw new Error("Lobby does not have a selected puzzle.");

    lobby.status = "live";
    lobby.liveStartsAt = new Date().toISOString();
    lobby.liveEndsAt = new Date(Date.now() + LIVE_DURATION_MS).toISOString();
    lobby.updatedAt = new Date().toISOString();
    lobby.players = lobby.players.map((player) => ({
      ...player,
      progress: 0,
      solvedAtMs: null,
      nextRoundVote: null,
    }));
    this.database.saveLobby(lobby);
    this.broadcastSnapshot(lobby.id);

    const timeout = setTimeout(() => {
      this.phaseTimeouts.delete(lobbyId);
      this.completeLobby(lobbyId);
    }, LIVE_DURATION_MS);
    timeout.unref();
    this.phaseTimeouts.set(lobbyId, timeout);

    const interval = setInterval(() => {
      const currentLobby = this.database.getLobby(lobbyId);
      if (!currentLobby || currentLobby.status !== "live" || !currentLobby.liveStartsAt) {
        this.clearLobbyTimers(lobbyId);
        return;
      }

      let changed = false;
      for (const player of currentLobby.players) {
        if (!player.isBot || player.solvedAtMs !== null) continue;
        const increment = player.pace + Math.random() * (4 + (currentLobby.selection?.difficulty ?? 1));
        const nextProgress = Math.min(100, player.progress + increment);
        if (nextProgress !== player.progress) {
          changed = true;
        }

        player.progress = nextProgress;
        if (nextProgress >= 100) {
          player.solvedAtMs = Date.now() - new Date(currentLobby.liveStartsAt).getTime();
        }
      }

      if (!changed) return;

      currentLobby.updatedAt = new Date().toISOString();
      this.database.saveLobby(currentLobby);
      this.broadcastSnapshot(currentLobby.id);

      if (currentLobby.players.every((player) => player.solvedAtMs !== null)) {
        this.completeLobby(currentLobby.id);
      }
    }, 900);

    interval.unref();
    this.liveIntervals.set(lobbyId, interval);
  }

  private applyReward(playerId: string, reward: LobbyReward, isWinner: boolean) {
    const user = this.database.getUserById(playerId);
    if (!user) return;

    const nextWins = user.wins + (isWinner ? 1 : 0);
    const nextLosses = user.losses + (isWinner ? 0 : 1);
    const nextWinStreak = isWinner ? user.winStreak + 1 : 0;
    const nextElo = Math.max(0, user.elo + reward.elo);

    const updatedUser: UserProfileRecord = {
      ...user,
      wins: nextWins,
      losses: nextLosses,
      matchesPlayed: user.matchesPlayed + 1,
      winStreak: nextWinStreak,
      bestStreak: Math.max(user.bestStreak, nextWinStreak),
      xp: user.xp + reward.xp,
      coins: user.coins + reward.coins,
      elo: nextElo,
      rank: getRankTier(nextElo),
    };

    this.database.updateUser(updatedUser);
  }

  private resolveIntermission(lobbyId: string) {
    const lobby = this.requireLobby(lobbyId);
    if (lobby.status !== "intermission") return;

    const continuingPlayers = lobby.players.filter((player) => player.nextRoundVote === "continue");
    lobby.players = continuingPlayers.map((player) => ({
      ...player,
      ready: player.isBot,
      nextRoundVote: null,
      progress: 0,
      practiceProgress: 0,
      solvedAtMs: null,
      reward: undefined,
    }));

    lobby.results = null;
    lobby.selection = null;
    lobby.practiceStartsAt = null;
    lobby.practiceEndsAt = null;
    lobby.liveStartsAt = null;
    lobby.liveEndsAt = null;
    lobby.intermissionStartsAt = null;
    lobby.intermissionEndsAt = null;
    lobby.updatedAt = new Date().toISOString();
    lobby.expiresAt = new Date(Date.now() + this.lobbyTtlMs).toISOString();

    if (lobby.players.length >= lobby.maxPlayers) {
      this.database.saveLobby(lobby);
      this.prepareLobby(lobby.id);
      return;
    }

    lobby.status = "filling";
    this.database.saveLobby(lobby);
    this.broadcastSnapshot(lobby.id);
    this.scheduleBotFill(lobby.id);
  }

  private startNextRound(lobbyId: string) {
    const lobby = this.requireLobby(lobbyId);
    lobby.results = null;
    lobby.selection = null;
    lobby.practiceStartsAt = null;
    lobby.practiceEndsAt = null;
    lobby.liveStartsAt = null;
    lobby.liveEndsAt = null;
    lobby.intermissionStartsAt = null;
    lobby.intermissionEndsAt = null;
    lobby.updatedAt = new Date().toISOString();
    lobby.players = lobby.players.map((player) => ({
      ...player,
      ready: player.isBot,
      nextRoundVote: null,
      progress: 0,
      practiceProgress: 0,
      solvedAtMs: null,
      reward: undefined,
    }));
    this.database.saveLobby(lobby);
    this.prepareLobby(lobby.id);
  }

  private requireLobby(lobbyId: string) {
    const lobby = this.database.getLobby(lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found.");
    }

    return lobby;
  }

  private clearLobbyTimers(lobbyId: string) {
    const botFill = this.botFillTimeouts.get(lobbyId);
    if (botFill) {
      clearTimeout(botFill);
      this.botFillTimeouts.delete(lobbyId);
    }

    const phase = this.phaseTimeouts.get(lobbyId);
    if (phase) {
      clearTimeout(phase);
      this.phaseTimeouts.delete(lobbyId);
    }

    const liveInterval = this.liveIntervals.get(lobbyId);
    if (liveInterval) {
      clearInterval(liveInterval);
      this.liveIntervals.delete(lobbyId);
    }
  }

  private broadcastSnapshot(lobbyId: string, targetSocket?: WebSocket) {
    const lobby = this.getLobby(lobbyId);
    if (!lobby) return;

    const payload = JSON.stringify({
      type: "lobby.snapshot",
      payload: lobby,
    });

    if (targetSocket) {
      targetSocket.send(payload);
      return;
    }

    const bucket = this.lobbySockets.get(lobbyId);
    if (!bucket) return;

    for (const socket of bucket) {
      socket.send(payload);
    }
  }
}
