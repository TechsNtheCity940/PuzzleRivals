import type { FastifyInstance } from "fastify";
import type { RawData, WebSocket } from "ws";
import { z } from "zod";
import type { LobbyManager } from "./services/lobby-manager.js";

const socketMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("subscribe_lobby"),
    lobbyId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("unsubscribe_lobby"),
    lobbyId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("ping"),
  }),
]);

export async function registerLobbyWebSocket(app: FastifyInstance, lobbyManager: LobbyManager) {
  app.get("/ws", { websocket: true }, (socket) => {
    let subscribedLobbyId: string | null = null;

    socket.send(JSON.stringify({
      type: "socket.ready",
      payload: {
        message: "Connected to Puzzle Rivals backend.",
      },
    }));

    socket.on("message", (raw: RawData) => {
      handleSocketMessage(socket, String(raw), lobbyManager, (nextLobbyId) => {
        subscribedLobbyId = nextLobbyId;
      }, subscribedLobbyId);
    });

    socket.on("close", () => {
      if (subscribedLobbyId) {
        lobbyManager.unsubscribe(subscribedLobbyId, socket);
      }
    });
  });
}

function handleSocketMessage(
  socket: WebSocket,
  rawMessage: string,
  lobbyManager: LobbyManager,
  updateSubscription: (lobbyId: string | null) => void,
  subscribedLobbyId: string | null,
) {
  try {
    const message = socketMessageSchema.parse(JSON.parse(rawMessage));

    if (message.type === "ping") {
      socket.send(JSON.stringify({ type: "pong", payload: { now: new Date().toISOString() } }));
      return;
    }

    if (message.type === "unsubscribe_lobby") {
      lobbyManager.unsubscribe(message.lobbyId, socket);
      updateSubscription(null);
      return;
    }

    if (subscribedLobbyId) {
      lobbyManager.unsubscribe(subscribedLobbyId, socket);
    }

    lobbyManager.subscribe(message.lobbyId, socket);
    updateSubscription(message.lobbyId);
  } catch (error) {
    socket.send(JSON.stringify({
      type: "socket.error",
      payload: {
        message: error instanceof Error ? error.message : "Invalid websocket message.",
      },
    }));
  }
}
