import { createHmac } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { DatabaseService } from "./database-service.js";

export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly sessionSecret: string,
    private readonly sessionTtlMs: number,
  ) {}

  createGuestSession(username?: string) {
    const user = this.database.createGuestUser(username);
    const { token } = this.database.createSession(user.id, this.sessionTtlMs);
    return { token: this.signToken(token), user };
  }

  getAuthenticatedUser(request: FastifyRequest) {
    const bearer = request.headers.authorization?.startsWith("Bearer ")
      ? request.headers.authorization.slice("Bearer ".length)
      : null;
    const token = bearer ?? this.extractTokenFromQuery(request.url);

    if (!token) {
      return null;
    }

    const rawToken = this.verifySignedToken(token);
    if (!rawToken) {
      return null;
    }

    return this.database.getSessionByToken(rawToken);
  }

  requireAuthenticatedUser(request: FastifyRequest) {
    const authenticated = this.getAuthenticatedUser(request);
    if (!authenticated) {
      throw new Error("Unauthorized.");
    }

    return authenticated;
  }

  private signToken(token: string) {
    const signature = createHmac("sha256", this.sessionSecret).update(token).digest("hex");
    return `${token}.${signature}`;
  }

  private verifySignedToken(signedToken: string) {
    const lastDot = signedToken.lastIndexOf(".");
    if (lastDot <= 0) return null;

    const token = signedToken.slice(0, lastDot);
    const signature = signedToken.slice(lastDot + 1);
    const expected = createHmac("sha256", this.sessionSecret).update(token).digest("hex");

    return signature === expected ? token : null;
  }

  private extractTokenFromQuery(url: string) {
    const query = url.includes("?") ? url.slice(url.indexOf("?")) : "";
    if (!query) return null;
    const params = new URLSearchParams(query);
    return params.get("token");
  }
}
