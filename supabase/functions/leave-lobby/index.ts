import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { advanceLobbyState, resetLobbyForRefill } from "../_shared/lobby-state.ts";
import { broadcastLobbySnapshot } from "../_shared/realtime.ts";
import { getLobbySnapshot } from "../_shared/matchmaking.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { lobbyId } = await req.json();
    const admin = createAdminClient();

    const { error } = await admin
      .from("lobby_players")
      .update({
        left_at: new Date().toISOString(),
        is_ready: false,
        next_round_vote: "exit",
      })
      .eq("lobby_id", lobbyId)
      .eq("user_id", user.id)
      .is("left_at", null);

    if (error) throw error;

    const { data: lobby, error: lobbyError } = await admin
      .from("lobbies")
      .select("id, status, max_players")
      .eq("id", lobbyId)
      .maybeSingle<{ id: string; status: string; max_players: number }>();

    if (lobbyError) throw lobbyError;
    if (!lobby) throw new Error("Lobby not found.");

    const { count: activePlayers, error: countError } = await admin
      .from("lobby_players")
      .select("user_id", { count: "exact", head: true })
      .eq("lobby_id", lobbyId)
      .is("left_at", null);

    if (countError) throw countError;

    const remainingPlayers = activePlayers ?? 0;
    const shouldReset =
      remainingPlayers <= 1 ||
      (lobby.status === "ready" && remainingPlayers < lobby.max_players);

    if (shouldReset) {
      await resetLobbyForRefill(lobbyId);
    }

    const advancedSnapshot = await advanceLobbyState(lobbyId);
    if (advancedSnapshot) {
      return Response.json(advancedSnapshot, { headers: corsHeaders });
    }

    const snapshot = await getLobbySnapshot(lobbyId);
    await broadcastLobbySnapshot(lobbyId);
    return Response.json(snapshot, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to leave lobby." },
      { status: 400, headers: corsHeaders },
    );
  }
});
