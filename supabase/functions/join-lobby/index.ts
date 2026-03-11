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
    const { mode, region = "global" } = await req.json();
    const admin = createAdminClient();

    const { data: existingLobby } = await admin
      .from("lobbies")
      .select("*")
      .eq("mode", mode)
      .eq("region", region)
      .eq("status", "filling")
      .order("created_at", { ascending: true })
      .limit(1);

    let lobby = existingLobby?.[0] ?? null;

    if (!lobby) {
      const { data: createdLobby, error: createError } = await admin
        .from("lobbies")
        .insert({ mode, region, status: "filling", max_players: 4 })
        .select("*")
        .single();

      if (createError) throw createError;
      lobby = createdLobby;
    }

    const { data: currentPlayers } = await admin
      .from("lobby_players")
      .select("seat_no")
      .eq("lobby_id", lobby.id)
      .is("left_at", null)
      .order("seat_no", { ascending: true });

    const takenSeats = new Set((currentPlayers ?? []).map((entry) => entry.seat_no));
    let seatNo = 1;
    while (takenSeats.has(seatNo)) seatNo += 1;

    await admin.from("queue_entries").upsert({
      user_id: user.id,
      mode,
      region,
      status: "matched",
    });

    await admin.from("lobby_players").upsert({
      lobby_id: lobby.id,
      user_id: user.id,
      seat_no: seatNo,
      is_ready: false,
      next_round_vote: null,
      left_at: null,
    });

    const snapshot = await getLobbySnapshot(lobby.id);
    return Response.json(snapshot, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Failed to join lobby." }, {
      status: 400,
      headers: corsHeaders,
    });
  }
});
