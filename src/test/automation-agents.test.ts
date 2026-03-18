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

describe("automation agent routes", () => {
  it("lists registered automation agents", async () => {
    const dbPath = path.resolve(`./server/data/test-${randomUUID()}.sqlite`);
    tempPaths.push(dbPath);

    process.env.DATABASE_PATH = dbPath;
    process.env.SESSION_SECRET = "test-secret";
    process.env.AUTOMATION_ROUTE_PREFIX = "/api/automation";
    process.env.AGENT_STUB_MODE = "true";

    const { buildServer } = await import("../../server/src/app.ts");
    const { app } = await buildServer();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/automation",
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json() as {
        agents: Array<{ id: string }>;
        routePrefix: string;
        stubMode: boolean;
      };

      expect(payload.routePrefix).toBe("/api/automation");
      expect(payload.stubMode).toBe(true);
      expect(payload.agents.map((agent) => agent.id)).toEqual(
        expect.arrayContaining(["scenario-generator", "project-search"]),
      );
    } finally {
      await app.close();
    }
  }, 20000);

  it("executes deterministic generator and search agents", async () => {
    const dbPath = path.resolve(`./server/data/test-${randomUUID()}.sqlite`);
    tempPaths.push(dbPath);

    process.env.DATABASE_PATH = dbPath;
    process.env.SESSION_SECRET = "test-secret";
    process.env.AUTOMATION_ROUTE_PREFIX = "/api/automation";
    process.env.AGENT_STUB_MODE = "true";

    const { buildServer } = await import("../../server/src/app.ts");
    const { app } = await buildServer();

    try {
      const generatorResponse = await app.inject({
        method: "POST",
        url: "/api/automation/execute",
        payload: {
          agent: "scenario-generator",
          context: { seed: 88421 },
          input: {
            count: 2,
            kind: "quiz",
            tone: "competitive",
            topic: "maze",
          },
        },
      });

      expect(generatorResponse.statusCode).toBe(200);
      const generatorPayload = generatorResponse.json() as {
        data: {
          items: Array<{ id: string; prompt: string }>;
          seed: number;
        };
        meta: { agent: string; mode: string; seed?: number };
        ok: true;
      };

      expect(generatorPayload.ok).toBe(true);
      expect(generatorPayload.meta.agent).toBe("scenario-generator");
      expect(generatorPayload.meta.mode).toBe("stub");
      expect(generatorPayload.meta.seed).toBe(88421);
      expect(generatorPayload.data.seed).toBe(88421);
      expect(generatorPayload.data.items).toHaveLength(2);
      expect(generatorPayload.data.items[0]?.prompt).toContain("maze");

      const searchResponse = await app.inject({
        method: "POST",
        url: "/api/automation/execute",
        payload: {
          agent: "project-search",
          input: {
            query: "maze puzzle",
          },
        },
      });

      expect(searchResponse.statusCode).toBe(200);
      const searchPayload = searchResponse.json() as {
        data: {
          query: string;
          results: Array<{ id: string; title: string }>;
          total: number;
        };
        meta: { agent: string };
      };

      expect(searchPayload.meta.agent).toBe("project-search");
      expect(searchPayload.data.query).toBe("maze puzzle");
      expect(searchPayload.data.total).toBeGreaterThan(0);
      expect(searchPayload.data.results[0]?.id).toContain("maze");
    } finally {
      await app.close();
    }
  }, 20000);
});
