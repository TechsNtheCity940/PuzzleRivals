import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { advanceLobbyState } from "../_shared/lobby-state.ts";
import { getLobbySnapshot } from "../_shared/matchmaking.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireUser(req);
    const { lobbyId } = await req.json();
    await advanceLobbyState(lobbyId);
    const snapshot = await getLobbySnapshot(lobbyId);
    return Response.json(snapshot, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to sync lobby." },
      { status: 400, headers: corsHeaders },
    );
  }
});
