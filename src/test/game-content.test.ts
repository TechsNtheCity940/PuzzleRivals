import {
  loadDiscoveryContent,
  loadProfileContent,
  loadSeasonContent,
  loadStoreContent,
} from "@/lib/game-content";

describe("game content service", () => {
  it("loads discovery content through a shared snapshot interface", async () => {
    const snapshot = await loadDiscoveryContent();

    expect(snapshot.dailyChallenges.length).toBeGreaterThan(0);
    expect(snapshot.tournaments.length).toBeGreaterThan(0);
    expect(snapshot.puzzleTypes.length).toBeGreaterThan(0);
    expect(snapshot.sources.dailyChallenges).toBe("seed");
    expect(snapshot.sources.tournaments).toBe("seed");
    expect(snapshot.sources.puzzleTypes).toBe("seed");
  });

  it("loads season content with explicit source metadata", async () => {
    const snapshot = await loadSeasonContent(null);

    expect(snapshot.season.maxTier).toBeGreaterThan(0);
    expect(snapshot.quests.daily.length).toBeGreaterThan(0);
    expect(snapshot.quests.weekly.length).toBeGreaterThan(0);
    expect(snapshot.quests.seasonal.length).toBeGreaterThan(0);
    expect(snapshot.sources.season).toBe("seed");
    expect(snapshot.sources.entitlements).toBe("seed");
    expect(snapshot.sources.quests).toBe("seed");
  });

  it("loads profile content with seed fallbacks for non-live sessions", async () => {
    const snapshot = await loadProfileContent();

    expect(snapshot.leaderboard.length).toBeGreaterThan(0);
    expect(snapshot.socialDirectory.length).toBeGreaterThan(0);
    expect(snapshot.puzzleTypes.length).toBeGreaterThan(0);
    expect(snapshot.activityFeed.length).toBeGreaterThan(0);
    expect(snapshot.activityFeed.some((entry) => entry.type === "match")).toBe(true);
    expect(snapshot.activityFeed.some((entry) => entry.type === "purchase")).toBe(true);
    expect(snapshot.activityFeed.some((entry) => entry.type === "social")).toBe(true);
    expect(snapshot.sources.leaderboard).toBe("seed");
    expect(snapshot.sources.socialDirectory).toBe("seed");
    expect(snapshot.sources.puzzleTypes).toBe("seed");
    expect(snapshot.sources.activityFeed).toBe("seed");
  });

  it("loads store content with explicit storefront and VIP sources", async () => {
    const snapshot = await loadStoreContent(null);

    expect(snapshot.storefront.items.length).toBeGreaterThan(0);
    expect(snapshot.vipMembership.priceUsd).toBeGreaterThan(0);
    expect(snapshot.sources.storefront).toBe("seed");
    expect(snapshot.sources.vipMembership).toBe("seed");
  });
});
