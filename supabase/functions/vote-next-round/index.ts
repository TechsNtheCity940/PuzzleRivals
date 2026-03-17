import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { advanceLobbyState } from "../_shared/lobby-state.ts";
import { broadcastLobbySnapshot } from "../_shared/realtime.ts";
import { getLobbySnapshot } from "../_shared/matchmaking.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { lobbyId, vote } = await req.json();
    const admin = createAdminClient();

    const payload: Record<string, unknown> = {
      next_round_vote: vote,
    };

    if (vote === "exit") {
      payload.left_at = new Date().toISOString();
    }

    const { error } = await admin
      .from("lobby_players")
      .update(payload)
      .eq("lobby_id", lobbyId)
      .eq("user_id", user.id)
      .is("left_at", null);

    if (error) throw error;

    await advanceLobbyState(lobbyId);
    const snapshot = await getLobbySnapshot(lobbyId);
    await broadcastLobbySnapshot(lobbyId);
    return Response.json(snapshot, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to submit vote." },
      { status: 400, headers: corsHeaders },
    );
  }
});
