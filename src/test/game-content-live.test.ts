import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/lib/types";

const mocks = vi.hoisted(() => {
  const state = {
    responses: {} as Record<string, { data?: unknown; error?: unknown }>,
    fetchStorefront: vi.fn(),
    loadQuestSnapshot: vi.fn(),
    fetchLeaderboard: vi.fn(),
    fetchSocialDirectory: vi.fn(),
    from: vi.fn(),
  };

  state.from.mockImplementation((table: string) => {
    const query: {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      then: PromiseLike<{ data: unknown; error: unknown }>["then"];
    } = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      limit: vi.fn(() => query),
      then: (resolve, reject) => {
        const response = state.responses[table] ?? { data: [], error: null };
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
  isSupabaseSchemaSetupIssue: vi.fn((error: unknown) => {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === "42P01");
  }),
}));

vi.mock("@/lib/storefront", () => ({
  fetchStorefront: mocks.fetchStorefront,
}));

vi.mock("@/lib/economy", () => ({
  loadQuestSnapshot: mocks.loadQuestSnapshot,
}));

vi.mock("@/lib/player-data", () => ({
  fetchLeaderboard: mocks.fetchLeaderboard,
  fetchSocialDirectory: mocks.fetchSocialDirectory,
}));

import { loadDiscoveryContent, loadSeasonContent } from "@/lib/game-content";

describe("game content live feeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.responses = {};
    mocks.fetchStorefront.mockResolvedValue({
      items: [],
      vipProduct: null,
      wallet: {
        coins: 1200,
        gems: 45,
        puzzleShards: 12,
        rankPoints: 310,
        passXp: 980,
        hintBalance: 2,
        hasSeasonPass: true,
        isVip: false,
        vipExpiresAt: null,
        themeId: null,
        frameId: null,
        playerCardId: null,
        bannerId: null,
        emblemId: null,
        titleId: null,
      },
    });
    mocks.loadQuestSnapshot.mockResolvedValue({
      daily: [
        {
          id: "dq_1",
          title: "Play once",
          description: "Finish one match.",
          track: "daily",
          target: 1,
          progress: 0,
          reward: { coins: 100, passXp: 50 },
          isCompleted: false,
        },
      ],
      weekly: [],
      seasonal: [],
    });
    mocks.fetchLeaderboard.mockResolvedValue([]);
    mocks.fetchSocialDirectory.mockResolvedValue([]);
  });

  it("prefers live Supabase rows for discovery content when available", async () => {
    mocks.responses.daily_challenges = {
      data: [
        {
          id: "dc_live",
          challenge_date: "2026-03-19",
          puzzle_type: "logic_sequence",
          puzzle_seed: 19031,
          difficulty: 4,
          time_limit: 75,
          grid_size: 6,
          title: "Live Logic Sprint",
          description: "Sequence logic from the live table.",
          reward_json: { xp: 420, coins: 900, pass_xp: 160 },
          completed_by: 87,
          active: true,
        },
      ],
    };
    mocks.responses.tournaments = {
      data: [
        {
          id: "tour_live",
          name: "Live Finals",
          puzzle_type: "maze",
          entry_fee: 250,
          prize_pool: 9000,
          max_players: 32,
          current_players: 21,
          starts_at: "2026-03-20T18:00:00Z",
          status: "upcoming",
          active: true,
        },
      ],
    };
    mocks.responses.puzzle_catalog = {
      data: [
        {
          type: "maze",
          sort_order: 1,
          label: "Maze Rush",
          icon: "Maze",
          description: "Navigate a live maze feed.",
          active: true,
        },
      ],
    };

    const snapshot = await loadDiscoveryContent();

    expect(snapshot.sources).toEqual({
      dailyChallenges: "supabase",
      tournaments: "supabase",
      puzzleTypes: "supabase",
    });
    expect(snapshot.dailyChallenges[0]).toMatchObject({
      id: "dc_live",
      title: "Live Logic Sprint",
      completedBy: 87,
      puzzleConfig: {
        type: "logic_sequence",
        seed: 19031,
        difficulty: 4,
        timeLimit: 75,
        gridSize: 6,
      },
      reward: {
        xp: 420,
        coins: 900,
        passXp: 160,
      },
    });
    expect(snapshot.tournaments[0]).toMatchObject({
      id: "tour_live",
      puzzleType: "maze",
      prizePool: 9000,
      status: "upcoming",
    });
    expect(snapshot.puzzleTypes).toEqual([
      {
        type: "maze",
        label: "Maze Rush",
        icon: "Maze",
        description: "Navigate a live maze feed.",
      },
    ]);
  });

  it("uses live season metadata while preserving quest and entitlement service data", async () => {
    mocks.responses.seasons = {
      data: [
        {
          id: "season_12",
          name: "Signal Forge",
          season_number: 12,
          starts_at: "2026-03-01",
          ends_at: "2026-05-31",
          current_tier: 8,
          max_tier: 30,
          is_premium: false,
          tracks_json: [
            {
              tier: 1,
              freeReward: { type: "coins", amount: 500, label: "500 Coins" },
              premiumReward: { type: "item", itemId: "s_9", label: "Exclusive Item" },
              isUnlocked: true,
            },
            {
              tier: 2,
              freeReward: { type: "pass_xp", amount: 120, label: "120 Pass XP" },
              premiumReward: { type: "gems", amount: 40, label: "40 Gems" },
              isUnlocked: true,
            },
          ],
          metadata: { seasonKey: "season-12" },
          active: true,
        },
      ],
    };

    const user = { id: "user-1", isGuest: false } as UserProfile;
    const snapshot = await loadSeasonContent(user);

    expect(snapshot.sources).toEqual({
      season: "supabase",
      entitlements: "supabase",
      quests: "supabase",
    });
    expect(snapshot.hasSeasonPass).toBe(true);
    expect(snapshot.season).toMatchObject({
      id: "season_12",
      name: "Signal Forge",
      seasonNumber: 12,
      currentTier: 8,
      maxTier: 30,
    });
    expect(snapshot.season.tracks[0]).toMatchObject({
      tier: 1,
      freeReward: { type: "coins", amount: 500, label: "500 Coins" },
      premiumReward: { type: "item", itemId: "s_9", label: "Exclusive Item" },
      isUnlocked: true,
    });
    expect(snapshot.quests.daily).toHaveLength(1);
    expect(mocks.fetchStorefront).toHaveBeenCalledWith(user);
    expect(mocks.loadQuestSnapshot).toHaveBeenCalledWith(user);
  });
});
