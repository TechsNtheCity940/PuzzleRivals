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
