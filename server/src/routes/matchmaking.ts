import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { AuthService } from "../services/auth-service.js";
import type { LobbyManager } from "../services/lobby-manager.js";
import { getPuzzleCatalog } from "../services/puzzle-seed-service.js";

const joinMatchmakingSchema = z.object({
  mode: z.enum(["ranked", "head_to_head", "casual", "royale", "revenge", "challenge", "daily"]),
});

const lobbyPlayerActionSchema = z.object({
  stage: z.enum(["practice", "live"]).optional(),
});

const nextRoundVoteSchema = z.object({
  vote: z.enum(["continue", "exit"]),
});

const progressBodySchema = z.object({
  stage: z.enum(["practice", "live"]),
  submission: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("rotate_pipes"),
      rotations: z.array(z.number().int()),
    }),
    z.object({
      kind: z.literal("number_grid"),
      values: z.array(z.number().int().nullable()),
    }),
    z.object({
      kind: z.literal("pattern_match"),
      answers: z.array(z.number().int()),
    }),
    z.object({
      kind: z.literal("word_scramble"),
      selectedIndices: z.array(z.number().int()),
    }),
    z.object({
      kind: z.literal("tile_slide"),
      tiles: z.array(z.number().int()),
    }),
    z.object({
      kind: z.literal("sudoku_mini"),
      values: z.array(z.number().int().nullable()),
    }),
    z.object({
      kind: z.literal("maze"),
      position: z.number().int().nonnegative(),
    }),
    z.object({
      kind: z.literal("memory_grid"),
      selectedIndices: z.array(z.number().int().nonnegative()),
    }),
    z.object({
      kind: z.literal("riddle_choice"),
      answers: z.array(z.number().int().nonnegative()),
    }),
    z.object({
      kind: z.literal("wordle_guess"),
      guesses: z.array(z.string().min(1)),
    }),
    z.object({
      kind: z.literal("chess_tactic"),
      answers: z.array(z.number().int().nonnegative()),
    }),
    z.object({
      kind: z.literal("checkers_tactic"),
      answers: z.array(z.number().int().nonnegative()),
    }),
  ]),
});

export async function registerMatchmakingRoutes(
  app: FastifyInstance,
  lobbyManager: LobbyManager,
  authService: AuthService,
) {
  app.get("/api/puzzles/catalog", async () => ({
    puzzles: getPuzzleCatalog(),
  }));

  app.post("/api/matchmaking/join", async (request, reply) => {
    const authenticated = authService.requireAuthenticatedUser(request);
    const input = joinMatchmakingSchema.parse(request.body);
    const lobby = lobbyManager.joinMatchmaking(authenticated.user, input.mode);
    reply.send({ lobby });
  });

  app.get("/api/lobbies/:lobbyId", async (request, reply) => {
    const params = z.object({ lobbyId: z.string().uuid() }).parse(request.params);
    const lobby = lobbyManager.getLobby(params.lobbyId);

    if (!lobby) {
      reply.code(404).send({ message: "Lobby not found." });
      return;
    }

    reply.send({ lobby });
  });

  app.post("/api/lobbies/:lobbyId/ready", async (request, reply) => {
    const authenticated = authService.requireAuthenticatedUser(request);
    const params = z.object({ lobbyId: z.string().uuid() }).parse(request.params);
    lobbyPlayerActionSchema.parse(request.body ?? {});
    const lobby = lobbyManager.markPlayerReady(params.lobbyId, authenticated.user.id);
    reply.send({ lobby });
  });

  app.post("/api/lobbies/:lobbyId/progress", async (request, reply) => {
    const authenticated = authService.requireAuthenticatedUser(request);
    const params = z.object({ lobbyId: z.string().uuid() }).parse(request.params);
    const body = progressBodySchema.parse(request.body);
    const progress = lobbyManager.reportProgress(
      params.lobbyId,
      authenticated.user.id,
      body.stage,
      body.submission,
    );
    reply.send(progress);
  });

  app.post("/api/lobbies/:lobbyId/solve", async (request, reply) => {
    const authenticated = authService.requireAuthenticatedUser(request);
    const params = z.object({ lobbyId: z.string().uuid() }).parse(request.params);
    const body = progressBodySchema.parse(request.body);
    const lobby = lobbyManager.submitSolve(params.lobbyId, authenticated.user.id, body.stage, body.submission);
    reply.send({ lobby });
  });

  app.post("/api/lobbies/:lobbyId/next-round-vote", async (request, reply) => {
    const authenticated = authService.requireAuthenticatedUser(request);
    const params = z.object({ lobbyId: z.string().uuid() }).parse(request.params);
    const body = nextRoundVoteSchema.parse(request.body);
    const lobby = lobbyManager.setNextRoundVote(params.lobbyId, authenticated.user.id, body.vote);
    reply.send({ lobby });
  });

  app.post("/api/lobbies/:lobbyId/complete", async (request, reply) => {
    const authenticated = authService.requireAuthenticatedUser(request);
    authenticated.user.id;
    const params = z.object({ lobbyId: z.string().uuid() }).parse(request.params);
    lobbyPlayerActionSchema.parse(request.body ?? {});
    const lobby = lobbyManager.completeLobby(params.lobbyId);
    reply.send({ lobby });
  });
}
