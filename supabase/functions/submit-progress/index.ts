import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { advanceLobbyState } from "../_shared/lobby-state.ts";
import { broadcastLobbySnapshot } from "../_shared/realtime.ts";
import { evaluatePuzzleSubmission, type PuzzleSubmission } from "../_shared/puzzle.ts";
import { isRapidFirePuzzleType } from "../_shared/match-rules.ts";

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

    const { data: currentResult, error: resultError } = await admin
      .from("round_results")
      .select("practice_progress, live_progress, current_live_seed, current_variant_started_at_ms, live_completions, live_score, solved_at_ms")
      .eq("round_id", round.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (resultError) {
      throw resultError;
    }

    const activeLiveSeed =
      stage === "live" && isRapidFirePuzzleType(round.puzzle_type)
        ? Number(currentResult?.current_live_seed ?? round.live_seed)
        : Number(round.live_seed);
    const seed = stage === "practice" ? Number(round.practice_seed) : activeLiveSeed;
    const progress = evaluatePuzzleSubmission(round.puzzle_type, seed, round.difficulty, submission);

    const practiceProgress = stage === "practice"
      ? Math.max(Number(currentResult?.practice_progress ?? 0), progress)
      : Number(currentResult?.practice_progress ?? 0);
    const liveProgress = stage === "live"
      ? Math.max(Number(currentResult?.live_progress ?? 0), progress)
      : Number(currentResult?.live_progress ?? 0);

    const payload: Record<string, unknown> = {
      round_id: round.id,
      user_id: user.id,
      submission_hash: JSON.stringify(submission),
      practice_progress: practiceProgress,
      live_progress: liveProgress,
    };

    if (stage === "live" && isRapidFirePuzzleType(round.puzzle_type)) {
      payload.current_live_seed = activeLiveSeed;
      payload.current_variant_started_at_ms = Number(currentResult?.current_variant_started_at_ms ?? 0);
      payload.live_completions = Number(currentResult?.live_completions ?? 0);
      payload.live_score = Number(currentResult?.live_score ?? 0);
      payload.solved_at_ms = currentResult?.solved_at_ms ?? null;
    }

    const { error } = await admin
      .from("round_results")
      .upsert(payload, { onConflict: "round_id,user_id" });

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
