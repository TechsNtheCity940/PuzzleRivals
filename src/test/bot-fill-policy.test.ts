import { describe, expect, it } from "vitest";
import {
  getBotFillGraceMs,
  shouldBackfillLobbyWithBots,
} from "../../supabase/functions/_shared/bot-fill-policy.ts";

describe("matchmaking bot fill policy", () => {
  const nowMs = Date.parse("2026-04-04T18:00:00.000Z");

  it("waits for the ranked grace window before backfilling with bots", () => {
    expect(
      shouldBackfillLobbyWithBots({
        mode: "ranked",
        status: "filling",
        maxPlayers: 4,
        nowMs,
        activePlayers: [
          {
            joinedAt: new Date(nowMs - getBotFillGraceMs("ranked") + 500).toISOString(),
            isBot: false,
          },
        ],
      }),
    ).toBe(false);
  });

  it("backfills ranked lobbies once the oldest real player has waited long enough", () => {
    expect(
      shouldBackfillLobbyWithBots({
        mode: "ranked",
        status: "filling",
        maxPlayers: 4,
        nowMs,
        activePlayers: [
          {
            joinedAt: new Date(nowMs - getBotFillGraceMs("ranked") - 1).toISOString(),
            isBot: false,
          },
        ],
      }),
    ).toBe(true);
  });

  it("uses the shorter head to head grace window", () => {
    expect(
      shouldBackfillLobbyWithBots({
        mode: "head_to_head",
        status: "filling",
        maxPlayers: 2,
        nowMs,
        activePlayers: [
          {
            joinedAt: new Date(nowMs - getBotFillGraceMs("head_to_head") - 1).toISOString(),
            isBot: false,
          },
        ],
      }),
    ).toBe(true);
  });

  it("never backfills lobbies that only contain bots or are already full", () => {
    expect(
      shouldBackfillLobbyWithBots({
        mode: "ranked",
        status: "filling",
        maxPlayers: 4,
        nowMs,
        activePlayers: [
          {
            joinedAt: new Date(nowMs - 60_000).toISOString(),
            isBot: true,
          },
        ],
      }),
    ).toBe(false);

    expect(
      shouldBackfillLobbyWithBots({
        mode: "ranked",
        status: "filling",
        maxPlayers: 1,
        nowMs,
        activePlayers: [
          {
            joinedAt: new Date(nowMs - 60_000).toISOString(),
            isBot: false,
          },
        ],
      }),
    ).toBe(false);
  });
});
