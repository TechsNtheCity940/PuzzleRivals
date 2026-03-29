import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserProfile } from "@/lib/types";

const mocks = vi.hoisted(() => {
  const state = {
    responses: {} as Record<string, Array<{ data?: unknown; error?: unknown }>>,
    from: vi.fn(),
    invoke: vi.fn(),
  };

  state.from.mockImplementation((table: string) => {
    const query: {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      single: ReturnType<typeof vi.fn>;
      then: PromiseLike<{ data: unknown; error: unknown }>["then"];
    } = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      single: vi.fn(() => query),
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
    functions: {
      invoke: mocks.invoke,
    },
  },
  supabaseConfigErrorMessage: "Supabase is not configured.",
  isSupabaseSchemaSetupIssue: vi.fn((error: unknown) => {
    return Boolean(error && typeof error === "object" && "code" in error && error.code === "42P01");
  }),
}));

import { fetchStorefront } from "@/lib/storefront";

function createUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: overrides.id ?? "user-1",
    username: overrides.username ?? "Judge",
    email: overrides.email ?? null,
    appRole: overrides.appRole ?? null,
    elo: overrides.elo ?? 1200,
    rank: overrides.rank ?? "gold",
    level: overrides.level ?? 10,
    xp: overrides.xp ?? 1000,
    xpToNext: overrides.xpToNext ?? 2000,
    coins: overrides.coins ?? 120,
    gems: overrides.gems ?? 8,
    puzzleShards: overrides.puzzleShards ?? 3,
    rankPoints: overrides.rankPoints ?? 1200,
    passXp: overrides.passXp ?? 200,
    wins: overrides.wins ?? 12,
    losses: overrides.losses ?? 8,
    winStreak: overrides.winStreak ?? 2,
    bestStreak: overrides.bestStreak ?? 4,
    matchesPlayed: overrides.matchesPlayed ?? 20,
    joinedAt: overrides.joinedAt ?? "2026-03-01",
    isVip: overrides.isVip ?? false,
    isGuest: overrides.isGuest ?? false,
    socialLinks: overrides.socialLinks ?? {},
    puzzleSkills: overrides.puzzleSkills ?? {},
    nemeses: overrides.nemeses ?? [],
    friends: overrides.friends ?? [],
  };
}

describe("storefront service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.responses = {};
  });

  it("uses live public products for guest storefront snapshots", async () => {
    mocks.responses.products = [
      {
        data: [
          {
            id: "s_11",
            kind: "player_card",
            price_usd: null,
            price_coins: null,
            price_gems: 200,
            metadata: {
              name: "Static Shock Card",
              description: "Animated neon player card.",
              category: "player_card",
              rarity: 4,
              featured: true,
              collection: "Neon Rivals",
            },
          },
          {
            id: "vip_monthly",
            kind: "vip",
            price_usd: 7.99,
            price_coins: null,
            price_gems: null,
            metadata: {
              name: "VIP Membership",
              description: "Monthly VIP access.",
              category: "bundle",
              rarity: 4,
              perks: ["Priority matchmaking", "Monthly 500 Gem bonus"],
            },
          },
        ],
      },
    ];

    const snapshot = await fetchStorefront(createUser({ id: "guest-player", isGuest: true }));

    expect(snapshot.source).toBe("supabase");
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({
      id: "s_11",
      category: "player_card",
      priceGems: 200,
      isFeatured: true,
      collection: "Neon Rivals",
    });
    expect(snapshot.vipProduct).toMatchObject({
      id: "vip_monthly",
      priceUsd: 7.99,
    });
    expect(snapshot.vipMembership).toMatchObject({
      isActive: false,
      priceUsd: 7.99,
      perks: ["Priority matchmaking", "Monthly 500 Gem bonus"],
    });
    expect(snapshot.wallet?.coins).toBe(120);
  });

  it("treats the owner account as fully unlocked even before inventory sync finishes", async () => {
    mocks.responses.products = [
      {
        data: [
          {
            id: "card_neon_circuit",
            kind: "player_card",
            price_usd: null,
            price_coins: 1200,
            price_gems: null,
            metadata: {
              name: "Neon Circuit",
              description: "Season 1 player card.",
              category: "player_card",
              rarity: 4,
            },
          },
          {
            id: "vip_monthly",
            kind: "vip",
            price_usd: 7.99,
            price_coins: null,
            price_gems: null,
            metadata: {
              name: "VIP Membership",
              description: "Monthly VIP access.",
              category: "bundle",
              rarity: 4,
              perks: ["Priority matchmaking"],
            },
          },
        ],
      },
    ];
    mocks.responses.user_inventory = [{ data: [] }];
    mocks.responses.profiles = [
      {
        data: {
          coins: 80,
          gems: 1,
          puzzle_shards: 0,
          rank_points: 1200,
          pass_xp: 0,
          hint_balance: 0,
          has_season_pass: false,
          is_vip: false,
          vip_expires_at: null,
          theme_id: null,
          frame_id: null,
          player_card_id: null,
          banner_id: null,
          emblem_id: null,
          title_id: null,
        },
      },
    ];

    const snapshot = await fetchStorefront(createUser({
      id: "owner-1",
      email: "JudgeMrogan@gmail.com",
      isGuest: false,
    }));

    expect(snapshot.wallet).toMatchObject({
      isPrivileged: true,
      hasSeasonPass: true,
      isVip: true,
    });
    expect(snapshot.items[0]).toMatchObject({
      id: "card_neon_circuit",
      isOwned: true,
      isComplimentary: true,
    });
    expect(snapshot.vipProduct).toMatchObject({
      id: "vip_monthly",
      isOwned: true,
      isComplimentary: true,
    });
  });


  it("allows the owner account to claim complimentary consumables without marking them permanently owned", async () => {
    mocks.responses.products = [
      {
        data: [
          {
            id: "s_4",
            kind: "hint_pack",
            price_usd: null,
            price_coins: 2000,
            price_gems: null,
            metadata: {
              name: "Hint Pack x10",
              description: "10 puzzle hints.",
              category: "hint_pack",
              rarity: 1,
            },
          },
          {
            id: "s_5",
            kind: "bundle",
            price_usd: 4.99,
            price_coins: null,
            price_gems: null,
            metadata: {
              name: "Starter Bundle",
              description: "Starter boost.",
              category: "bundle",
              rarity: 2,
            },
          },
        ],
      },
    ];
    mocks.responses.user_inventory = [{ data: [] }];
    mocks.responses.profiles = [
      {
        data: {
          coins: 80,
          gems: 1,
          puzzle_shards: 0,
          rank_points: 1200,
          pass_xp: 0,
          hint_balance: 0,
          has_season_pass: false,
          is_vip: false,
          vip_expires_at: null,
          theme_id: null,
          frame_id: null,
          player_card_id: null,
          banner_id: null,
          emblem_id: null,
          title_id: null,
        },
      },
    ];

    const snapshot = await fetchStorefront(createUser({
      id: "owner-claim",
      email: "JudgeMrogan@gmail.com",
      isGuest: false,
    }));

    expect(snapshot.items).toEqual([
      expect.objectContaining({
        id: "s_4",
        isOwned: false,
        isComplimentary: true,
      }),
      expect.objectContaining({
        id: "s_5",
        isOwned: false,
        isComplimentary: true,
      }),
    ]);
  });

  it("maps owned live products and vip state for authenticated players", async () => {
    mocks.responses.products = [
      {
        data: [
          {
            id: "s_1",
            kind: "theme",
            price_usd: null,
            price_coins: null,
            price_gems: 120,
            metadata: {
              name: "Neon Circuit",
              description: "Electrified puzzle theme.",
              category: "theme",
              rarity: 3,
            },
          },
          {
            id: "vip_monthly",
            kind: "vip",
            price_usd: 7.99,
            price_coins: null,
            price_gems: null,
            metadata: {
              name: "VIP Membership",
              description: "Monthly VIP access.",
              category: "bundle",
              rarity: 4,
              perks: ["Priority matchmaking", "Monthly 500 Gem bonus"],
            },
          },
        ],
      },
    ];
    mocks.responses.user_inventory = [
      {
        data: [
          {
            product_id: "s_1",
            is_equipped: true,
          },
        ],
      },
    ];
    mocks.responses.profiles = [
      {
        data: {
          coins: 4500,
          gems: 80,
          puzzle_shards: 12,
          rank_points: 1440,
          pass_xp: 900,
          hint_balance: 3,
          has_season_pass: true,
          is_vip: true,
          vip_expires_at: "2026-04-20T00:00:00Z",
          theme_id: "s_1",
          frame_id: null,
          player_card_id: null,
          banner_id: null,
          emblem_id: null,
          title_id: null,
        },
      },
    ];

    const snapshot = await fetchStorefront(createUser({ id: "user-1", isGuest: false }));

    expect(snapshot.source).toBe("supabase");
    expect(snapshot.items[0]).toMatchObject({
      id: "s_1",
      isOwned: true,
      isEquipped: true,
    });
    expect(snapshot.vipProduct).toMatchObject({
      id: "vip_monthly",
      isOwned: true,
    });
    expect(snapshot.vipMembership).toMatchObject({
      isActive: true,
      expiresAt: "2026-04-20T00:00:00Z",
    });
    expect(snapshot.wallet).toMatchObject({
      coins: 4500,
      gems: 80,
      hasSeasonPass: true,
      isVip: true,
      themeId: "s_1",
    });
  });

  it("surfaces an honest live-empty storefront when no catalog rows are available", async () => {
    mocks.responses.products = [
      {
        data: [],
      },
    ];

    const snapshot = await fetchStorefront(createUser({ id: "guest-player", isGuest: true }));

    expect(snapshot.source).toBe("supabase");
    expect(snapshot.items).toEqual([]);
    expect(snapshot.vipProduct).toBeNull();
    expect(snapshot.vipMembership).toBeNull();
  });
});
