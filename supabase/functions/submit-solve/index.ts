import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { advanceLobbyState } from "../_shared/lobby-state.ts";
import { broadcastLobbySnapshot } from "../_shared/realtime.ts";
import { getLobbySnapshot } from "../_shared/matchmaking.ts";
import { isSolvedPuzzleSubmission, type PuzzleSubmission } from "../_shared/puzzle.ts";
import {
  createVariantSeed,
  getSolveScore,
  isRapidFirePuzzleType,
  RAPID_FIRE_CUTOFF_MS,
} from "../_shared/match-rules.ts";

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

    const [{ data: lobby, error: lobbyError }, { data: currentResult, error: resultError }] = await Promise.all([
      admin.from("lobbies").select("live_ends_at").eq("id", lobbyId).single(),
      admin
        .from("round_results")
        .select("live_progress, solved_at_ms, live_completions, live_score, current_live_seed, current_variant_started_at_ms")
        .eq("round_id", round.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (lobbyError) throw lobbyError;
    if (resultError) throw resultError;

    const repeatable = isRapidFirePuzzleType(round.puzzle_type);
    const activeSeed = repeatable ? Number(currentResult?.current_live_seed ?? round.live_seed) : Number(round.live_seed);
    const solved = isSolvedPuzzleSubmission(round.puzzle_type, activeSeed, round.difficulty, submission);
    if (!solved) {
      throw new Error("Submitted puzzle state is not solved.");
    }

    const roundElapsedMs = round.live_started_at ? Math.max(0, Date.now() - new Date(round.live_started_at).getTime()) : 0;
    const variantStartedAtMs = Number(currentResult?.current_variant_started_at_ms ?? 0);
    const variantSolveMs = Math.max(0, roundElapsedMs - variantStartedAtMs);
    const currentBestSolveMs = currentResult?.solved_at_ms ? Number(currentResult.solved_at_ms) : null;
    const nextBestSolveMs = currentBestSolveMs === null ? variantSolveMs : Math.min(currentBestSolveMs, variantSolveMs);
    const nextCompletionCount = Number(currentResult?.live_completions ?? 0) + 1;
    const nextLiveScore = Number(currentResult?.live_score ?? 0) + getSolveScore(variantSolveMs);
    const liveEndsAtMs = lobby.live_ends_at ? new Date(lobby.live_ends_at).getTime() : Date.now();
    const shouldRollVariant = repeatable && liveEndsAtMs - Date.now() > RAPID_FIRE_CUTOFF_MS;

    const payload: Record<string, unknown> = {
      round_id: round.id,
      user_id: user.id,
      submission_hash: JSON.stringify(submission),
      solved_at_ms: repeatable ? nextBestSolveMs : currentBestSolveMs ?? roundElapsedMs,
      live_progress: shouldRollVariant ? 0 : 100,
      live_completions: repeatable ? nextCompletionCount : Math.max(Number(currentResult?.live_completions ?? 0), 1),
      live_score: repeatable ? nextLiveScore : Math.max(Number(currentResult?.live_score ?? 0), 100),
      current_live_seed: shouldRollVariant
        ? createVariantSeed(Number(round.live_seed), user.id, nextCompletionCount)
        : activeSeed,
      current_variant_started_at_ms: shouldRollVariant ? roundElapsedMs : variantStartedAtMs,
    };

    const { error } = await admin
      .from("round_results")
      .upsert(payload, { onConflict: "round_id,user_id" });

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
      { message: error instanceof Error ? error.message : "Failed to submit solve." },
      { status: 400, headers: corsHeaders },
    );
  }
});
