import { createAdminClient } from "./supabase.ts";
import { broadcastLobbySnapshot } from "./realtime.ts";
import { createAuthoritativePuzzleSelection, type MatchPlayablePuzzleType } from "./puzzle.ts";
import {
  generatePuzzleTemplate,
  type PuzzleGeneratorPlayerProfile,
} from "./puzzle-generator.ts";
import { fillLobbyWithEasyBots, hydrateBotRoundProgress } from "./bots.ts";
import { isRapidFirePuzzleType } from "./match-rules.ts";
import {
  calculateMatchReward,
  evaluateQuestProgress,
  getActiveQuestDefinitions,
  getNextDailyWinState,
  grantQuestItems,
} from "./economy.ts";

type LobbyRow = {
  id: string;
  mode: string;
  status: "filling" | "ready" | "practice" | "live" | "intermission" | "complete";
  max_players: number;
  current_round: number;
  selected_puzzle_type: string | null;
  selected_difficulty: number | null;
  practice_ends_at: string | null;
  live_ends_at: string | null;
  intermission_ends_at: string | null;
};

type PlayerRow = {
  user_id: string;
  is_ready: boolean;
  next_round_vote: "continue" | "exit" | null;
  left_at: string | null;
};

type RoundRow = {
  id: string;
  round_no: number;
  puzzle_type: string;
  difficulty: number;
  practice_seed: number;
  live_seed: number;
  status: "ready" | "practice" | "live" | "intermission" | "complete";
  practice_started_at: string | null;
  live_started_at: string | null;
  intermission_ends_at: string | null;
  finished_at: string | null;
};

type ProfileSelectionRow = {
  id: string;
  elo: number;
  best_puzzle_type: MatchPlayablePuzzleType | null;
  worst_puzzle_type: MatchPlayablePuzzleType | null;
  rival_user_id: string | null;
};

type PuzzleStatRow = {
  user_id: string;
  puzzle_type: MatchPlayablePuzzleType;
  matches_played: number;
  wins: number;
  total_progress: number;
};

type PlayerStatsRow = {
  wins: number;
  losses: number;
  matches_played: number;
  win_streak: number;
  best_streak: number;
  last_daily_win_on: string | null;
  daily_win_streak: number;
};

type HistoryResultRow = {
  round_id: string;
  user_id: string;
  placement: number | null;
  created_at: string;
};

type HistoryRoundRow = {
  id: string;
  lobby_id: string;
  puzzle_type: MatchPlayablePuzzleType;
  finished_at: string | null;
};

type HistoryLobbyRow = {
  id: string;
  mode: string;
};

type HistoryParticipationRow = {
  round_id: string;
  user_id: string;
  created_at: string;
};

const PRACTICE_DURATION_MS = 12_000;
const LIVE_DURATION_MS = 90_000;
const INTERMISSION_DURATION_MS = 10_000;

function buildPuzzleProfile(rows: PuzzleStatRow[]): Pick<PuzzleGeneratorPlayerProfile, "averageProgressByType" | "matchesPlayedByType"> {
  const averageProgressByType: Partial<Record<MatchPlayablePuzzleType, number>> = {};
  const matchesPlayedByType: Partial<Record<MatchPlayablePuzzleType, number>> = {};

  for (const row of rows) {
    matchesPlayedByType[row.puzzle_type] = row.matches_played;
    averageProgressByType[row.puzzle_type] =
      row.matches_played > 0 ? Math.round(row.total_progress / row.matches_played) : 0;
  }

  return {
    averageProgressByType,
    matchesPlayedByType,
  };
}

function deriveMaterializedPuzzleTypes(rows: PuzzleStatRow[]) {
  const stats = rows
    .filter((row) => row.matches_played > 0)
    .map((row) => ({
      type: row.puzzle_type,
      averageProgress: row.total_progress / row.matches_played,
      winRate: row.wins / row.matches_played,
      matchesPlayed: row.matches_played,
    }));

  if (stats.length === 0) {
    return {
      bestPuzzleType: null,
      worstPuzzleType: null,
    };
  }

  const best = [...stats].sort((left, right) => {
    if (right.averageProgress !== left.averageProgress) return right.averageProgress - left.averageProgress;
    if (right.winRate !== left.winRate) return right.winRate - left.winRate;
    return right.matchesPlayed - left.matchesPlayed;
  })[0];

  const worst = [...stats].sort((left, right) => {
    if (left.averageProgress !== right.averageProgress) return left.averageProgress - right.averageProgress;
    if (left.winRate !== right.winRate) return left.winRate - right.winRate;
    return right.matchesPlayed - left.matchesPlayed;
  })[0];

  return {
    bestPuzzleType: best.type,
    worstPuzzleType: worst.type,
  };
}

async function getLastLossByUserId(
  playerIds: string[],
): Promise<Partial<Record<string, MatchPlayablePuzzleType>>> {
  if (playerIds.length < 2) {
    return {};
  }

  const admin = createAdminClient();
  const { data: resultRows } = await admin
    .from("round_results")
    .select("round_id, user_id, placement, created_at")
    .in("user_id", playerIds)
    .not("placement", "is", null)
    .order("created_at", { ascending: false })
    .limit(120);

  const normalizedResults = (resultRows ?? []) as HistoryResultRow[];
  if (normalizedResults.length === 0) {
    return {};
  }

  const roundIds = [...new Set(normalizedResults.map((row) => row.round_id))];
  const { data: roundRows } = await admin
    .from("rounds")
    .select("id, puzzle_type, finished_at")
    .in("id", roundIds);

  const roundsById = new Map(
    ((roundRows ?? []) as HistoryRoundRow[]).map((row) => [row.id, row]),
  );
  const resultsByRound = new Map<string, HistoryResultRow[]>();

  for (const row of normalizedResults) {
    const bucket = resultsByRound.get(row.round_id) ?? [];
    bucket.push(row);
    resultsByRound.set(row.round_id, bucket);
  }

  const sortedRoundIds = [...resultsByRound.keys()].sort((left, right) => {
    const leftRound = roundsById.get(left);
    const rightRound = roundsById.get(right);
    const leftTs = new Date(leftRound?.finished_at ?? resultsByRound.get(left)?.[0]?.created_at ?? 0).getTime();
    const rightTs = new Date(rightRound?.finished_at ?? resultsByRound.get(right)?.[0]?.created_at ?? 0).getTime();
    return rightTs - leftTs;
  });

  const lastLossByUserId: Partial<Record<string, MatchPlayablePuzzleType>> = {};
  for (const roundId of sortedRoundIds) {
    const round = roundsById.get(roundId);
    const resultSet = resultsByRound.get(roundId) ?? [];
    if (!round || resultSet.length < 2) continue;

    for (const player of resultSet) {
      if (player.placement === null || lastLossByUserId[player.user_id]) continue;
      const beatenBy = resultSet.find(
        (candidate) =>
          candidate.user_id !== player.user_id &&
          candidate.placement !== null &&
          candidate.placement < player.placement,
      );

      if (beatenBy) {
        lastLossByUserId[player.user_id] = round.puzzle_type;
      }
    }

    if (playerIds.every((playerId) => Boolean(lastLossByUserId[playerId]))) {
      break;
    }
  }

  return lastLossByUserId;
}

async function getRecentPuzzleHistory(
  playerIds: string[],
  mode: string,
  limit = 6,
): Promise<{
  recentPuzzleTypes: MatchPlayablePuzzleType[];
  sameModeRecentPuzzleTypes: MatchPlayablePuzzleType[];
}> {
  if (playerIds.length === 0) {
    return {
      recentPuzzleTypes: [],
      sameModeRecentPuzzleTypes: [],
    };
  }

  const admin = createAdminClient();
  const { data: participationRows } = await admin
    .from("round_results")
    .select("round_id, user_id, created_at")
    .in("user_id", playerIds)
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * playerIds.length * 4, 24));

  const normalizedRows = (participationRows ?? []) as HistoryParticipationRow[];
  if (normalizedRows.length === 0) {
    return {
      recentPuzzleTypes: [],
      sameModeRecentPuzzleTypes: [],
    };
  }

  const roundIds = [...new Set(normalizedRows.map((row) => row.round_id))];
  const { data: roundRows } = await admin
    .from("rounds")
    .select("id, lobby_id, puzzle_type, finished_at")
    .in("id", roundIds);

  const normalizedRounds = (roundRows ?? []) as HistoryRoundRow[];
  if (normalizedRounds.length === 0) {
    return {
      recentPuzzleTypes: [],
      sameModeRecentPuzzleTypes: [],
    };
  }

  const lobbyIds = [...new Set(normalizedRounds.map((row) => row.lobby_id).filter(Boolean))];
  const { data: lobbyRows } = lobbyIds.length === 0
    ? { data: [] as HistoryLobbyRow[] }
    : await admin
      .from("lobbies")
      .select("id, mode")
      .in("id", lobbyIds);

  const roundsById = new Map(normalizedRounds.map((row) => [row.id, row]));
  const lobbyModeById = new Map(((lobbyRows ?? []) as HistoryLobbyRow[]).map((row) => [row.id, row.mode]));
  const participationByRound = new Map<string, HistoryParticipationRow[]>();

  for (const row of normalizedRows) {
    const bucket = participationByRound.get(row.round_id) ?? [];
    bucket.push(row);
    participationByRound.set(row.round_id, bucket);
  }

  const sortedRoundIds = [...roundIds].sort((left, right) => {
    const leftRound = roundsById.get(left);
    const rightRound = roundsById.get(right);
    const leftTs = new Date(leftRound?.finished_at ?? participationByRound.get(left)?.[0]?.created_at ?? 0).getTime();
    const rightTs = new Date(rightRound?.finished_at ?? participationByRound.get(right)?.[0]?.created_at ?? 0).getTime();
    return rightTs - leftTs;
  });

  const recentPuzzleTypes = sortedRoundIds
    .map((roundId) => roundsById.get(roundId)?.puzzle_type)
    .filter((puzzleType): puzzleType is MatchPlayablePuzzleType => Boolean(puzzleType))
    .slice(0, limit);

  const sameModeRecentPuzzleTypes = sortedRoundIds
    .map((roundId) => roundsById.get(roundId))
    .filter((round): round is HistoryRoundRow => Boolean(round))
    .filter((round) => lobbyModeById.get(round.lobby_id) === mode)
    .map((round) => round.puzzle_type)
    .slice(0, limit);

  return {
    recentPuzzleTypes,
    sameModeRecentPuzzleTypes,
  };
}


function getRankTier(elo: number) {
  if (elo >= 3200) return "master";
  if (elo >= 2600) return "diamond";
  if (elo >= 2000) return "platinum";
  if (elo >= 1400) return "gold";
  if (elo >= 800) return "silver";
  return "bronze";
}

async function getLobbyState(lobbyId: string) {
  const admin = createAdminClient();
  const [{ data: lobby }, { data: players }, { data: round }, { data: results }] = await Promise.all([
    admin.from("lobbies").select("*").eq("id", lobbyId).maybeSingle(),
    admin.from("lobby_players").select("*").eq("lobby_id", lobbyId).is("left_at", null).order("seat_no", { ascending: true }),
    admin.from("rounds").select("*").eq("lobby_id", lobbyId).order("round_no", { ascending: false }).limit(1).maybeSingle(),
    admin.from("round_results").select("*").in(
      "round_id",
      (await admin.from("rounds").select("id").eq("lobby_id", lobbyId).order("round_no", { ascending: false }).limit(1)).data?.map((entry) => entry.id) ?? ["00000000-0000-0000-0000-000000000000"],
    ),
  ]);

  return {
    admin,
    lobby: lobby as LobbyRow | null,
    players: (players ?? []) as PlayerRow[],
    round: round as RoundRow | null,
    results: results ?? [],
  };
}

async function ensureRoundSelection(lobby: LobbyRow, activePlayers: PlayerRow[]) {
  const admin = createAdminClient();
  if (lobby.status !== "filling" || activePlayers.length < lobby.max_players) return false;
  if (lobby.selected_puzzle_type) return false;

  const playerIds = activePlayers.map((player) => player.user_id);
  const [{ data: profiles }, { data: puzzleStats }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, elo, best_puzzle_type, worst_puzzle_type, rival_user_id")
      .in("id", playerIds),
    admin
      .from("player_puzzle_stats")
      .select("user_id, puzzle_type, matches_played, wins, total_progress")
      .in("user_id", playerIds),
  ]);

  const normalizedProfiles = (profiles ?? []) as ProfileSelectionRow[];
  const normalizedPuzzleStats = (puzzleStats ?? []) as PuzzleStatRow[];
  const puzzleStatsByUser = new Map<string, PuzzleStatRow[]>();
  for (const row of normalizedPuzzleStats) {
    const bucket = puzzleStatsByUser.get(row.user_id) ?? [];
    bucket.push(row);
    puzzleStatsByUser.set(row.user_id, bucket);
  }

  const averageElo = Math.round(
    normalizedProfiles.reduce((sum, profile) => sum + profile.elo, 0) /
      Math.max(normalizedProfiles.length, 1),
  );
  const nextRoundNumber = lobby.current_round + 1;
  const { recentPuzzleTypes, sameModeRecentPuzzleTypes } = await getRecentPuzzleHistory(
    playerIds,
    lobby.mode,
  );
  const lastLossByUserId =
    lobby.mode === "revenge" ? await getLastLossByUserId(playerIds) : {};

  const generatorPlayers: PuzzleGeneratorPlayerProfile[] = normalizedProfiles.map((profile) => {
    const puzzleProfile = buildPuzzleProfile(puzzleStatsByUser.get(profile.id) ?? []);
    return {
      userId: profile.id,
      bestPuzzleType: profile.best_puzzle_type,
      worstPuzzleType: profile.worst_puzzle_type,
      rivalUserId: profile.rival_user_id,
      ...puzzleProfile,
    };
  });

  const selectionSeed = `${lobby.id}:${nextRoundNumber}:${[...playerIds].sort().join("|")}:${lobby.mode}`;
  const template = generatePuzzleTemplate({
    mode: lobby.mode,
    averageElo,
    players: generatorPlayers,
    lastLossByUserId,
    recentPuzzleTypes,
    sameModeRecentPuzzleTypes,
    selectionSeed,
  });

  const selection = createAuthoritativePuzzleSelection(
    averageElo,
    lobby.mode,
    template.primaryType,
    `${selectionSeed}:${template.primaryType}`,
  );

  await admin.from("lobbies").update({
    status: "ready",
    current_round: nextRoundNumber,
    selected_puzzle_type: selection.puzzleType,
    selected_difficulty: selection.difficulty,
  }).eq("id", lobby.id);

  await admin.from("rounds").insert({
    lobby_id: lobby.id,
    round_no: nextRoundNumber,
    puzzle_type: selection.puzzleType,
    difficulty: selection.difficulty,
    practice_seed: selection.practiceSeed,
    live_seed: selection.liveSeed,
    status: "ready",
  });

  return true;
}

async function startPractice(lobby: LobbyRow, activePlayers: PlayerRow[]) {
  if (lobby.status !== "ready" || activePlayers.length < lobby.max_players) return false;
  if (!activePlayers.every((player) => player.is_ready)) return false;

  const admin = createAdminClient();
  const now = new Date();
  const practiceEndsAt = new Date(now.getTime() + PRACTICE_DURATION_MS).toISOString();
  await admin.from("lobbies").update({
    status: "practice",
    practice_ends_at: practiceEndsAt,
  }).eq("id", lobby.id);
  await admin.from("rounds").update({
    status: "practice",
    practice_started_at: now.toISOString(),
  }).eq("lobby_id", lobby.id).eq("round_no", lobby.current_round);
  return true;
}

async function startLive(lobby: LobbyRow) {
  if (lobby.status !== "practice" || !lobby.practice_ends_at) return false;
  if (new Date(lobby.practice_ends_at).getTime() > Date.now()) return false;

  const admin = createAdminClient();
  const now = new Date();
  const liveEndsAt = new Date(now.getTime() + LIVE_DURATION_MS).toISOString();
  await admin.from("lobbies").update({
    status: "live",
    live_ends_at: liveEndsAt,
  }).eq("id", lobby.id);
  await admin.from("rounds").update({
    status: "live",
    live_started_at: now.toISOString(),
  }).eq("lobby_id", lobby.id).eq("round_no", lobby.current_round);
  return true;
}

async function finalizeLiveRound(lobby: LobbyRow, activePlayers: PlayerRow[], round: RoundRow | null, results: Array<Record<string, unknown>>) {
  if (!round || lobby.status !== "live") return false;

  const liveExpired = lobby.live_ends_at ? new Date(lobby.live_ends_at).getTime() <= Date.now() : false;
  const repeatable = isRapidFirePuzzleType(round.puzzle_type);
  const solvedPlayers = results.filter((result) => (result.live_progress as number | null) !== null && (result.live_progress as number) >= 100).length;
  if ((!repeatable && !liveExpired && solvedPlayers < activePlayers.length) || (repeatable && !liveExpired)) {
    return false;
  }

  const admin = createAdminClient();
  const activeQuests = await getActiveQuestDefinitions(admin);
  const resultMap = new Map(results.map((result) => [String(result.user_id), result]));
  const ranked = activePlayers
    .map((player) => {
      const entry = resultMap.get(player.user_id);
      return {
        userId: player.user_id,
        liveProgress: Number(entry?.live_progress ?? 0),
        solvedAtMs: entry?.solved_at_ms ? Number(entry.solved_at_ms) : null,
        liveCompletions: Number(entry?.live_completions ?? (entry?.solved_at_ms ? 1 : 0)),
        liveScore: Number(entry?.live_score ?? (entry?.solved_at_ms ? 100 : 0)),
      };
    })
    .sort((left, right) => {
      if (repeatable && right.liveScore !== left.liveScore) return right.liveScore - left.liveScore;
      if (repeatable && right.liveCompletions !== left.liveCompletions) return right.liveCompletions - left.liveCompletions;
      if (right.liveProgress !== left.liveProgress) return right.liveProgress - left.liveProgress;
      if (left.solvedAtMs === null && right.solvedAtMs === null) return 0;
      if (left.solvedAtMs === null) return 1;
      if (right.solvedAtMs === null) return -1;
      return left.solvedAtMs - right.solvedAtMs;
    });

  for (const [index, entry] of ranked.entries()) {
    const rivalUserId = index === 0
      ? (ranked[1]?.userId ?? null)
      : (ranked[0]?.userId ?? null);

    const [{ data: profile }, { data: stats }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", entry.userId).single(),
      admin.from("player_stats").select("*").eq("user_id", entry.userId).single<PlayerStatsRow>(),
    ]);

    if (profile && stats) {
      const isWinner = index === 0;
      const nextWinStreak = isWinner ? Number(stats.win_streak) + 1 : 0;
      const dailyWinState = isWinner
        ? getNextDailyWinState(stats.last_daily_win_on, Number(stats.daily_win_streak ?? 0))
        : {
          lastDailyWinOn: stats.last_daily_win_on,
          dailyWinStreak: Number(stats.daily_win_streak ?? 0),
          isFirstDailyWin: false,
        };
      const reward = calculateMatchReward({
        mode: lobby.mode,
        placement: index + 1,
        currentWinStreak: Number(stats.win_streak),
        isFirstDailyWin: dailyWinState.isFirstDailyWin,
        perfectSolve: entry.liveProgress >= 100 || entry.liveCompletions > 0,
      });
      const nextElo = Math.max(0, Number(profile.elo) + reward.elo);
      const nextRankPoints = Math.max(0, Number(profile.rank_points ?? 0) + reward.rankPoints);
      const nextPassXpBeforeQuests = Math.max(0, Number(profile.pass_xp ?? 0) + reward.passXp);
      const questRewards = await evaluateQuestProgress({
        admin,
        userId: entry.userId,
        quests: activeQuests,
        mode: lobby.mode,
        placement: index + 1,
        liveProgress: entry.liveProgress,
        liveCompletions: entry.liveCompletions,
        rankPoints: nextRankPoints,
        passXp: nextPassXpBeforeQuests,
      });
      const nextPassXp = nextPassXpBeforeQuests + questRewards.passXp;
      const nextCoins = Number(profile.coins) + reward.coins + questRewards.coins;
      const nextGems = Number(profile.gems ?? 0) + questRewards.gems;
      const nextShards = Math.max(0, Number(profile.puzzle_shards ?? 0) + reward.shards + questRewards.shards);

      await admin.from("round_results").upsert({
        round_id: round.id,
        user_id: entry.userId,
        live_progress: entry.liveProgress,
        solved_at_ms: entry.solvedAtMs,
        live_completions: entry.liveCompletions,
        live_score: entry.liveScore,
        placement: index + 1,
        xp_delta: reward.xp,
        coin_delta: reward.coins,
        elo_delta: reward.elo,
        pass_xp_delta: reward.passXp,
        rank_points_delta: reward.rankPoints,
        shard_delta: reward.shards,
      });

      await admin.from("profiles").update({
        elo: nextElo,
        rank: getRankTier(nextElo),
        xp: Number(profile.xp) + reward.xp,
        coins: nextCoins,
        gems: nextGems,
        pass_xp: nextPassXp,
        rank_points: nextRankPoints,
        puzzle_shards: nextShards,
      }).eq("id", entry.userId);
      await admin.from("player_stats").update({
        wins: Number(stats.wins) + (isWinner ? 1 : 0),
        losses: Number(stats.losses) + (isWinner ? 0 : 1),
        matches_played: Number(stats.matches_played) + 1,
        win_streak: nextWinStreak,
        best_streak: Math.max(Number(stats.best_streak), nextWinStreak),
        last_daily_win_on: dailyWinState.lastDailyWinOn,
        daily_win_streak: dailyWinState.dailyWinStreak,
      }).eq("user_id", entry.userId);

      if (questRewards.itemIds.length > 0) {
        await grantQuestItems(admin, entry.userId, questRewards.itemIds, "quest_reward");
      }
    }

    const { data: puzzleStat } = await admin
      .from("player_puzzle_stats")
      .select("*")
      .eq("user_id", entry.userId)
      .eq("puzzle_type", round.puzzle_type)
      .maybeSingle();

    const nextMatches = Number(puzzleStat?.matches_played ?? 0) + 1;
    const nextWins = Number(puzzleStat?.wins ?? 0) + (index === 0 ? 1 : 0);
    const nextProgress = Number(puzzleStat?.total_progress ?? 0) + entry.liveProgress;
    const nextSolveTotal = Number(puzzleStat?.total_solve_ms ?? 0) + (entry.solvedAtMs ?? 0);
    const nextBestSolve =
      entry.solvedAtMs === null
        ? puzzleStat?.best_solve_ms ?? null
        : puzzleStat?.best_solve_ms === null || puzzleStat?.best_solve_ms === undefined
          ? entry.solvedAtMs
          : Math.min(Number(puzzleStat.best_solve_ms), entry.solvedAtMs);

    await admin.from("player_puzzle_stats").upsert({
      user_id: entry.userId,
      puzzle_type: round.puzzle_type,
      matches_played: nextMatches,
      wins: nextWins,
      total_progress: nextProgress,
      total_solve_ms: nextSolveTotal,
      best_solve_ms: nextBestSolve,
    });

    const { data: refreshedPuzzleStats } = await admin
      .from("player_puzzle_stats")
      .select("user_id, puzzle_type, matches_played, wins, total_progress")
      .eq("user_id", entry.userId);

    const materialized = deriveMaterializedPuzzleTypes(
      ((refreshedPuzzleStats ?? []) as PuzzleStatRow[]),
    );

    await admin.from("profiles").update({
      best_puzzle_type: materialized.bestPuzzleType,
      worst_puzzle_type: materialized.worstPuzzleType,
      rival_user_id: rivalUserId,
    }).eq("id", entry.userId);
  }

  const intermissionEndsAt = new Date(Date.now() + INTERMISSION_DURATION_MS).toISOString();
  await admin.from("lobbies").update({
    status: "intermission",
    intermission_ends_at: intermissionEndsAt,
  }).eq("id", lobby.id);
  await admin.from("rounds").update({
    status: "intermission",
    intermission_ends_at: intermissionEndsAt,
    finished_at: new Date().toISOString(),
  }).eq("id", round.id);
  await admin.from("lobby_players").update({
    next_round_vote: null,
    is_ready: false,
  }).eq("lobby_id", lobby.id).is("left_at", null);

  const { data: botPlayers } = await admin
    .from("bot_profiles")
    .select("user_id")
    .in("user_id", activePlayers.map((player) => player.user_id));

  const botIds = (botPlayers ?? []).map((entry) => entry.user_id);
  if (botIds.length > 0) {
    await admin.from("lobby_players").update({
      next_round_vote: "continue",
    }).eq("lobby_id", lobby.id).in("user_id", botIds).is("left_at", null);
  }
  return true;
}

async function resolveIntermission(lobby: LobbyRow, activePlayers: PlayerRow[]) {
  if (lobby.status !== "intermission") return false;

  const timedOut = lobby.intermission_ends_at ? new Date(lobby.intermission_ends_at).getTime() <= Date.now() : false;
  if (!timedOut) return false;

  const admin = createAdminClient();

  await admin.from("lobby_players").update({
    left_at: new Date().toISOString(),
  }).eq("lobby_id", lobby.id).is("left_at", null).eq("next_round_vote", "exit");

  const { data: remainingPlayers } = await admin.from("lobby_players").select("*").eq("lobby_id", lobby.id).is("left_at", null);
  const activeCount = remainingPlayers?.length ?? 0;

  await admin.from("lobby_players").update({
    is_ready: false,
    next_round_vote: null,
  }).eq("lobby_id", lobby.id).is("left_at", null);

  await admin.from("lobbies").update({
    status: "filling",
    selected_puzzle_type: null,
    selected_difficulty: null,
    practice_ends_at: null,
    live_ends_at: null,
    intermission_ends_at: null,
  }).eq("id", lobby.id);

  const refreshed = await getLobbyState(lobby.id);
  if (refreshed.lobby) {
    await fillLobbyWithEasyBots(refreshed.lobby.id);
    const refilled = await getLobbyState(lobby.id);
    if (refilled.lobby && refilled.players.length >= refilled.lobby.max_players) {
      await ensureRoundSelection(refilled.lobby, refilled.players);
    }
  }

  return true;
}

export async function advanceLobbyState(lobbyId: string) {
  let changed = false;

  for (let index = 0; index < 5; index += 1) {
    const { lobby, players, round, results } = await getLobbyState(lobbyId);
    if (!lobby) return null;

    const stepChanged =
      await fillLobbyWithEasyBots(lobby.id) ||
      await hydrateBotRoundProgress(lobby, players, round, results) ||
      await ensureRoundSelection(lobby, players) ||
      await startPractice(lobby, players) ||
      await startLive(lobby) ||
      await finalizeLiveRound(lobby, players, round, results) ||
      await resolveIntermission(lobby, players);

    if (!stepChanged) {
      if (changed) {
        return broadcastLobbySnapshot(lobbyId);
      }
      return null;
    }

    changed = true;
  }

  return broadcastLobbySnapshot(lobbyId);
}

