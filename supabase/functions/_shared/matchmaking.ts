import { createAdminClient } from "./supabase.ts";

export async function getLobbySnapshot(lobbyId: string) {
  const admin = createAdminClient();

  const [{ data: lobby, error: lobbyError }, { data: players, error: playersError }, { data: round, error: roundError }] =
    await Promise.all([
      admin.from("lobbies").select("*").eq("id", lobbyId).maybeSingle(),
      admin.from("lobby_players").select("*, profiles!inner(id, username, rank, elo)").eq("lobby_id", lobbyId).is("left_at", null),
      admin.from("rounds").select("*").eq("lobby_id", lobbyId).order("round_no", { ascending: false }).limit(1).maybeSingle(),
    ]);

  if (lobbyError) throw lobbyError;
  if (playersError) throw playersError;
  if (roundError) throw roundError;

  return {
    lobby,
    players,
    round,
  };
}
