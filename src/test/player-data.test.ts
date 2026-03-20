import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    responses: {} as Record<string, Array<{ data?: unknown; error?: unknown }>>,
    from: vi.fn(),
  };

  state.from.mockImplementation((table: string) => {
    const query: {
      select: ReturnType<typeof vi.fn>;
      gt: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      neq: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      then: PromiseLike<{ data: unknown; error: unknown }>["then"];
    } = {
      select: vi.fn(() => query),
      gt: vi.fn(() => query),
      limit: vi.fn(() => query),
      neq: vi.fn(() => query),
      order: vi.fn(() => query),
      then: (resolve, reject) => {
        const queue = state.responses[table];
        const response = queue && queue.length > 0 ? queue.shift()! : { data: [], error: null };
        return Promise.resolve({
          data: response.data ?? [],
          error: response.error ?? null,
        }).then(resolve, reject);
      },
    };

    return query;
  });

  return state;
});

vi.mock("@/lib/supabase-client", () => ({
  supabase: {
    from: mocks.from,
  },
  isSupabaseSchemaSetupIssue: vi.fn(() => false),
  toSupabaseSchemaSetupError: vi.fn((error: unknown) => error),
}));

import { fetchLeaderboard, fetchSocialDirectory } from "@/lib/player-data";

describe("player discovery reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.responses = {};
  });

  it("loads leaderboard rows without requiring a signed-in session", async () => {
    mocks.responses.player_stats = [
      {
        data: [
          {
            user_id: "user-1",
            wins: 42,
            matches_played: 80,
            profiles: {
              id: "user-1",
              username: "CipherKing",
              rank: "diamond",
              elo: 2850,
              avatar_id: "blue-spinner",
            },
          },
          {
            user_id: "user-2",
            wins: 30,
            matches_played: 60,
            profiles: {
              id: "user-2",
              username: "GridWitch",
              rank: "platinum",
              elo: 2100,
              avatar_id: "green-cube",
            },
          },
        ],
      },
    ];

    const leaderboard = await fetchLeaderboard(2);

    expect(leaderboard).toEqual([
      {
        rank: 1,
        userId: "user-1",
        username: "CipherKing",
        avatarId: "blue-spinner",
        avatarUrl: "blue-spinner",
        elo: 2850,
        rankTier: "diamond",
        wins: 42,
      },
      {
        rank: 2,
        userId: "user-2",
        username: "GridWitch",
        avatarId: "green-cube",
        avatarUrl: "green-cube",
        elo: 2100,
        rankTier: "platinum",
        wins: 30,
      },
    ]);
  });

  it("loads the social directory without requiring a signed-in session", async () => {
    mocks.responses.profiles = [
      {
        data: [
          {
            id: "user-2",
            username: "GridWitch",
            avatar_id: "green-cube",
            rank: "platinum",
            elo: 2100,
            facebook_handle: "gridwitch",
            tiktok_handle: null,
          },
          {
            id: "user-3",
            username: "BlazeLogic",
            avatar_id: "orange-cube",
            rank: "gold",
            elo: 1850,
            facebook_handle: null,
            tiktok_handle: "@blazelogic",
          },
        ],
      },
    ];

    const directory = await fetchSocialDirectory();

    expect(directory).toEqual([
      {
        id: "user-2",
        username: "GridWitch",
        avatar_id: "green-cube",
        rank: "platinum",
        elo: 2100,
        facebook_handle: "gridwitch",
        tiktok_handle: null,
      },
      {
        id: "user-3",
        username: "BlazeLogic",
        avatar_id: "orange-cube",
        rank: "gold",
        elo: 1850,
        facebook_handle: null,
        tiktok_handle: "@blazelogic",
      },
    ]);
  });
});
