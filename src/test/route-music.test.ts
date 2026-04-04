import { describe, expect, it } from "vitest";
import { resolveRouteMusicCue, ROUTE_MUSIC_PLAYLISTS } from "@/lib/route-music";

describe("route music", () => {
  it("maps the home route to the dashboard playlist", () => {
    expect(resolveRouteMusicCue("/")).toBe("dashboard");
  });

  it("maps match and arena gameplay routes to the arena playlist", () => {
    expect(resolveRouteMusicCue("/match")).toBe("arena");
    expect(resolveRouteMusicCue("/play/head-to-head")).toBe("arena");
    expect(resolveRouteMusicCue("/play/neon-rivals")).toBe("arena");
  });

  it("maps the non-gameplay shell routes to the dashboard playlist", () => {
    expect(resolveRouteMusicCue("/settings")).toBe("dashboard");
    expect(resolveRouteMusicCue("/play")).toBe("dashboard");
    expect(resolveRouteMusicCue("/store")).toBe("dashboard");
    expect(resolveRouteMusicCue("/profile")).toBe("dashboard");
  });

  it("uses a quieter dashboard mix than the arena mix", () => {
    expect(ROUTE_MUSIC_PLAYLISTS.dashboard.tracks).toHaveLength(2);
    expect(ROUTE_MUSIC_PLAYLISTS.arena.tracks).toHaveLength(7);
    expect(ROUTE_MUSIC_PLAYLISTS.dashboard.volume).toBeLessThan(
      ROUTE_MUSIC_PLAYLISTS.arena.volume,
    );
  });
});
