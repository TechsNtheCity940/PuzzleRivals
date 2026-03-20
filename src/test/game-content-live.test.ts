import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/lib/types";

const mocks = vi.hoisted(() => {
  const state = {
    responses: {} as Record<string, Array<{ data?: unknown; error?: unknown }>>,
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

import { loadDiscoveryContent, loadProfileContent, loadSeasonContent, loadStoreContent } from "@/lib/game-content";

describe("game content live feeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.responses = {};
    mocks.fetchStorefront.mockResolvedValue({
      items: [],
      vipProduct: null,
      vipMembership: {
        isActive: false,
        perks: ["Priority matchmaking", "Monthly 500 Gem bonus"],
        priceUsd: 7.99,
      },
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
      source: "supabase",
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
    mocks.responses.daily_challenges = [
      {
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
      },
    ];
    mocks.responses.tournaments = [
      {
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
      },
    ];
    mocks.responses.puzzle_catalog = [
      {
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
      },
    ];

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
    mocks.responses.seasons = [
      {
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
      },
    ];

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


  it("prefers persisted profile activity events when the activity stream exists", async () => {
    mocks.fetchLeaderboard.mockResolvedValue([
      {
        rank: 1,
        userId: "u_9",
        username: "TopSeed",
        elo: 3100,
        rankTier: "master",
        wins: 500,
      },
    ]);
    mocks.fetchSocialDirectory.mockResolvedValue([
      {
        id: "u_2",
        username: "CipherKing",
        avatar_id: null,
        rank: "diamond",
        elo: 2850,
        facebook_handle: null,
        tiktok_handle: "@cipherking",
      },
    ]);
    mocks.responses.profile_activity_events = [
      {
        data: [
          {
            id: "activity-1",
            event_type: "purchase",
            label: "Purchase",
            title: "Unlocked VIP Membership",
            description: "$7.99 · vip · captured",
            occurred_at: "2026-03-20T20:00:00Z",
            is_read: false,
            metadata: { productId: "vip_monthly" },
          },
          {
            id: "activity-2",
            event_type: "match",
            label: "Ranked Match",
            title: "Won a ranked Maze Rush round",
            description: "#1 finish · +120 XP · +80 Coins · +24 ELO · Round 2",
            occurred_at: "2026-03-20T19:30:00Z",
            is_read: true,
            metadata: { roundId: "round-1" },
          },
        ],
      },
    ];

    const snapshot = await loadProfileContent("user-1");

    expect(snapshot.sources.activityFeed).toBe("supabase");
    expect(snapshot.activityFeed).toEqual([
      {
        id: "activity-1",
        type: "purchase",
        label: "Purchase",
        title: "Unlocked VIP Membership",
        description: "$7.99 · vip · captured",
        occurredAt: "2026-03-20T20:00:00Z",
        isRead: false,
      },
      {
        id: "activity-2",
        type: "match",
        label: "Ranked Match",
        title: "Won a ranked Maze Rush round",
        description: "#1 finish · +120 XP · +80 Coins · +24 ELO · Round 2",
        occurredAt: "2026-03-20T19:30:00Z",
        isRead: true,
      },
    ]);
  });
  it("builds a live profile activity feed from matches, purchases, and social signals", async () => {
    mocks.fetchLeaderboard.mockResolvedValue([
      {
        rank: 1,
        userId: "u_9",
        username: "TopSeed",
        elo: 3100,
        rankTier: "master",
        wins: 500,
      },
    ]);
    mocks.fetchSocialDirectory.mockResolvedValue([
      {
        id: "u_2",
        username: "CipherKing",
        avatar_id: null,
        rank: "diamond",
        elo: 2850,
        facebook_handle: null,
        tiktok_handle: "@cipherking",
      },
    ]);

    mocks.responses.puzzle_catalog = [
      {
        data: [
          {
            type: "maze",
            sort_order: 1,
            label: "Maze Rush",
            icon: "Maze",
            description: "Navigate a live maze feed.",
            active: true,
          },
          {
            type: "logic_sequence",
            sort_order: 2,
            label: "Logic Sequence",
            icon: "Sequence",
            description: "Sequence logic.",
            active: true,
          },
        ],
      },
    ];
    mocks.responses.round_results = [
      {
        data: [
          {
            round_id: "round-1",
            created_at: "2026-03-20T19:00:00Z",
            placement: 1,
            xp_delta: 120,
            coin_delta: 80,
            elo_delta: 24,
            live_progress: 100,
            solved_at_ms: 42000,
            rounds: {
              round_no: 2,
              puzzle_type: "maze",
              difficulty: 3,
              lobbies: {
                mode: "ranked",
              },
            },
          },
        ],
      },
    ];
    mocks.responses.purchases = [
      {
        data: [
          {
            id: "purchase-1",
            status: "captured",
            amount: "9.99",
            currency: "USD",
            created_at: "2026-03-20T18:30:00Z",
            captured_at: "2026-03-20T18:31:00Z",
            purchase_items: [
              {
                product_id: "s_6",
                quantity: 1,
                unit_amount: "9.99",
                products: {
                  id: "s_6",
                  kind: "battle_pass",
                  metadata: {
                    name: "Season XI Battle Pass",
                  },
                },
              },
            ],
          },
        ],
      },
    ];
    mocks.responses.profiles = [
      {
        data: [
          {
            id: "user-1",
            username: "Judge",
            facebook_handle: "judge.fb",
            tiktok_handle: null,
            created_at: "2026-03-01T10:00:00Z",
            updated_at: "2026-03-20T17:00:00Z",
          },
        ],
      },
      {
        data: [
          {
            id: "u_2",
            username: "CipherKing",
            facebook_handle: null,
            tiktok_handle: "@cipherking",
            created_at: "2026-03-10T10:00:00Z",
            updated_at: "2026-03-20T16:45:00Z",
          },
        ],
      },
    ];

    const snapshot = await loadProfileContent("user-1");

    expect(snapshot.sources).toEqual({
      leaderboard: "supabase",
      socialDirectory: "supabase",
      puzzleTypes: "supabase",
      activityFeed: "supabase",
    });
    expect(snapshot.activityFeed.some((entry) => entry.type === "match")).toBe(true);
    expect(snapshot.activityFeed.some((entry) => entry.type === "purchase")).toBe(true);
    expect(snapshot.activityFeed.some((entry) => entry.type === "social")).toBe(true);
    expect(snapshot.activityFeed[0]).toMatchObject({
      type: "match",
      label: "Ranked Match",
      title: "Won a ranked Maze Rush round",
    });
    expect(snapshot.activityFeed.find((entry) => entry.type === "purchase")).toMatchObject({
      title: "Unlocked Season XI Battle Pass",
      description: "$9.99 · battle_pass · captured",
    });
    expect(snapshot.activityFeed.find((entry) => entry.id === "social-self-facebook")).toMatchObject({
      title: "Facebook identity linked",
      description: "judge.fb is visible in your live rival profile.",
    });
  });

  it("uses live storefront and vip metadata when the shared store service resolves live products", async () => {
    const user = { id: "user-1", isGuest: false } as UserProfile;
    mocks.fetchStorefront.mockResolvedValueOnce({
      items: [
        {
          id: "s_11",
          kind: "player_card",
          name: "Static Shock Card",
          description: "Animated neon player card.",
          category: "player_card",
          rarity: 4,
          priceGems: 200,
          isFeatured: true,
        },
      ],
      vipProduct: {
        id: "vip_monthly",
        kind: "vip",
        name: "VIP Membership",
        description: "Monthly VIP access.",
        category: "bundle",
        rarity: 4,
        priceUsd: 7.99,
        isFeatured: true,
      },
      vipMembership: {
        isActive: true,
        expiresAt: "2026-04-20T00:00:00Z",
        perks: ["Priority matchmaking", "Monthly 500 Gem bonus"],
        priceUsd: 7.99,
      },
      wallet: {
        coins: 1200,
        gems: 45,
        puzzleShards: 12,
        rankPoints: 310,
        passXp: 980,
        hintBalance: 2,
        hasSeasonPass: true,
        isVip: true,
        vipExpiresAt: "2026-04-20T00:00:00Z",
        themeId: null,
        frameId: null,
        playerCardId: null,
        bannerId: null,
        emblemId: null,
        titleId: null,
      },
      source: "supabase",
    });

    const snapshot = await loadStoreContent(user);

    expect(snapshot.sources).toEqual({
      storefront: "supabase",
      vipMembership: "supabase",
    });
    expect(snapshot.storefront.source).toBe("supabase");
    expect(snapshot.vipMembership).toMatchObject({
      isActive: true,
      expiresAt: "2026-04-20T00:00:00Z",
      perks: ["Priority matchmaking", "Monthly 500 Gem bonus"],
      priceUsd: 7.99,
    });
  });
  it("uses public live leaderboard and social discovery for guest profile snapshots", async () => {
    mocks.fetchLeaderboard.mockResolvedValue([
      {
        rank: 1,
        userId: "u_9",
        username: "TopSeed",
        elo: 3100,
        rankTier: "master",
        wins: 500,
      },
    ]);
    mocks.fetchSocialDirectory.mockResolvedValue([
      {
        id: "u_2",
        username: "CipherKing",
        avatar_id: null,
        rank: "diamond",
        elo: 2850,
        facebook_handle: null,
        tiktok_handle: "@cipherking",
      },
    ]);
    mocks.responses.puzzle_catalog = [
      {
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
      },
    ];

    const snapshot = await loadProfileContent();

    expect(snapshot.sources).toEqual({
      leaderboard: "supabase",
      socialDirectory: "supabase",
      puzzleTypes: "supabase",
      activityFeed: "seed",
    });
    expect(snapshot.leaderboard).toHaveLength(1);
    expect(snapshot.socialDirectory).toHaveLength(1);
    expect(snapshot.activityFeed.some((entry) => entry.type === "purchase")).toBe(true);
  });
});




