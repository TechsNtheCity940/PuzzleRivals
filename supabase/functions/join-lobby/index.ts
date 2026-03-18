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
    const { mode, region = "global" } = await req.json();
    const admin = createAdminClient();

    const { data, error } = await admin.rpc("join_lobby", {
      p_user_id: user.id,
      p_mode: mode,
      p_region: region,
    });

    if (error) throw error;

    const lobbyId = data?.[0]?.lobby_id as string;
    await advanceLobbyState(lobbyId);
    const snapshot = await getLobbySnapshot(lobbyId);
    await broadcastLobbySnapshot(lobbyId);
    return Response.json(snapshot, { headers: corsHeaders });
  } catch (error) {
    const details =
      typeof error === "object" && error !== null
        ? {
            message: "message" in error ? String(error.message ?? "") : "",
            code: "code" in error ? String(error.code ?? "") : "",
            details: "details" in error ? String(error.details ?? "") : "",
            hint: "hint" in error ? String(error.hint ?? "") : "",
          }
        : null;

    return Response.json(
      {
        message: error instanceof Error
          ? error.message
          : details?.message || "Failed to join lobby.",
        details,
      },
      { status: 400, headers: corsHeaders },
    );
  }
});
