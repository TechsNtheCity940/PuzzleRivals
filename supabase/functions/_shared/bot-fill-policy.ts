export const MATCHMAKING_BOT_FILL_GRACE_MS = {
  ranked: 12_000,
  head_to_head: 7_000,
  default: 9_000,
} as const;

export function getBotFillGraceMs(mode: string | null | undefined) {
  if (mode === "head_to_head") {
    return MATCHMAKING_BOT_FILL_GRACE_MS.head_to_head;
  }

  if (mode === "ranked") {
    return MATCHMAKING_BOT_FILL_GRACE_MS.ranked;
  }

  return MATCHMAKING_BOT_FILL_GRACE_MS.default;
}

function toTimestampMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function shouldBackfillLobbyWithBots(input: {
  mode: string | null | undefined;
  status: "filling" | "ready" | "practice" | "live" | "intermission" | "complete";
  maxPlayers: number;
  activePlayers: Array<{ joinedAt: string | null; isBot: boolean }>;
  nowMs?: number;
}) {
  if (input.status !== "filling") {
    return false;
  }

  if (input.activePlayers.length === 0 || input.activePlayers.length >= input.maxPlayers) {
    return false;
  }

  const realPlayers = input.activePlayers.filter((player) => !player.isBot);
  if (realPlayers.length === 0) {
    return false;
  }

  const oldestRealJoinedAtMs = realPlayers
    .map((player) => toTimestampMs(player.joinedAt))
    .filter((timestamp): timestamp is number => timestamp !== null)
    .sort((left, right) => left - right)[0];

  if (oldestRealJoinedAtMs === undefined) {
    return false;
  }

  const nowMs = input.nowMs ?? Date.now();
  return nowMs - oldestRealJoinedAtMs >= getBotFillGraceMs(input.mode);
}
