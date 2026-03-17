import { createAdminClient } from "./supabase.ts";
import {
  createVariantSeed,
  getSolveScore,
  isRapidFirePuzzleType,
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
  status: "filling" | "ready" | "practice" | "live" | "intermission" | "complete";
  max_players: number;
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
  left_at: string | null;
};

type RoundResultRow = {
  user_id: string;
  practice_progress: number | null;
  live_progress: number | null;
  solved_at_ms: number | null;
  live_completions?: number | null;
  live_score?: number | null;
  current_live_seed?: number | null;
  current_variant_started_at_ms?: number | null;
};

const BOT_PASSWORD = "PuzzleRivalsBot!2026";

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
    .select("id, status, max_players")
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
    .select("user_id, seat_no, left_at")
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

  const payload = selectedBots.map((bot, index) => ({
    lobby_id: lobbyId,
    user_id: bot.userId,
    seat_no: openSeats[index],
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
      const repeatable = isRapidFirePuzzleType(round.puzzle_type ?? null);

      if (repeatable && typeof round.live_seed === "number") {
        const repeatWindowMs = Math.max(0, 90000 - RAPID_FIRE_CUTOFF_MS);
        const cycleMs = Math.round(7000 * clamp(Number(bot.pace_factor) + variance, 0.82, 1.12));
        const elapsedInsideWindow = Math.min(elapsedMs, repeatWindowMs);
        const completedCycles = Math.floor(elapsedInsideWindow / cycleMs);
        const variantStartedAtMs = Math.min(completedCycles * cycleMs, repeatWindowMs);
        const cycleElapsedMs = Math.max(0, elapsedInsideWindow - variantStartedAtMs);
        const currentProgress = Math.max(0, Number(current?.live_progress ?? 0));
        const targetProgress = elapsedMs >= repeatWindowMs
          ? currentProgress
          : Math.round(clamp(cycleElapsedMs / cycleMs, 0, 1) * 100);
        const bestSolveMs = completedCycles > 0 ? cycleMs : null;
        const completionScore = completedCycles * getSolveScore(cycleMs);
        const currentSeed = createVariantSeed(Number(round.live_seed), bot.user_id, completedCycles);

        if (
          targetProgress !== currentProgress ||
          Number(current?.live_completions ?? 0) !== completedCycles ||
          Number(current?.live_score ?? 0) !== completionScore ||
          Number(current?.current_live_seed ?? 0) !== currentSeed ||
          Number(current?.current_variant_started_at_ms ?? -1) !== variantStartedAtMs ||
          (bestSolveMs !== null && current?.solved_at_ms === null)
        ) {
          updates.push({
            round_id: round.id,
            user_id: bot.user_id,
            live_progress: targetProgress,
            solved_at_ms: bestSolveMs,
            live_completions: completedCycles,
            live_score: completionScore,
            current_live_seed: currentSeed,
            current_variant_started_at_ms: variantStartedAtMs,
          });
        }
      } else {
        const completionMs = Math.round(90000 * clamp(Number(bot.pace_factor) + variance, 0.84, 1.08));
        const solvedAtMs = completionMs <= 90000 && elapsedMs >= completionMs ? completionMs : null;
        const targetProgress = solvedAtMs !== null
          ? 100
          : Math.round(clamp(elapsedMs / 90000, 0, 1) * clamp(88 + variance * 100, 76, 96));
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
