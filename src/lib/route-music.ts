export type RouteMusicCue = "dashboard" | "arena" | null;

export type RouteMusicPlaylist = {
  tracks: string[];
  volume: number;
};

export const ROUTE_MUSIC_PLAYLISTS: Record<Exclude<RouteMusicCue, null>, RouteMusicPlaylist> = {
  dashboard: {
    tracks: [
      "/media/season1/audio/dashboard/dashboard-dreams.mp3",
      "/media/season1/audio/dashboard/pause-menu-loops.mp3",
    ],
    volume: 0.18,
  },
  arena: {
    tracks: [
      "/media/season1/audio/arena/arcade-tension.mp3",
      "/media/season1/audio/arena/board-barricades.mp3",
      "/media/season1/audio/arena/glitch-accents.mp3",
      "/media/season1/audio/arena/mental-arena.mp3",
      "/media/season1/audio/arena/nemesis-network.mp3",
      "/media/season1/audio/arena/puzzle-grooves.mp3",
      "/media/season1/audio/arena/strategic-gameplay.mp3",
    ],
    volume: 0.28,
  },
};

export function resolveRouteMusicCue(pathname: string): RouteMusicCue {
  if (
    pathname.startsWith("/match") ||
    pathname.startsWith("/play/head-to-head") ||
    pathname.startsWith("/play/neon-rival")
  ) {
    return "arena";
  }

  if (pathname.startsWith("/")) {
    return "dashboard";
  }

  return null;
}
