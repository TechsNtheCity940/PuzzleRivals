import {
  loadDiscoveryContent,
  loadNotificationSummary,
  loadProfileContent,
  loadSeasonContent,
  loadStoreContent,
} from "@/lib/game-content";

describe("game content service", () => {
  it("exposes explicit unavailable states when discovery is offline", async () => {
    const snapshot = await loadDiscoveryContent();

    expect(snapshot.dailyChallenges).toEqual([]);
    expect(snapshot.tournaments).toEqual([]);
    expect(snapshot.puzzleTypes).toEqual([]);
    expect(snapshot.sources.dailyChallenges).toBe("supabase");
    expect(snapshot.sources.tournaments).toBe("supabase");
    expect(snapshot.sources.puzzleTypes).toBe("supabase");
    expect(snapshot.resolutions).toEqual({
      dailyChallenges: "unavailable",
      tournaments: "unavailable",
      puzzleTypes: "unavailable",
    });
  });

  it("exposes explicit unavailable states for season data when live services are offline", async () => {
    const snapshot = await loadSeasonContent(null);

    expect(snapshot.season).toBeNull();
    expect(snapshot.quests).toEqual({
      daily: [],
      weekly: [],
      seasonal: [],
    });
    expect(snapshot.sources.season).toBe("supabase");
    expect(snapshot.sources.entitlements).toBe("supabase");
    expect(snapshot.sources.quests).toBe("supabase");
    expect(snapshot.resolutions).toEqual({
      season: "unavailable",
      entitlements: "unavailable",
      quests: "unavailable",
    });
  });

  it("loads profile content with honest unavailable states for non-live sessions", async () => {
    const snapshot = await loadProfileContent();

    expect(snapshot.leaderboard).toEqual([]);
    expect(snapshot.socialDirectory).toEqual([]);
    expect(snapshot.puzzleTypes).toEqual([]);
    expect(snapshot.activityFeed).toEqual([]);
    expect(snapshot.sources.leaderboard).toBe("supabase");
    expect(snapshot.sources.socialDirectory).toBe("supabase");
    expect(snapshot.sources.puzzleTypes).toBe("supabase");
    expect(snapshot.sources.activityFeed).toBe("supabase");
    expect(snapshot.resolutions).toEqual({
      leaderboard: "unavailable",
      socialDirectory: "unavailable",
      puzzleTypes: "unavailable",
      activityFeed: "unavailable",
    });
  });

  it("builds an unavailable notification summary when live activity is offline", async () => {
    const summary = await loadNotificationSummary();

    expect(summary.source).toBe("supabase");
    expect(summary.resolution).toBe("unavailable");
    expect(summary.recent).toEqual([]);
    expect(summary.unreadCount).toBe(0);
  });

  it("loads store content with explicit unavailable metadata when commerce is offline", async () => {
    const snapshot = await loadStoreContent(null);

    expect(snapshot.storefront.items).toEqual([]);
    expect(snapshot.vipMembership).toBeNull();
    expect(snapshot.sources.storefront).toBe("supabase");
    expect(snapshot.sources.vipMembership).toBe("supabase");
    expect(snapshot.resolutions).toEqual({
      storefront: "unavailable",
      vipMembership: "unavailable",
    });
  });
});
