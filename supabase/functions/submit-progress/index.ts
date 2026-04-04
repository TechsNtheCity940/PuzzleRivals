import { getEffectiveMatchScore } from "../../../shared/match-hints.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { advanceLobbyState } from "../_shared/lobby-state.ts";
import { getLobbySnapshot } from "../_shared/matchmaking.ts";
import { evaluatePuzzleSubmission, type PuzzleSubmission } from "../_shared/puzzle.ts";
import { isLiveScoreRacePuzzle } from "../_shared/match-rules.ts";

function normalizeScore(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  return 0;
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

function shouldSyncClosedStage(
  stage: "practice" | "live",
  roundStatus: string,
) {
  return (
    (stage === "practice" &&
      (roundStatus === "live" ||
        roundStatus === "intermission" ||
        roundStatus === "complete")) ||
    (stage === "live" &&
      (roundStatus === "intermission" || roundStatus === "complete"))
  );
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

    const [{ data: round, error: roundError }, { data: lobby, error: lobbyError }] = await Promise.all([
      admin
        .from("rounds")
        .select("*")
        .eq("lobby_id", lobbyId)
        .order("round_no", { ascending: false })
        .limit(1)
        .single(),
      admin.from("lobbies").select("mode").eq("id", lobbyId).single(),
    ]);

    if (roundError) throw roundError;
    if (lobbyError) throw lobbyError;

    const { data: currentResult, error: resultError } = await admin
      .from("round_results")
      .select("practice_progress, live_progress, current_live_seed, current_variant_started_at_ms, live_completions, live_score, live_score_raw, hint_uses, hint_penalty_total, next_hint_available_at, solved_at_ms")
      .eq("round_id", round.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (resultError) {
      throw resultError;
    }

    if (shouldSyncClosedStage(stage, round.status)) {
      const snapshot = advancedSnapshot ?? await getLobbySnapshot(lobbyId);
      return Response.json(
        {
          progress: stage === "practice"
            ? Number(currentResult?.practice_progress ?? 0)
            : Number(currentResult?.live_progress ?? 0),
          liveScore: Number(currentResult?.live_score ?? 0),
          ...snapshot,
        },
        { headers: corsHeaders },
      );
    }

    if (stage === "practice" && round.status !== "practice") {
      throw new Error("Practice submissions are not accepted right now.");
    }
    if (stage === "live" && round.status !== "live") {
      throw new Error("Live submissions are not accepted right now.");
    }

    const scoreRace = stage === "live" && isLiveScoreRacePuzzle(lobby.mode, round.puzzle_type);
    const activeLiveSeed =
      stage === "live" && scoreRace
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
    const existingRawScore = Number(currentResult?.live_score_raw ?? currentResult?.live_score ?? 0);
    const hintPenaltyTotal = Number(currentResult?.hint_penalty_total ?? 0);
    const liveScoreRaw = stage === "live"
      ? Math.max(existingRawScore, normalizeScore(score))
      : existingRawScore;
    const liveScore = stage === "live"
      ? getEffectiveMatchScore(liveScoreRaw, hintPenaltyTotal)
      : Number(currentResult?.live_score ?? 0);

    const payload: Record<string, unknown> = {
      round_id: round.id,
      user_id: user.id,
      submission_hash: JSON.stringify(submission),
      practice_progress: practiceProgress,
      live_progress: liveProgress,
    };

    if (stage === "live") {
      payload.live_score_raw = liveScoreRaw;
      payload.live_score = liveScore;
      payload.hint_uses = Number(currentResult?.hint_uses ?? 0);
      payload.hint_penalty_total = hintPenaltyTotal;
      payload.next_hint_available_at = currentResult?.next_hint_available_at ?? null;
    }

    if (stage === "live" && scoreRace) {
      payload.current_live_seed = activeLiveSeed;
      payload.current_variant_started_at_ms = Number(currentResult?.current_variant_started_at_ms ?? 0);
      payload.live_completions = Number(currentResult?.live_completions ?? 0);
      payload.solved_at_ms = currentResult?.solved_at_ms ?? null;
    }

    const { error } = await admin
      .from("round_results")
      .upsert(payload, { onConflict: "round_id,user_id" });

    if (error) throw error;
    const snapshot = await advanceLobbyState(lobbyId) ?? await getLobbySnapshot(lobbyId);
    return Response.json({ progress, liveScore, ...snapshot }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: readErrorMessage(error, "Failed to submit progress.") },
      { status: 400, headers: corsHeaders },
    );
  }
});
