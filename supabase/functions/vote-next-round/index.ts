import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { getLobbySnapshot } from "../_shared/matchmaking.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { lobbyId, vote } = await req.json();
    const admin = createAdminClient();

    const { error } = await admin
      .from("lobby_players")
      .update({ next_round_vote: vote })
      .eq("lobby_id", lobbyId)
      .eq("user_id", user.id);

    if (error) throw error;

    const snapshot = await getLobbySnapshot(lobbyId);
    return Response.json(snapshot, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Failed to submit vote." }, {
      status: 400,
      headers: corsHeaders,
    });
  }
});
