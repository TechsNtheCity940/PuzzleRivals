import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { BOT_USERS, createGuestProfile } from "../seed/users.js";
import type { LobbyRecord, SessionRecord, UserProfileRecord } from "../types.js";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export class DatabaseService {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    const resolvedPath = path.resolve(databasePath);
    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    this.db = new DatabaseSync(resolvedPath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.initializeSchema();
    this.seedBots();
  }

  createGuestUser(username?: string) {
    const profile = createGuestProfile(username);
    const now = new Date().toISOString();
    const statement = this.db.prepare(`
      INSERT INTO users (id, username, is_bot, profile_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      profile.id,
      profile.username,
      0,
      JSON.stringify(profile),
      now,
      now,
    );

    return profile;
  }

  getUserById(userId: string) {
    const row = this.db.prepare("SELECT profile_json FROM users WHERE id = ?").get(userId) as
      | { profile_json: string }
      | undefined;

    return row ? (JSON.parse(row.profile_json) as UserProfileRecord) : null;
  }

  updateUser(profile: UserProfileRecord) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE users
      SET username = ?, profile_json = ?, updated_at = ?
      WHERE id = ?
    `).run(profile.username, JSON.stringify(profile), now, profile.id);
  }

  createSession(userId: string, ttlMs: number) {
    const sessionId = randomUUID();
    const token = `${sessionId}.${randomBytes(24).toString("hex")}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    this.db.prepare(`
      INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, userId, hashToken(token), createdAt, expiresAt);

    const session: SessionRecord = {
      id: sessionId,
      userId,
      createdAt,
      expiresAt,
    };

    return { token, session };
  }

  getSessionByToken(token: string) {
    const row = this.db.prepare(`
      SELECT s.id, s.user_id, s.created_at, s.expires_at, u.profile_json
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `).get(hashToken(token), new Date().toISOString()) as
      | {
          id: string;
          user_id: string;
          created_at: string;
          expires_at: string;
          profile_json: string;
        }
      | undefined;

    if (!row) return null;

    return {
      session: {
        id: row.id,
        userId: row.user_id,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      } satisfies SessionRecord,
      user: JSON.parse(row.profile_json) as UserProfileRecord,
    };
  }

  saveLobby(lobby: LobbyRecord) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO lobbies (id, mode, status, player_count, max_players, created_at, updated_at, expires_at, state_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        mode = excluded.mode,
        status = excluded.status,
        player_count = excluded.player_count,
        max_players = excluded.max_players,
        updated_at = excluded.updated_at,
        expires_at = excluded.expires_at,
        state_json = excluded.state_json
    `).run(
      lobby.id,
      lobby.mode,
      lobby.status,
      lobby.players.length,
      lobby.maxPlayers,
      lobby.createdAt,
      now,
      lobby.expiresAt,
      JSON.stringify({ ...lobby, updatedAt: now }),
    );
  }

  getLobby(lobbyId: string) {
    const row = this.db.prepare("SELECT state_json FROM lobbies WHERE id = ?").get(lobbyId) as
      | { state_json: string }
      | undefined;

    return row ? (JSON.parse(row.state_json) as LobbyRecord) : null;
  }

  findJoinableLobby(mode: LobbyRecord["mode"], playerId: string) {
    const rows = this.db.prepare(`
      SELECT state_json
      FROM lobbies
      WHERE mode = ? AND status = 'filling' AND expires_at > ?
      ORDER BY created_at ASC
    `).all(mode, new Date().toISOString()) as Array<{ state_json: string }>;

    for (const row of rows) {
      const lobby = JSON.parse(row.state_json) as LobbyRecord;
      const alreadyJoined = lobby.players.some((player) => player.playerId === playerId);
      if (!alreadyJoined && lobby.players.length < lobby.maxPlayers) {
        return lobby;
      }
    }

    return null;
  }

  listAvailableBots(excludedIds: string[], limit: number) {
    const rows = this.db.prepare(`
      SELECT profile_json
      FROM users
      WHERE is_bot = 1
      ORDER BY updated_at DESC
    `).all() as Array<{ profile_json: string }>;

    return rows
      .map((row) => JSON.parse(row.profile_json) as UserProfileRecord)
      .filter((profile) => !excludedIds.includes(profile.id))
      .slice(0, limit);
  }

  savePayPalOrder(orderId: string, userId: string, status: string, payload: unknown) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO purchases (order_id, user_id, status, payload_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_id) DO UPDATE SET
        status = excluded.status,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `).run(orderId, userId, status, JSON.stringify(payload), now, now);
  }

  cleanupExpiredSessions() {
    this.db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
  }

  cleanupExpiredLobbies() {
    this.db.prepare("DELETE FROM lobbies WHERE expires_at <= ?").run(new Date().toISOString());
  }

  close() {
    this.db.close();
  }

  private initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        is_bot INTEGER NOT NULL DEFAULT 0,
        profile_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS lobbies (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        player_count INTEGER NOT NULL,
        max_players INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        state_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS purchases (
        order_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  private seedBots() {
    const statement = this.db.prepare(`
      INSERT INTO users (id, username, is_bot, profile_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        is_bot = excluded.is_bot,
        profile_json = excluded.profile_json,
        updated_at = excluded.updated_at
    `);
    const now = new Date().toISOString();

    for (const bot of BOT_USERS) {
      statement.run(bot.id, bot.username, 1, JSON.stringify(bot), now, now);
    }
  }
}
