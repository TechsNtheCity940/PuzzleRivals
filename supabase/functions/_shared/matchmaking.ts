import { createAdminClient } from "./supabase.ts";
import { getPuzzleMeta } from "./puzzle.ts";

export async function getLobbySnapshot(lobbyId: string) {
  const admin = createAdminClient();

  const [{ data: lobby, error: lobbyError }, { data: players, error: playersError }, { data: round, error: roundError }] =
    await Promise.all([
      admin.from("lobbies").select("*").eq("id", lobbyId).maybeSingle(),
      admin
        .from("lobby_players")
        .select("*, profiles!inner(id, username, rank, elo)")
        .eq("lobby_id", lobbyId)
        .is("left_at", null)
        .order("seat_no", { ascending: true }),
      admin.from("rounds").select("*").eq("lobby_id", lobbyId).order("round_no", { ascending: false }).limit(1).maybeSingle(),
    ]);

  if (lobbyError) throw lobbyError;
  if (playersError) throw playersError;
  if (roundError) throw roundError;

  const { data: results, error: resultsError } = round
    ? await admin.from("round_results").select("*").eq("round_id", round.id)
    : { data: [], error: null };

  if (resultsError) throw resultsError;

  const resultMap = new Map((results ?? []).map((result) => [String(result.user_id), result]));
  const playerIds = (players ?? []).map((player) => String(player.user_id));
  const { data: botRows, error: botError } = playerIds.length > 0
    ? await admin.from("bot_profiles").select("user_id").in("user_id", playerIds)
    : { data: [], error: null };

  if (botError) throw botError;

  const botIds = new Set((botRows ?? []).map((entry) => String(entry.user_id)));

  const snapshotPlayers = (players ?? []).map((player) => {
    const result = resultMap.get(String(player.user_id));
    return {
      playerId: player.user_id,
      username: player.profiles.username,
      elo: player.profiles.elo,
      rank: player.profiles.rank,
      isBot: botIds.has(String(player.user_id)),
      ready: player.is_ready,
      nextRoundVote: player.next_round_vote,
      joinedAt: player.joined_at,
      progress: Number(result?.live_progress ?? 0),
      practiceProgress: Number(result?.practice_progress ?? 0),
      solvedAtMs: result?.solved_at_ms ? Number(result.solved_at_ms) : null,
      pace: 0,
      reward: result?.placement
        ? {
            xp: Number(result.xp_delta ?? 0),
            coins: Number(result.coin_delta ?? 0),
            elo: Number(result.elo_delta ?? 0),
          }
        : undefined,
    };
  });

  return {
    lobby: {
      id: lobby?.id,
      mode: lobby?.mode,
      status: lobby?.status,
      maxPlayers: lobby?.max_players,
      createdAt: lobby?.created_at,
      updatedAt: lobby?.updated_at,
      expiresAt: lobby?.updated_at,
      players: snapshotPlayers,
      selection: round
        ? {
            puzzleType: round.puzzle_type,
            difficulty: round.difficulty,
            practiceSeed: Number(round.practice_seed),
            liveSeed: Number(round.live_seed),
            selectedAt: round.created_at,
            meta: getPuzzleMeta(round.puzzle_type),
          }
        : null,
      practiceStartsAt: round?.practice_started_at ?? null,
      practiceEndsAt: lobby?.practice_ends_at ?? null,
      liveStartsAt: round?.live_started_at ?? null,
      liveEndsAt: lobby?.live_ends_at ?? null,
      intermissionStartsAt: round?.finished_at ?? null,
      intermissionEndsAt: lobby?.intermission_ends_at ?? null,
      results: round && (round.status === "intermission" || round.status === "complete")
        ? {
            completedAt: round.finished_at,
            standings: [...snapshotPlayers]
              .filter((player) => player.reward)
              .sort((left, right) => (left.reward?.elo ?? 0) === (right.reward?.elo ?? 0)
                ? (left.solvedAtMs ?? Number.MAX_SAFE_INTEGER) - (right.solvedAtMs ?? Number.MAX_SAFE_INTEGER)
                : (right.reward?.elo ?? 0) - (left.reward?.elo ?? 0))
              .map((player, index) => ({
                playerId: player.playerId,
                username: player.username,
                progress: player.progress,
                solvedAtMs: player.solvedAtMs,
                rank: Number(resultMap.get(player.playerId)?.placement ?? index + 1),
                reward: player.reward!,
                isBot: botIds.has(player.playerId),
              })),
          }
        : null,
    },
  };
}
