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
    const { lobbyId } = await req.json();
    const admin = createAdminClient();

    const { error } = await admin.rpc("mark_player_ready", {
      p_user_id: user.id,
      p_lobby_id: lobbyId,
    });

    if (error) throw error;
    const advancedSnapshot = await advanceLobbyState(lobbyId);
    if (advancedSnapshot) {
      return Response.json(advancedSnapshot, { headers: corsHeaders });
    }

    const snapshot = await getLobbySnapshot(lobbyId);
    await broadcastLobbySnapshot(lobbyId);
    return Response.json(snapshot, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to ready lobby." },
      { status: 400, headers: corsHeaders },
    );
  }
});
