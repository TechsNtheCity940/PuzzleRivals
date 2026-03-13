import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { advanceLobbyState } from "../_shared/lobby-state.ts";
import { broadcastLobbySnapshot } from "../_shared/realtime.ts";
import { isSolvedPuzzleSubmission, type PuzzleSubmission } from "../_shared/puzzle.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { lobbyId, stage, submission } = await req.json() as {
      lobbyId: string;
      stage: "practice" | "live";
      submission: PuzzleSubmission;
    };
    const admin = createAdminClient();

    await advanceLobbyState(lobbyId);

    const { data: round, error: roundError } = await admin
      .from("rounds")
      .select("*")
      .eq("lobby_id", lobbyId)
      .order("round_no", { ascending: false })
      .limit(1)
      .single();

    if (roundError) throw roundError;
    if (stage !== "live" || round.status !== "live") {
      throw new Error("Solve submissions are only accepted during the live round.");
    }

    const seed = stage === "practice" ? Number(round.practice_seed) : Number(round.live_seed);
    const solved = isSolvedPuzzleSubmission(round.puzzle_type, seed, round.difficulty, submission);
    if (!solved) {
      throw new Error("Submitted puzzle state is not solved.");
    }

    const solvedAtMs = round.live_started_at ? Date.now() - new Date(round.live_started_at).getTime() : 0;
    const { error } = await admin.rpc("submit_round_solve", {
      p_user_id: user.id,
      p_round_id: round.id,
      p_solved_at_ms: solvedAtMs,
      p_submission_hash: JSON.stringify(submission),
    });

    if (error) throw error;

    await advanceLobbyState(lobbyId);
    const snapshot = await broadcastLobbySnapshot(lobbyId);
    return Response.json(snapshot, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to submit solve." },
      { status: 400, headers: corsHeaders },
    );
  }
});
