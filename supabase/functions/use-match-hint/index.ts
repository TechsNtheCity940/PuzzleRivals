import {
  getEffectiveMatchScore,
  getMatchHintPenalty,
  MATCH_HINT_COOLDOWN_MS,
} from "../../../shared/match-hints.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { advanceLobbyState } from "../_shared/lobby-state.ts";
import { getLobbySnapshot } from "../_shared/matchmaking.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { lobbyId } = await req.json() as { lobbyId: string };
    const admin = createAdminClient();

    await advanceLobbyState(lobbyId);

    const [{ data: round, error: roundError }, { data: profile, error: profileError }] = await Promise.all([
      admin
        .from("rounds")
        .select("id, status")
        .eq("lobby_id", lobbyId)
        .order("round_no", { ascending: false })
        .limit(1)
        .single(),
      admin
        .from("profiles")
        .select("hint_balance")
        .eq("id", user.id)
        .single(),
    ]);

    if (roundError) throw roundError;
    if (profileError) throw profileError;
    if (round.status !== "live") {
      throw new Error("Hints are only available during the live round.");
    }

    const { data: currentResult, error: resultError } = await admin
      .from("round_results")
      .select("practice_progress, live_progress, solved_at_ms, live_completions, live_score, live_score_raw, hint_uses, hint_penalty_total, next_hint_available_at, current_live_seed, current_variant_started_at_ms")
      .eq("round_id", round.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (resultError) throw resultError;
    if (Number(profile.hint_balance ?? 0) <= 0) {
      throw new Error("No hints are available on this account.");
    }
    if (currentResult?.solved_at_ms) {
      throw new Error("This round is already solved.");
    }

    const now = Date.now();
    const nextHintAvailableAtMs = currentResult?.next_hint_available_at
      ? new Date(String(currentResult.next_hint_available_at)).getTime()
      : 0;
    if (nextHintAvailableAtMs > now) {
      const seconds = Math.max(1, Math.ceil((nextHintAvailableAtMs - now) / 1000));
      throw new Error(`Hint cooling down for ${seconds}s.`);
    }

    const nextHintUses = Number(currentResult?.hint_uses ?? 0) + 1;
    const penalty = getMatchHintPenalty(nextHintUses);
    const rawScore = Number(currentResult?.live_score_raw ?? currentResult?.live_score ?? 0);
    const nextPenaltyTotal = Number(currentResult?.hint_penalty_total ?? 0) + penalty;
    const liveScore = getEffectiveMatchScore(rawScore, nextPenaltyTotal);
    const nextHintAvailableAt = new Date(now + MATCH_HINT_COOLDOWN_MS).toISOString();

    const { error: resultUpdateError } = await admin
      .from("round_results")
      .upsert({
        round_id: round.id,
        user_id: user.id,
        practice_progress: Number(currentResult?.practice_progress ?? 0),
        live_progress: Number(currentResult?.live_progress ?? 0),
        solved_at_ms: currentResult?.solved_at_ms ?? null,
        live_completions: Number(currentResult?.live_completions ?? 0),
        live_score_raw: rawScore,
        live_score: liveScore,
        hint_uses: nextHintUses,
        hint_penalty_total: nextPenaltyTotal,
        next_hint_available_at: nextHintAvailableAt,
        current_live_seed: currentResult?.current_live_seed ?? null,
        current_variant_started_at_ms: currentResult?.current_variant_started_at_ms ?? 0,
      }, { onConflict: "round_id,user_id" });

    if (resultUpdateError) throw resultUpdateError;

    const remainingHints = Math.max(0, Number(profile.hint_balance ?? 0) - 1);
    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({ hint_balance: remainingHints })
      .eq("id", user.id);

    if (profileUpdateError) throw profileUpdateError;

    const snapshot = await advanceLobbyState(lobbyId) ?? await getLobbySnapshot(lobbyId);
    return Response.json(
      {
        lobby: snapshot,
        penalty,
        hintUses: nextHintUses,
        hintPenaltyTotal: nextPenaltyTotal,
        nextHintAvailableAt,
        remainingHints,
        liveScore,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to use a match hint." },
      { status: 400, headers: corsHeaders },
    );
  }
});
