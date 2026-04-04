import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const channelHandle = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  };

  return {
    getSession: vi.fn(),
    channel: vi.fn(() => channelHandle),
    removeChannel: vi.fn(),
    channelHandle,
  };
});

vi.mock("@/lib/supabase-client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
  supabaseConfigErrorMessage: "Supabase is not configured.",
}));

describe("supabase api client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.channelHandle.on.mockReturnThis();
    vi.stubEnv("VITE_SUPABASE_URL", "https://puzzlerivals.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("calls Supabase Edge Functions with the current session token", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-123",
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ lobby: { id: "lobby-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { supabaseApi } = await import("@/lib/api-client");
    const result = await supabaseApi.joinLobby("ranked");

    expect(result).toEqual({ lobby: { id: "lobby-1" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://puzzlerivals.supabase.co/functions/v1/join-lobby",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          apikey: "public-anon-key",
          "x-supabase-auth": "token-123",
        }),
        body: JSON.stringify({ mode: "ranked" }),
      }),
    );
  });

  it("submits Neon Rivals run reports through the live function bridge", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-arcade",
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, alreadySubmitted: false, runId: "run-1", reward: { xp: 1, coins: 2, gems: 0, passXp: 3, shards: 4, itemIds: [] }, questReward: { xp: 0, coins: 0, gems: 0, passXp: 0, shards: 0, itemIds: [] }, totalReward: { xp: 1, coins: 2, gems: 0, passXp: 3, shards: 4, itemIds: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { supabaseApi } = await import("@/lib/api-client");
    await supabaseApi.submitNeonRivalsRun({
      sessionSeed: 123,
      mode: "combo_rush",
      status: "complete",
      score: 3400,
      combo: 3,
      maxCombo: 4,
      matchedTiles: 42,
      movesLeft: 5,
      targetScore: 1800,
      objectiveTitle: "Combo Rush",
      objectiveLabel: "Hit a peak combo of x4 before the board runs out of moves.",
      objectiveValue: 4,
      objectiveTarget: 4,
      durationMs: 28000,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://puzzlerivals.supabase.co/functions/v1/submit-neon-rivals-run",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sessionSeed: 123,
          mode: "combo_rush",
          status: "complete",
          score: 3400,
          combo: 3,
          maxCombo: 4,
          matchedTiles: 42,
          movesLeft: 5,
          targetScore: 1800,
          objectiveTitle: "Combo Rush",
          objectiveLabel: "Hit a peak combo of x4 before the board runs out of moves.",
          objectiveValue: 4,
          objectiveTarget: 4,
          durationMs: 28000,
        }),
      }),
    );
  });

  it("normalizes legacy match hint payloads into the current client shape", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-hint",
        },
      },
    });

    const legacyLobby = {
      id: "lobby-hint",
      mode: "ranked",
      status: "live",
      maxPlayers: 4,
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:00:00.000Z",
      expiresAt: "2026-04-03T00:10:00.000Z",
      players: [],
      selection: null,
      practiceStartsAt: null,
      practiceEndsAt: null,
      liveStartsAt: null,
      liveEndsAt: null,
      intermissionStartsAt: null,
      intermissionEndsAt: null,
      results: null,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ...legacyLobby,
        penalty: 60,
        hintUses: 1,
        hintPenaltyTotal: 60,
        nextHintAvailableAt: "2026-04-03T00:00:12.000Z",
        remainingHints: 2,
        liveScore: 340,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { supabaseApi } = await import("@/lib/api-client");
    const result = await supabaseApi.useMatchHint("lobby-hint");

    expect(result.lobby).toEqual(legacyLobby);
    expect(result.penalty).toBe(60);
    expect(result.hintUses).toBe(1);
  });

  it("surfaces Supabase Edge Function error messages", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "token-456",
        },
      },
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({ message: "queue unavailable" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { supabaseApi } = await import("@/lib/api-client");

    await expect(supabaseApi.joinLobby("ranked")).rejects.toThrow("queue unavailable");
  });

  it("requires a signed-in session before invoking matchmaking functions", async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: null,
      },
    });

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { supabaseApi } = await import("@/lib/api-client");

    await expect(supabaseApi.joinLobby("ranked")).rejects.toThrow("You must be signed in before using matchmaking.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
