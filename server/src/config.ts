import "dotenv/config";
import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVER_PORT: z.coerce.number().default(3001),
  CLIENT_ORIGIN: z.string().default("http://localhost:8080"),
  DATABASE_PATH: z.string().default("./server/data/puzzle-rivals.sqlite"),
  AUTOMATION_ROUTE_PREFIX: z.string().default("/api/automation"),
  AGENT_STUB_MODE: z.enum(["true", "false"]).default("true"),
  SESSION_SECRET: z.string().default("dev-session-secret-change-me"),
  SESSION_TTL_MS: z.coerce.number().int().positive().default(1000 * 60 * 60 * 24 * 30),
  BOT_FILL_DELAY_MS: z.coerce.number().int().positive().default(900),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  LOBBY_MAX_PLAYERS: z.coerce.number().int().positive().default(4),
  LOBBY_TTL_MS: z.coerce.number().int().positive().default(30 * 60 * 1000),
});

const env = serverEnvSchema.parse(process.env);

if (env.NODE_ENV === "production" && env.SESSION_SECRET === "dev-session-secret-change-me") {
  throw new Error("SESSION_SECRET must be set to a strong production value.");
}

export const serverConfig = {
  nodeEnv: env.NODE_ENV,
  port: env.SERVER_PORT,
  clientOrigin: env.CLIENT_ORIGIN,
  databasePath: env.DATABASE_PATH,
  automationRoutePrefix: env.AUTOMATION_ROUTE_PREFIX,
  agentStubMode: env.AGENT_STUB_MODE === "true",
  sessionSecret: env.SESSION_SECRET,
  sessionTtlMs: env.SESSION_TTL_MS,
  botFillDelayMs: env.BOT_FILL_DELAY_MS,
  paypalEnvironment: env.PAYPAL_ENV,
  paypalClientId: env.PAYPAL_CLIENT_ID,
  paypalClientSecret: env.PAYPAL_CLIENT_SECRET,
  lobbyMaxPlayers: env.LOBBY_MAX_PLAYERS,
  lobbyTtlMs: env.LOBBY_TTL_MS,
  get paypalBaseUrl() {
    return this.paypalEnvironment === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  },
};
