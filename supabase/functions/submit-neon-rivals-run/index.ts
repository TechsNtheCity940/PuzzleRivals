import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  calculateArcadeRunReward,
  evaluateQuestProgress,
  getActiveQuestDefinitions,
  grantQuestItems,
} from "../_shared/economy.ts";
import { recordArcadeRunActivity } from "../_shared/activity.ts";

type RunStatus = "complete" | "failed";
type RunMode = "score_attack" | "combo_rush" | "color_hunt" | "clear_rush" | "maze_rush" | "pipe_rush" | "tile_shift" | "number_crunch" | "spatial_spin" | "chess_shot" | "checkers_trap" | "chess_endgame" | "chess_opening" | "chess_mate_net" | "riddle_relay" | "trivia_blitz" | "geography_dash" | "science_spark" | "analogy_arc" | "vocabulary_duel" | "memory_flash";

type RewardSummary = {
  xp: number;
  coins: number;
  gems: number;
  passXp: number;
  shards: number;
  itemIds: string[];
};

type ExistingRunRow = {
  id: string;
  reward_json: Record<string, unknown> | null;
  quest_reward_json: Record<string, unknown> | null;
};

type ProfileWalletRow = {
  xp: number;
  coins: number;
  gems: number;
  pass_xp: number;
  puzzle_shards: number;
  rank_points: number;
};

const VALID_MODES = new Set<RunMode>(["score_attack", "combo_rush", "color_hunt", "clear_rush", "maze_rush", "pipe_rush", "tile_shift", "number_crunch", "spatial_spin", "chess_shot", "checkers_trap", "chess_endgame", "chess_opening", "chess_mate_net", "riddle_relay", "trivia_blitz", "geography_dash", "science_spark", "analogy_arc", "vocabulary_duel", "memory_flash"]);

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asRewardSummary(value: Record<string, unknown> | null): RewardSummary {
  const itemId = typeof value?.itemId === "string" && value.itemId ? [value.itemId] : [];
  const itemIds = Array.isArray(value?.itemIds)
    ? value.itemIds.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];

  return {
    xp: asNumber(value?.xp),
    coins: asNumber(value?.coins),
    gems: asNumber(value?.gems),
    passXp: asNumber(value?.passXp ?? value?.pass_xp),
    shards: asNumber(value?.shards),
    itemIds: [...itemId, ...itemIds],
  };
}

function mergeRewards(left: RewardSummary, right: RewardSummary): RewardSummary {
  return {
    xp: left.xp + right.xp,
    coins: left.coins + right.coins,
    gems: left.gems + right.gems,
    passXp: left.passXp + right.passXp,
    shards: left.shards + right.shards,
    itemIds: [...new Set([...left.itemIds, ...right.itemIds])],
  };
}

function normalizeMode(value: unknown): RunMode {
  if (typeof value === "string" && VALID_MODES.has(value as RunMode)) {
    return value as RunMode;
  }

  throw new Error("Invalid Neon Rivals mode.");
}

function normalizeStatus(value: unknown): RunStatus {
  if (value === "complete" || value === "failed") {
    return value;
  }

  throw new Error("Invalid Neon Rivals run status.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const body = await req.json() as Record<string, unknown>;
    const mode = normalizeMode(body.mode);
    const status = normalizeStatus(body.status);
    const sessionSeed = Math.max(1, Math.floor(asNumber(body.sessionSeed, 0)));
    const objectiveTitle = asString(body.objectiveTitle, "Neon Rivals Run").trim();
    const objectiveLabel = asString(body.objectiveLabel, "Complete the active run.").trim();

    if (!sessionSeed) {
      throw new Error("A valid session seed is required.");
    }

    const admin = createAdminClient();
    const { data: existingRun, error: existingRunError } = await admin
      .from("neon_rivals_runs")
      .select("id, reward_json, quest_reward_json")
      .eq("user_id", user.id)
      .eq("session_seed", sessionSeed)
      .eq("mode", mode)
      .maybeSingle<ExistingRunRow>();

    if (existingRunError) throw existingRunError;

    if (existingRun) {
      const reward = asRewardSummary(existingRun.reward_json);
      const questReward = asRewardSummary(existingRun.quest_reward_json);
      return Response.json({
        ok: true,
        alreadySubmitted: true,
        runId: existingRun.id,
        reward,
        questReward,
        totalReward: mergeRewards(reward, questReward),
      }, { headers: corsHeaders });
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("xp, coins, gems, pass_xp, puzzle_shards, rank_points")
      .eq("id", user.id)
      .single<ProfileWalletRow>();

    if (profileError) throw profileError;
    if (!profile) {
      throw new Error("Profile wallet unavailable for Neon Rivals rewards.");
    }

    const runScore = Math.max(0, Math.floor(asNumber(body.score, 0)));
    const runMaxCombo = Math.max(0, Math.floor(asNumber(body.maxCombo, 0)));
    const runMatchedTiles = Math.max(0, Math.floor(asNumber(body.matchedTiles, 0)));
    const runMovesLeft = Math.max(0, Math.floor(asNumber(body.movesLeft, 0)));
    const runObjectiveValue = Math.max(0, Math.floor(asNumber(body.objectiveValue, 0)));
    const runObjectiveTarget = Math.max(1, Math.floor(asNumber(body.objectiveTarget, 1)));
    const runTargetScore = Math.max(0, Math.floor(asNumber(body.targetScore, 0)));
    const runDurationMs = Math.max(0, Math.floor(asNumber(body.durationMs, 0)));
    const liveProgress = Math.max(0, Math.min(100, Math.round((runObjectiveValue / runObjectiveTarget) * 100)));

    const rewardBase = calculateArcadeRunReward({
      mode,
      success: status === "complete",
      score: runScore,
      maxCombo: runMaxCombo,
      matchedTiles: runMatchedTiles,
      movesLeft: runMovesLeft,
      durationMs: runDurationMs,
    });

    const activeQuests = await getActiveQuestDefinitions(admin);
    const nextPassXpBeforeQuests = Math.max(0, Number(profile.pass_xp ?? 0) + rewardBase.passXp);
    const questReward = await evaluateQuestProgress({
      admin,
      userId: user.id,
      quests: activeQuests,
      mode: "neon_rivals",
      placement: status === "complete" ? 1 : 4,
      liveProgress,
      liveCompletions: status === "complete" ? 1 : 0,
      rankPoints: Number(profile.rank_points ?? 0),
      passXp: nextPassXpBeforeQuests,
    });

    const reward: RewardSummary = {
      xp: rewardBase.xp,
      coins: rewardBase.coins,
      gems: 0,
      passXp: rewardBase.passXp,
      shards: rewardBase.shards,
      itemIds: [],
    };

    const questRewardSummary: RewardSummary = {
      xp: 0,
      coins: questReward.coins,
      gems: questReward.gems,
      passXp: questReward.passXp,
      shards: questReward.shards,
      itemIds: [...questReward.itemIds],
    };

    const totalReward = mergeRewards(reward, questRewardSummary);

    const { data: insertedRun, error: runInsertError } = await admin
      .from("neon_rivals_runs")
      .insert({
        user_id: user.id,
        session_seed: sessionSeed,
        mode,
        status,
        objective_key: mode,
        objective_title: objectiveTitle,
        objective_label: objectiveLabel,
        score: runScore,
        combo: Math.max(0, Math.floor(asNumber(body.combo, 0))),
        max_combo: runMaxCombo,
        matched_tiles: runMatchedTiles,
        moves_left: runMovesLeft,
        target_score: runTargetScore,
        objective_value: runObjectiveValue,
        objective_target: runObjectiveTarget,
        target_color: typeof body.targetColor === "string" ? body.targetColor : null,
        target_color_label: typeof body.targetColorLabel === "string" ? body.targetColorLabel : null,
        duration_ms: runDurationMs,
        reward_json: reward,
        quest_reward_json: questRewardSummary,
      })
      .select("id")
      .single<{ id: string }>();

    if (runInsertError) throw runInsertError;

    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({
        xp: Math.max(0, Number(profile.xp ?? 0) + totalReward.xp),
        coins: Math.max(0, Number(profile.coins ?? 0) + totalReward.coins),
        gems: Math.max(0, Number(profile.gems ?? 0) + totalReward.gems),
        pass_xp: Math.max(0, Number(profile.pass_xp ?? 0) + totalReward.passXp),
        puzzle_shards: Math.max(0, Number(profile.puzzle_shards ?? 0) + totalReward.shards),
      })
      .eq("id", user.id);

    if (profileUpdateError) throw profileUpdateError;

    if (questReward.itemIds.length > 0) {
      await grantQuestItems(admin, user.id, questReward.itemIds, "quest_reward");
    }

    await recordArcadeRunActivity(admin, {
      userId: user.id,
      runId: insertedRun.id,
      mode,
      objectiveTitle,
      objectiveLabel,
      status,
      score: runScore,
      xpDelta: totalReward.xp,
      coinDelta: totalReward.coins,
      passXpDelta: totalReward.passXp,
      shardDelta: totalReward.shards,
      occurredAt: new Date().toISOString(),
    });

    return Response.json({
      ok: true,
      alreadySubmitted: false,
      runId: insertedRun.id,
      reward,
      questReward: questRewardSummary,
      totalReward,
    }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Failed to submit Neon Rivals run." },
      { status: 400, headers: corsHeaders },
    );
  }
});





