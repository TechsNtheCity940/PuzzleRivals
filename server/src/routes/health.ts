import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => ({
    ok: true,
    service: "puzzle-rivals-backend",
    timestamp: new Date().toISOString(),
  }));
}
