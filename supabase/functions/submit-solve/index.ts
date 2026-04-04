import { getEffectiveMatchScore } from "../../../shared/match-hints.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { advanceLobbyState } from "../_shared/lobby-state.ts";
import { broadcastLobbySnapshot } from "../_shared/realtime.ts";
import { getLobbySnapshot } from "../_shared/matchmaking.ts";
import { isSolvedPuzzleSubmission, type PuzzleSubmission } from "../_shared/puzzle.ts";
import {
  createVariantSeed,
  getHeadToHeadSolveScore,
  getLiveTargetScore,
  getSolveScore,
  isLiveScoreRacePuzzle,
  RAPID_FIRE_CUTOFF_MS,
} from "../_shared/match-rules.ts";

function normalizeScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  return null;
}

function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { lobbyId, stage, submission, score } = await req.json() as {
      lobbyId: string;
      stage: "practice" | "live";
      submission: PuzzleSubmission;
      score?: number;
    };
    const admin = createAdminClient();

    const advancedSnapshot = await advanceLobbyState(lobbyId);

    const { data: round, error: roundError } = await admin
      .from("rounds")
      .select("*")
      .eq("lobby_id", lobbyId)
      .order("round_no", { ascending: false })
      .limit(1)
      .single();

    if (roundError) throw roundError;
    if (stage !== "live") {
      throw new Error("Solve submissions are only accepted during the live round.");
    }

    if (round.status === "intermission" || round.status === "complete") {
      const snapshot = advancedSnapshot ?? await getLobbySnapshot(lobbyId);
      return Response.json(snapshot, { headers: corsHeaders });
    }

    if (round.status !== "live") {
      throw new Error("Solve submissions are only accepted during the live round.");
    }

    const [{ data: lobby, error: lobbyError }, { data: currentResult, error: resultError }] = await Promise.all([
      admin.from("lobbies").select("mode, live_ends_at").eq("id", lobbyId).single(),
      admin
        .from("round_results")
        .select("live_progress, solved_at_ms, live_completions, live_score, live_score_raw, hint_uses, hint_penalty_total, next_hint_available_at, current_live_seed, current_variant_started_at_ms")
        .eq("round_id", round.id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (lobbyError) throw lobbyError;
    if (resultError) throw resultError;

    const scoreRace = isLiveScoreRacePuzzle(lobby.mode, round.puzzle_type);
    const activeSeed = scoreRace
      ? Number(currentResult?.current_live_seed ?? round.live_seed)
      : Number(round.live_seed);
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
    const liveEndsAtMs = lobby.live_ends_at ? new Date(lobby.live_ends_at).getTime() : Date.now();
    const targetScore = getLiveTargetScore(lobby.mode);
    const existingRawScore = Number(currentResult?.live_score_raw ?? currentResult?.live_score ?? 0);
    const submittedScore = normalizeScore(score);
    const liveScoreRaw = scoreRace
      ? lobby.mode === "head_to_head"
        ? existingRawScore + getHeadToHeadSolveScore({
            solveMs: variantSolveMs,
            currentCompletions: Number(currentResult?.live_completions ?? 0),
            currentScore: existingRawScore,
            targetScore: targetScore ?? undefined,
          })
        : Math.max(existingRawScore, submittedScore ?? existingRawScore + getSolveScore(variantSolveMs))
      : Math.max(existingRawScore, submittedScore ?? 100);
    const hintUses = Number(currentResult?.hint_uses ?? 0);
    const hintPenaltyTotal = Number(currentResult?.hint_penalty_total ?? 0);
    const liveScore = getEffectiveMatchScore(liveScoreRaw, hintPenaltyTotal);
    const targetReached = targetScore !== null && liveScore >= targetScore;
    const shouldRollVariant = scoreRace && liveEndsAtMs - Date.now() > RAPID_FIRE_CUTOFF_MS && !targetReached;

    const payload: Record<string, unknown> = {
      round_id: round.id,
      user_id: user.id,
      submission_hash: JSON.stringify(submission),
      solved_at_ms: scoreRace ? nextBestSolveMs : currentBestSolveMs ?? roundElapsedMs,
      live_progress: shouldRollVariant ? 0 : 100,
      live_completions: scoreRace ? nextCompletionCount : Math.max(Number(currentResult?.live_completions ?? 0), 1),
      live_score_raw: liveScoreRaw,
      live_score: liveScore,
      hint_uses: hintUses,
      hint_penalty_total: hintPenaltyTotal,
      next_hint_available_at: currentResult?.next_hint_available_at ?? null,
      current_live_seed: shouldRollVariant
        ? createVariantSeed(Number(round.live_seed), user.id, nextCompletionCount)
        : activeSeed,
      current_variant_started_at_ms: shouldRollVariant ? roundElapsedMs : variantStartedAtMs,
    };

    const { error } = await admin
      .from("round_results")
      .upsert(payload, { onConflict: "round_id,user_id" });

    if (error) throw error;
    const latestSnapshot = await advanceLobbyState(lobbyId);
    if (latestSnapshot) {
      return Response.json(latestSnapshot, { headers: corsHeaders });
    }

    const snapshot = await getLobbySnapshot(lobbyId);
    await broadcastLobbySnapshot(lobbyId);
    return Response.json(snapshot, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: readErrorMessage(error, "Failed to submit solve.") },
      { status: 400, headers: corsHeaders },
    );
  }
});
