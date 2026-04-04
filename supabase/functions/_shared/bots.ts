import { createAdminClient } from "./supabase.ts";
import { shouldBackfillLobbyWithBots } from "./bot-fill-policy.ts";
import {
  createVariantSeed,
  getHeadToHeadSolveScore,
  getLiveDurationMs,
  getLiveTargetScore,
  getSolveScore,
  isLiveScoreRacePuzzle,
  RAPID_FIRE_CUTOFF_MS,
} from "./match-rules.ts";

type BotDefinition = {
  key: string;
  email: string;
  username: string;
  rank: string;
  elo: number;
  avatarId: string;
  paceFactor: number;
  practicePeakProgress: number;
};

type BotRosterEntry = {
  userId: string;
  username: string;
  rank: string;
  elo: number;
  paceFactor: number;
  practicePeakProgress: number;
};

type LobbyRow = {
  id: string;
  mode: string;
  status: "filling" | "ready" | "practice" | "live" | "intermission" | "complete";
  max_players: number;
  created_at?: string | null;
  live_ends_at?: string | null;
};

type RoundRow = {
  id: string;
  puzzle_type?: string;
  live_seed?: number;
  status: "ready" | "practice" | "live" | "intermission" | "complete";
  practice_started_at: string | null;
  live_started_at: string | null;
};

type ActiveLobbyPlayer = {
  user_id: string;
  seat_no: number;
  joined_at: string | null;
  left_at: string | null;
};

type RoundResultRow = {
  user_id: string;
  practice_progress: number | null;
  live_progress: number | null;
  solved_at_ms: number | null;
  live_completions?: number | null;
  live_score?: number | null;
  live_score_raw?: number | null;
  current_live_seed?: number | null;
  current_variant_started_at_ms?: number | null;
};

const BOT_PASSWORD = "PuzzleRivalsBot!2026";

const MATCHMAKING_BOT_FILL_GRACE_MS = {
  ranked: 12_000,
  head_to_head: 7_000,
  default: 9_000,
} as const;

const EASY_BOTS: BotDefinition[] = [
  {
    key: "rook",
    email: "rook@bots.puzzlerivals.dev",
    username: "RookRelay",
    rank: "bronze",
    elo: 180,
    avatarId: "blue-spinner",
    paceFactor: 1.04,
    practicePeakProgress: 54,
  },
  {
    key: "glyph",
    email: "glyph@bots.puzzlerivals.dev",
    username: "GlyphGarden",
    rank: "bronze",
    elo: 260,
    avatarId: "green-cube",
    paceFactor: 0.98,
    practicePeakProgress: 61,
  },
  {
    key: "drift",
    email: "drift@bots.puzzlerivals.dev",
    username: "DriftCircuit",
    rank: "bronze",
    elo: 340,
    avatarId: "violet-popper",
    paceFactor: 0.92,
    practicePeakProgress: 68,
  },
  {
    key: "moss",
    email: "moss@bots.puzzlerivals.dev",
    username: "MossMatrix",
    rank: "silver",
    elo: 420,
    avatarId: "orange-cube",
    paceFactor: 0.88,
    practicePeakProgress: 74,
  },
];

let botRosterPromise: Promise<BotRosterEntry[]> | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashString(input: string) {
  let hash = 0;
  for (const char of input) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }
  return hash;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

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
  status: LobbyRow["status"];
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

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw error;
    }

    const match = data.users.find((user) => normalizeEmail(user.email ?? "") === email);
    if (match) {
      return match;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

async function ensureBotAccount(admin: ReturnType<typeof createAdminClient>, bot: BotDefinition) {
  const email = normalizeEmail(bot.email);
  const existingUser = await findUserByEmail(admin, email);

  if (!existingUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: BOT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: bot.username,
        is_bot: true,
        bot_difficulty: "easy",
      },
    });

    if (error) {
      throw error;
    }

    return data.user.id;
  }

  const { error } = await admin.auth.admin.updateUserById(existingUser.id, {
    email,
    password: BOT_PASSWORD,
    email_confirm: true,
    user_metadata: {
      ...(existingUser.user_metadata ?? {}),
      username: bot.username,
      is_bot: true,
      bot_difficulty: "easy",
    },
  });

  if (error) {
    throw error;
  }

  return existingUser.id;
}

export async function ensureEasyBotRoster() {
  if (!botRosterPromise) {
    botRosterPromise = (async () => {
      const admin = createAdminClient();
      const roster: BotRosterEntry[] = [];

      for (const bot of EASY_BOTS) {
        const userId = await ensureBotAccount(admin, bot);

        const { error: profileError } = await admin.from("profiles").upsert({
          id: userId,
          username: bot.username,
          rank: bot.rank,
          elo: bot.elo,
          level: 6,
          xp: 640,
          xp_to_next: 1800,
          coins: 480,
          gems: 0,
          avatar_id: bot.avatarId,
        });
        if (profileError) {
          throw profileError;
        }

        const { error: statsError } = await admin.from("player_stats").upsert({
          user_id: userId,
          wins: 8,
          losses: 17,
          matches_played: 25,
          win_streak: 0,
          best_streak: 2,
        });
        if (statsError) {
          throw statsError;
        }

        const { error: botError } = await admin.from("bot_profiles").upsert({
          user_id: userId,
          difficulty: "easy",
          pace_factor: bot.paceFactor,
          practice_peak_progress: bot.practicePeakProgress,
        });
        if (botError) {
          throw botError;
        }

        roster.push({
          userId,
          username: bot.username,
          rank: bot.rank,
          elo: bot.elo,
          paceFactor: bot.paceFactor,
          practicePeakProgress: bot.practicePeakProgress,
        });
      }

      return roster;
    })().catch((error) => {
      botRosterPromise = null;
      throw error;
    });
  }

  return botRosterPromise;
}

export async function fillLobbyWithEasyBots(lobbyId: string) {
  const admin = createAdminClient();
  const { data: lobby, error: lobbyError } = await admin
    .from("lobbies")
    .select("id, mode, status, max_players, created_at")
    .eq("id", lobbyId)
    .maybeSingle();

  if (lobbyError) {
    throw lobbyError;
  }

  if (!lobby || lobby.status !== "filling") {
    return false;
  }

  const { data: activePlayers, error: playersError } = await admin
    .from("lobby_players")
    .select("user_id, seat_no, joined_at, left_at")
    .eq("lobby_id", lobbyId)
    .is("left_at", null)
    .order("seat_no", { ascending: true });

  if (playersError) {
    throw playersError;
  }

  const normalizedPlayers = (activePlayers ?? []) as ActiveLobbyPlayer[];
  if (normalizedPlayers.length >= lobby.max_players) {
    return false;
  }

  const { data: activeBotRows, error: activeBotError } = normalizedPlayers.length > 0
    ? await admin
      .from("bot_profiles")
      .select("user_id")
      .in("user_id", normalizedPlayers.map((player) => player.user_id))
    : { data: [], error: null };

  if (activeBotError) {
    throw activeBotError;
  }

  const activeBotIds = new Set((activeBotRows ?? []).map((row) => String(row.user_id)));
  const activeLobbyPlayers = normalizedPlayers.map((player) => ({
    joinedAt: player.joined_at,
    isBot: activeBotIds.has(String(player.user_id)),
  }));

  if (!shouldBackfillLobbyWithBots({
    mode: lobby.mode,
    status: lobby.status,
    maxPlayers: lobby.max_players,
    activePlayers: activeLobbyPlayers,
  })) {
    return false;
  }

  const roster = await ensureEasyBotRoster();
  const occupiedIds = new Set(normalizedPlayers.map((player) => player.user_id));
  const occupiedSeats = new Set(normalizedPlayers.map((player) => player.seat_no));
  const openSeats = Array.from({ length: lobby.max_players }, (_, index) => index + 1).filter((seat) => !occupiedSeats.has(seat));
  const fillCount = Math.min(openSeats.length, lobby.max_players - normalizedPlayers.length);

  const selectedBots = roster
    .filter((bot) => !occupiedIds.has(bot.userId))
    .slice(0, fillCount);

  if (selectedBots.length === 0) {
    return false;
  }

  const joinedAt = new Date().toISOString();
  const payload = selectedBots.map((bot, index) => ({
    lobby_id: lobbyId,
    user_id: bot.userId,
    seat_no: openSeats[index],
    joined_at: joinedAt,
    is_ready: true,
    next_round_vote: "continue",
    left_at: null,
  }));

  const { error: upsertError } = await admin
    .from("lobby_players")
    .upsert(payload, { onConflict: "lobby_id,user_id" });

  if (upsertError) {
    throw upsertError;
  }

  return true;
}

export async function clearActiveBotsFromLobby(lobbyId: string) {
  const admin = createAdminClient();
  const { data: activePlayers, error: playersError } = await admin
    .from("lobby_players")
    .select("user_id")
    .eq("lobby_id", lobbyId)
    .is("left_at", null);

  if (playersError) {
    throw playersError;
  }

  const activeIds = (activePlayers ?? []).map((player) => String(player.user_id));
  if (activeIds.length === 0) {
    return false;
  }

  const { data: activeBotRows, error: activeBotError } = await admin
    .from("bot_profiles")
    .select("user_id")
    .in("user_id", activeIds);

  if (activeBotError) {
    throw activeBotError;
  }

  const botIds = (activeBotRows ?? []).map((row) => String(row.user_id));
  if (botIds.length === 0) {
    return false;
  }

  const { error: clearError } = await admin
    .from("lobby_players")
    .update({
      left_at: new Date().toISOString(),
      is_ready: false,
      next_round_vote: null,
    })
    .eq("lobby_id", lobbyId)
    .in("user_id", botIds)
    .is("left_at", null);

  if (clearError) {
    throw clearError;
  }

  return true;
}

export async function hydrateBotRoundProgress(
  lobby: LobbyRow,
  activePlayers: Array<{ user_id: string }>,
  round: RoundRow | null,
  results: Array<Record<string, unknown>>,
) {
  if (!round || (lobby.status !== "practice" && lobby.status !== "live")) {
    return false;
  }

  const admin = createAdminClient();
  const activeIds = activePlayers.map((player) => player.user_id);
  if (activeIds.length === 0) {
    return false;
  }

  const { data: botRows, error: botError } = await admin
    .from("bot_profiles")
    .select("user_id, pace_factor, practice_peak_progress")
    .in("user_id", activeIds);

  if (botError) {
    throw botError;
  }

  const easyBots = (botRows ?? []) as Array<{
    user_id: string;
    pace_factor: number;
    practice_peak_progress: number;
  }>;

  if (easyBots.length === 0) {
    return false;
  }

  const resultMap = new Map(
    (results as RoundResultRow[]).map((entry) => [String(entry.user_id), entry]),
  );

  const updates: Array<Record<string, unknown>> = [];

  for (const bot of easyBots) {
    const signature = hashString(`${round.id}:${bot.user_id}`);
    const variance = ((signature % 19) - 9) / 100;

    if (lobby.status === "practice" && round.practice_started_at) {
      const elapsedMs = Math.max(0, Date.now() - new Date(round.practice_started_at).getTime());
      const targetProgress = Math.round(
        clamp(elapsedMs / 12000, 0, 1) * clamp(Number(bot.practice_peak_progress) + variance * 100, 28, 86),
      );
      const current = Number(resultMap.get(bot.user_id)?.practice_progress ?? 0);
      if (targetProgress > current) {
        updates.push({
          round_id: round.id,
          user_id: bot.user_id,
          practice_progress: targetProgress,
        });
      }
    }

    if (lobby.status === "live" && round.live_started_at) {
      const elapsedMs = Math.max(0, Date.now() - new Date(round.live_started_at).getTime());
      const current = resultMap.get(bot.user_id);
      const scoreRace = isLiveScoreRacePuzzle(lobby.mode, round.puzzle_type ?? null);

      if (scoreRace && typeof round.live_seed === "number") {
        const repeatWindowMs = Math.max(0, getLiveDurationMs(lobby.mode) - RAPID_FIRE_CUTOFF_MS);
        const baseCycleMs = lobby.mode === "head_to_head" ? 14_500 : 7_000;
        const cycleMs = Math.round(
          baseCycleMs * clamp(Number(bot.pace_factor) + variance, 0.84, 1.14),
        );
        const elapsedInsideWindow = Math.min(elapsedMs, repeatWindowMs);
        const targetScore = getLiveTargetScore(lobby.mode);
        let completedCycles = 0;
        let completionScore = 0;
        let variantStartedAtMs = 0;
        let cycleElapsedMs = elapsedInsideWindow;
        let reachedTarget = false;

        while (cycleElapsedMs >= cycleMs) {
          const solveGain = lobby.mode === "head_to_head"
            ? getHeadToHeadSolveScore({
                solveMs: cycleMs,
                currentCompletions: completedCycles,
                currentScore: completionScore,
                targetScore: targetScore ?? undefined,
              })
            : getSolveScore(cycleMs);
          completionScore += solveGain;
          completedCycles += 1;
          variantStartedAtMs = completedCycles * cycleMs;
          cycleElapsedMs = Math.max(0, elapsedInsideWindow - variantStartedAtMs);
          if (targetScore !== null && completionScore >= targetScore) {
            reachedTarget = true;
            break;
          }
        }

        const currentProgress = Math.max(0, Number(current?.live_progress ?? 0));
        const currentVariantIndex = reachedTarget
          ? Math.max(0, completedCycles - 1)
          : completedCycles;
        const currentSeed = createVariantSeed(
          Number(round.live_seed),
          bot.user_id,
          currentVariantIndex,
        );
        const currentVariantStartedAtMs = reachedTarget
          ? Math.max(0, variantStartedAtMs - cycleMs)
          : variantStartedAtMs;
        const targetProgress = reachedTarget
          ? 100
          : elapsedMs >= repeatWindowMs
            ? currentProgress
            : Math.round(clamp(cycleElapsedMs / cycleMs, 0, 1) * 100);
        const bestSolveMs = completedCycles > 0 ? cycleMs : null;

        if (
          targetProgress !== currentProgress ||
          Number(current?.live_completions ?? 0) !== completedCycles ||
          Number(current?.live_score ?? 0) !== completionScore ||
          Number(current?.live_score_raw ?? current?.live_score ?? 0) !== completionScore ||
          Number(current?.current_live_seed ?? 0) !== currentSeed ||
          Number(current?.current_variant_started_at_ms ?? -1) !== currentVariantStartedAtMs ||
          (bestSolveMs !== null && current?.solved_at_ms === null)
        ) {
          updates.push({
            round_id: round.id,
            user_id: bot.user_id,
            live_progress: targetProgress,
            solved_at_ms: bestSolveMs,
            live_completions: completedCycles,
            live_score: completionScore,
            live_score_raw: completionScore,
            current_live_seed: currentSeed,
            current_variant_started_at_ms: currentVariantStartedAtMs,
          });
        }
      } else {
        const completionMs = Math.round(90_000 * clamp(Number(bot.pace_factor) + variance, 0.84, 1.08));
        const solvedAtMs = completionMs <= 90_000 && elapsedMs >= completionMs ? completionMs : null;
        const targetProgress = solvedAtMs !== null
          ? 100
          : Math.round(clamp(elapsedMs / 90_000, 0, 1) * clamp(88 + variance * 100, 76, 96));
        const currentProgress = Number(current?.live_progress ?? 0);
        const nextProgress = Math.max(currentProgress, targetProgress);

        if (nextProgress > currentProgress || (solvedAtMs !== null && current?.solved_at_ms === null)) {
          updates.push({
            round_id: round.id,
            user_id: bot.user_id,
            live_progress: nextProgress,
            solved_at_ms: solvedAtMs,
            live_completions: solvedAtMs !== null ? 1 : 0,
            live_score: solvedAtMs !== null ? 100 : 0,
            live_score_raw: solvedAtMs !== null ? 100 : 0,
            current_live_seed: Number(round.live_seed ?? 0),
            current_variant_started_at_ms: 0,
          });
        }
      }
    }
  }

  if (updates.length === 0) {
    return false;
  }

  const { error: updateError } = await admin.from("round_results").upsert(updates);
  if (updateError) {
    throw updateError;
  }

  return true;
}
