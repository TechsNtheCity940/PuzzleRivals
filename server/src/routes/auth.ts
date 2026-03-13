import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { AuthService } from "../services/auth-service.js";

const guestSessionSchema = z.object({
  username: z.string().trim().min(2).max(24).optional(),
});

export async function registerAuthRoutes(app: FastifyInstance, authService: AuthService) {
  app.post("/api/auth/guest", async (request, reply) => {
    const input = guestSessionSchema.parse(request.body ?? {});
    const session = authService.createGuestSession(input.username);
    reply.send(session);
  });

  app.get("/api/auth/me", async (request, reply) => {
    const authenticated = authService.getAuthenticatedUser(request);
    if (!authenticated) {
      reply.code(401).send({ message: "Unauthorized." });
      return;
    }

    reply.send({
      session: authenticated.session,
      user: authenticated.user,
    });
  });
}
