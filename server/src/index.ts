import { serverConfig } from "./config.js";
import { buildServer } from "./app.js";

const { app, lobbyManager } = await buildServer();

const cleanupInterval = setInterval(() => {
  lobbyManager.cleanupExpiredLobbies();
}, 60_000);

cleanupInterval.unref();

await app.listen({
  port: serverConfig.port,
  host: "0.0.0.0",
});
