import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { advanceLobbyState } from "../_shared/lobby-state.ts";
import { broadcastLobbySnapshot } from "../_shared/realtime.ts";
import { evaluatePuzzleSubmission, type PuzzleSubmission } from "../_shared/puzzle.ts";

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
    if (stage === "practice" && round.status !== "practice") {
      throw new Error("Practice submissions are not accepted right now.");
    }
    if (stage === "live" && round.status !== "live") {
      throw new Error("Live submissions are not accepted right now.");
    }

    const seed = stage === "practice" ? Number(round.practice_seed) : Number(round.live_seed);
    const progress = evaluatePuzzleSubmission(round.puzzle_type, seed, round.difficulty, submission);

    const { error } = await admin.rpc("submit_round_progress", {
      p_user_id: user.id,
      p_round_id: round.id,
      p_stage: stage,
      p_progress: progress,
      p_submission_hash: JSON.stringify(submission),
    });

    if (error) throw error;

    await advanceLobbyState(lobbyId);
    const snapshot = await broadcastLobbySnapshot(lobbyId);
    return Response.json({ progress, ...snapshot }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to submit progress." },
      { status: 400, headers: corsHeaders },
    );
  }
});
