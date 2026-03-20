// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";

const tempPaths: string[] = [];

afterEach(() => {
  for (const tempPath of tempPaths.splice(0)) {
    try {
      rmSync(tempPath, { force: true });
      rmSync(`${tempPath}-wal`, { force: true });
      rmSync(`${tempPath}-shm`, { force: true });
    } catch {
      // SQLite cleanup on Windows can lag slightly after close.
    }
  }
});

describe("legacy Fastify backend scaffold", () => {
  it("still supports guest auth and matchmaking in the legacy local server", async () => {
    const dbPath = path.resolve(`./server/data/test-${randomUUID()}.sqlite`);
    tempPaths.push(dbPath);

    process.env.DATABASE_PATH = dbPath;
    process.env.SESSION_SECRET = "test-secret";

    const { buildServer } = await import("../../server/src/app.ts");
    const { app } = await buildServer();

    try {
      const authResponse = await app.inject({
        method: "POST",
        url: "/api/auth/guest",
        payload: { username: "TestRunner" },
      });
      expect(authResponse.statusCode).toBe(200);

      const authPayload = authResponse.json() as { token: string; user: { id: string } };
      const joinResponse = await app.inject({
        method: "POST",
        url: "/api/matchmaking/join",
        headers: {
          authorization: `Bearer ${authPayload.token}`,
        },
        payload: {
          mode: "ranked",
        },
      });

      expect(joinResponse.statusCode).toBe(200);
      const joinPayload = joinResponse.json() as { lobby: { players: Array<{ playerId: string }> } };
      expect(joinPayload.lobby.players.some((player) => player.playerId === authPayload.user.id)).toBe(true);
    } finally {
      await app.close();
    }
  }, 60000);
});
