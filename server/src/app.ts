import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { serverConfig } from "./config.js";
import { DatabaseService } from "./services/database-service.js";
import { AuthService } from "./services/auth-service.js";
import { LobbyManager } from "./services/lobby-manager.js";
import { PayPalService } from "./services/paypal-service.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerAutomationAgentRoutes } from "./routes/automation-agents.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerMatchmakingRoutes } from "./routes/matchmaking.js";
import { registerPayPalRoutes } from "./routes/paypal.js";
import { registerLobbyWebSocket } from "./ws.js";

export async function buildServer() {
  const app = Fastify({
    logger: true,
  });

  const database = new DatabaseService(serverConfig.databasePath);
  const authService = new AuthService(database, serverConfig.sessionSecret, serverConfig.sessionTtlMs);
  const lobbyManager = new LobbyManager(
    database,
    serverConfig.lobbyMaxPlayers,
    serverConfig.lobbyTtlMs,
    serverConfig.botFillDelayMs,
  );
  const payPalService = new PayPalService(
    serverConfig.paypalBaseUrl,
    serverConfig.paypalClientId,
    serverConfig.paypalClientSecret,
  );

  await app.register(cors, {
    origin: serverConfig.clientOrigin,
    credentials: true,
  });

  await app.register(websocket);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(400).send({
      message: error instanceof Error ? error.message : "Unexpected server error.",
    });
  });

  await registerAuthRoutes(app, authService);
  await registerAutomationAgentRoutes(app);
  await registerHealthRoutes(app);
  await registerMatchmakingRoutes(app, lobbyManager, authService);
  await registerPayPalRoutes(app, payPalService, authService, database);
  await registerLobbyWebSocket(app, lobbyManager);

  app.addHook("onClose", async () => {
    database.close();
  });

  return {
    app,
    authService,
    database,
    lobbyManager,
    payPalService,
  };
}
