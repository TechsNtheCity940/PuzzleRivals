import { createAdminClient } from "./supabase.ts";
import { broadcastLobbySnapshot } from "./realtime.ts";
import { createAuthoritativePuzzleSelection } from "./puzzle.ts";

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

const PRACTICE_DURATION_MS = 12_000;
const LIVE_DURATION_MS = 90_000;
const INTERMISSION_DURATION_MS = 10_000;

function getReward(rank: number) {
  if (rank === 1) return { xp: 420, coins: 700, elo: 28 };
  if (rank === 2) return { xp: 260, coins: 420, elo: 12 };
  if (rank === 3) return { xp: 170, coins: 260, elo: -4 };
  return { xp: 90, coins: 140, elo: -16 };
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

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, elo")
    .in("id", activePlayers.map((player) => player.user_id));

  const averageElo = Math.round((profiles ?? []).reduce((sum, profile) => sum + profile.elo, 0) / Math.max((profiles ?? []).length, 1));
  const selection = createAuthoritativePuzzleSelection(averageElo, lobby.mode);

  await admin.from("lobbies").update({
    status: "ready",
    current_round: lobby.current_round + 1,
    selected_puzzle_type: selection.puzzleType,
    selected_difficulty: selection.difficulty,
  }).eq("id", lobby.id);

  await admin.from("rounds").insert({
    lobby_id: lobby.id,
    round_no: lobby.current_round + 1,
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

  const solvedPlayers = results.filter((result) => (result.live_progress as number | null) !== null && (result.live_progress as number) >= 100).length;
  const liveExpired = lobby.live_ends_at ? new Date(lobby.live_ends_at).getTime() <= Date.now() : false;
  if (!liveExpired && solvedPlayers < activePlayers.length) return false;

  const admin = createAdminClient();
  const resultMap = new Map(results.map((result) => [String(result.user_id), result]));
  const ranked = activePlayers
    .map((player) => {
      const entry = resultMap.get(player.user_id);
      return {
        userId: player.user_id,
        liveProgress: Number(entry?.live_progress ?? 0),
        solvedAtMs: entry?.solved_at_ms ? Number(entry.solved_at_ms) : null,
      };
    })
    .sort((left, right) => {
      if (right.liveProgress !== left.liveProgress) return right.liveProgress - left.liveProgress;
      if (left.solvedAtMs === null && right.solvedAtMs === null) return 0;
      if (left.solvedAtMs === null) return 1;
      if (right.solvedAtMs === null) return -1;
      return left.solvedAtMs - right.solvedAtMs;
    });

  for (const [index, entry] of ranked.entries()) {
    const reward = getReward(index + 1);
    await admin.from("round_results").upsert({
      round_id: round.id,
      user_id: entry.userId,
      live_progress: entry.liveProgress,
      solved_at_ms: entry.solvedAtMs,
      placement: index + 1,
      xp_delta: reward.xp,
      coin_delta: reward.coins,
      elo_delta: reward.elo,
    });

    const [{ data: profile }, { data: stats }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", entry.userId).single(),
      admin.from("player_stats").select("*").eq("user_id", entry.userId).single(),
    ]);

    if (profile && stats) {
      const isWinner = index === 0;
      const nextElo = Math.max(0, Number(profile.elo) + reward.elo);
      const nextWinStreak = isWinner ? Number(stats.win_streak) + 1 : 0;
      await admin.from("profiles").update({
        elo: nextElo,
        rank: getRankTier(nextElo),
        xp: Number(profile.xp) + reward.xp,
        coins: Number(profile.coins) + reward.coins,
      }).eq("id", entry.userId);
      await admin.from("player_stats").update({
        wins: Number(stats.wins) + (isWinner ? 1 : 0),
        losses: Number(stats.losses) + (isWinner ? 0 : 1),
        matches_played: Number(stats.matches_played) + 1,
        win_streak: nextWinStreak,
        best_streak: Math.max(Number(stats.best_streak), nextWinStreak),
      }).eq("user_id", entry.userId);
    }
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
  return true;
}

async function resolveIntermission(lobby: LobbyRow, activePlayers: PlayerRow[]) {
  if (lobby.status !== "intermission") return false;

  const timedOut = lobby.intermission_ends_at ? new Date(lobby.intermission_ends_at).getTime() <= Date.now() : false;
  const allContinue = activePlayers.length > 0 && activePlayers.every((player) => player.next_round_vote === "continue");
  if (!timedOut && !allContinue) return false;

  const admin = createAdminClient();

  if (timedOut) {
    await admin.from("lobby_players").update({
      left_at: new Date().toISOString(),
    }).eq("lobby_id", lobby.id).is("left_at", null).is("next_round_vote", null);
  }

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

  if (activeCount >= lobby.max_players) {
    const refreshed = await getLobbyState(lobby.id);
    await ensureRoundSelection(refreshed.lobby!, refreshed.players);
  }

  return true;
}

export async function advanceLobbyState(lobbyId: string) {
  let changed = false;

  for (let index = 0; index < 5; index += 1) {
    const { lobby, players, round, results } = await getLobbyState(lobbyId);
    if (!lobby) return null;

    const stepChanged =
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
