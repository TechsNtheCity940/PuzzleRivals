import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { applyProductGrant, getActiveProduct } from "./store.ts";

type RewardTable = Record<1 | 2 | 3 | 4, MatchRewardDelta>;

type QuestTrack = "daily" | "weekly" | "seasonal";

type MatchRewardDelta = {
  xp: number;
  coins: number;
  elo: number;
  rankPoints: number;
  passXp: number;
  shards: number;
};

type QuestDefinitionRow = {
  id: string;
  track: QuestTrack;
  objective_key: string;
  target_value: number;
  reward_json: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

type QuestProgressRow = {
  quest_id: string;
  period_key: string;
  progress: number;
  completed_at: string | null;
  reward_claimed_at: string | null;
};

type QuestRewardGrant = {
  coins: number;
  gems: number;
  shards: number;
  passXp: number;
  itemIds: string[];
};

type EvaluateQuestProgressInput = {
  admin: SupabaseClient;
  userId: string;
  quests: QuestDefinitionRow[];
  mode: string;
  placement: number;
  liveProgress: number;
  liveCompletions: number;
  rankPoints: number;
  passXp: number;
  now?: Date;
};

const CASUAL_REWARDS: RewardTable = {
  1: { xp: 180, coins: 100, elo: 16, rankPoints: 0, passXp: 110, shards: 8 },
  2: { xp: 130, coins: 70, elo: 8, rankPoints: 0, passXp: 85, shards: 5 },
  3: { xp: 95, coins: 50, elo: -2, rankPoints: 0, passXp: 65, shards: 3 },
  4: { xp: 65, coins: 35, elo: -8, rankPoints: 0, passXp: 50, shards: 2 },
};

const RANKED_REWARDS: RewardTable = {
  1: { xp: 170, coins: 90, elo: 28, rankPoints: 28, passXp: 120, shards: 12 },
  2: { xp: 120, coins: 65, elo: 12, rankPoints: 12, passXp: 90, shards: 7 },
  3: { xp: 85, coins: 45, elo: -4, rankPoints: -4, passXp: 65, shards: 4 },
  4: { xp: 55, coins: 30, elo: -16, rankPoints: -16, passXp: 45, shards: 2 },
};

const EVENT_REWARDS: RewardTable = {
  1: { xp: 200, coins: 120, elo: 18, rankPoints: 6, passXp: 135, shards: 10 },
  2: { xp: 145, coins: 85, elo: 10, rankPoints: 3, passXp: 105, shards: 6 },
  3: { xp: 105, coins: 60, elo: -2, rankPoints: 0, passXp: 80, shards: 4 },
  4: { xp: 75, coins: 45, elo: -10, rankPoints: -2, passXp: 60, shards: 3 },
};

const ACCUMULATING_OBJECTIVES = new Set([
  "matches_played",
  "top_2_finishes",
  "perfect_solves",
  "ranked_wins",
]);

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function normalizeItemIds(value: unknown) {
  if (typeof value === "string" && value) {
    return [value];
  }

  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
}

function addUtcDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function getRewardTable(mode: string) {
  if (mode === "ranked") return RANKED_REWARDS;
  if (mode === "royale" || mode === "daily") return EVENT_REWARDS;
  return CASUAL_REWARDS;
}

function getUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getIsoWeekKey(date: Date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const year = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function parseRewardJson(value: Record<string, unknown> | null): QuestRewardGrant {
  return {
    coins: asNumber(value?.coins, 0),
    gems: asNumber(value?.gems, 0),
    shards: asNumber(value?.shards, 0),
    passXp: asNumber(value?.passXp, 0),
    itemIds: [
      ...normalizeItemIds(value?.itemId),
      ...normalizeItemIds(value?.itemIds),
    ],
  };
}

function mergeQuestRewards(left: QuestRewardGrant, right: QuestRewardGrant): QuestRewardGrant {
  return {
    coins: left.coins + right.coins,
    gems: left.gems + right.gems,
    shards: left.shards + right.shards,
    passXp: left.passXp + right.passXp,
    itemIds: [...left.itemIds, ...right.itemIds],
  };
}

function getObjectiveValue(
  objectiveKey: string,
  input: Omit<EvaluateQuestProgressInput, "admin" | "quests" | "userId" | "now">,
) {
  switch (objectiveKey) {
    case "matches_played":
      return 1;
    case "top_2_finishes":
      return input.placement <= 2 ? 1 : 0;
    case "perfect_solves":
      return input.liveProgress >= 100 || input.liveCompletions > 0 ? 1 : 0;
    case "ranked_wins":
      return input.mode === "ranked" && input.placement === 1 ? 1 : 0;
    case "reach_rank_points":
      return input.rankPoints;
    case "pass_xp_earned":
      return input.passXp;
    default:
      return 0;
  }
}

export function calculateMatchReward(input: {
  mode: string;
  placement: number;
  currentWinStreak: number;
  isFirstDailyWin: boolean;
  perfectSolve: boolean;
}) {
  const table = getRewardTable(input.mode);
  const placement = Math.min(Math.max(input.placement, 1), 4) as 1 | 2 | 3 | 4;
  const reward = { ...table[placement] };

  if (input.perfectSolve) {
    reward.coins += 20;
    reward.passXp += 15;
    reward.xp += 20;
  }

  if (placement === 1) {
    reward.coins += Math.min(Math.max(input.currentWinStreak, 0) * 10, 30);
  }

  if (input.isFirstDailyWin && placement === 1) {
    reward.coins += 100;
    reward.passXp += 40;
  }

  return reward;
}

export function calculateArcadeRunReward(input: {
  mode: string;
  success: boolean;
  score: number;
  maxCombo: number;
  matchedTiles: number;
  movesLeft: number;
  durationMs: number;
}) {
  const reward: MatchRewardDelta = input.success
    ? { xp: 200, coins: 120, elo: 0, rankPoints: 0, passXp: 150, shards: 10 }
    : { xp: 70, coins: 35, elo: 0, rankPoints: 0, passXp: 45, shards: 2 };

  reward.xp += Math.min(90, Math.floor(Math.max(input.score, 0) / 600) * 10);
  reward.coins += Math.min(80, Math.floor(Math.max(input.matchedTiles, 0) / 12) * 10);
  reward.passXp += Math.min(60, Math.floor(Math.max(input.score, 0) / 900) * 10);
  reward.shards += Math.min(6, Math.floor(Math.max(input.maxCombo, 0) / 2));

  if (input.mode === "combo_rush") {
    reward.passXp += input.success ? 35 : 10;
  } else if (input.mode === "color_hunt") {
    reward.coins += 20;
    reward.shards += input.success ? 4 : 1;
  } else if (input.mode === "clear_rush") {
    reward.xp += input.success ? 30 : 10;
  } else if (input.mode === "maze_rush") {
    reward.coins += input.success ? 30 : 10;
    reward.passXp += input.success ? 20 : 5;
  } else if (input.mode === "pipe_rush") {
    reward.coins += input.success ? 24 : 8;
    reward.shards += input.success ? 3 : 1;
  } else if (input.mode === "tile_shift") {
    reward.xp += input.success ? 24 : 8;
    reward.passXp += input.success ? 15 : 5;
  } else if (input.mode === "number_crunch") {
    reward.xp += input.success ? 28 : 8;
    reward.coins += input.success ? 18 : 6;
    reward.passXp += input.success ? 18 : 6;
  } else if (input.mode === "spatial_spin") {
    reward.xp += input.success ? 22 : 8;
    reward.shards += input.success ? 4 : 1;
    reward.passXp += input.success ? 20 : 6;
  } else if (input.mode === "chess_shot") {
    reward.xp += input.success ? 30 : 10;
    reward.shards += input.success ? 5 : 2;
    reward.passXp += input.success ? 22 : 7;
  } else if (input.mode === "checkers_trap") {
    reward.coins += input.success ? 28 : 8;
    reward.xp += input.success ? 20 : 8;
    reward.passXp += input.success ? 18 : 6;
  } else {
    reward.coins += input.success ? 25 : 0;
  }

  if (input.success && input.movesLeft >= 4) {
    reward.coins += 20;
  }

  if (input.success && input.durationMs > 0 && input.durationMs <= 120000) {
    reward.passXp += 10;
  }

  return reward;
}

export function getQuestPeriodKey(
  track: QuestTrack,
  metadata: Record<string, unknown> | null,
  now = new Date(),
) {
  if (track === "daily") return getUtcDateKey(now);
  if (track === "weekly") return getIsoWeekKey(now);
  return asString(metadata?.seasonKey) ?? "season-11";
}

export async function getActiveQuestDefinitions(admin: SupabaseClient) {
  const { data, error } = await admin
    .from("quest_definitions")
    .select("id, track, objective_key, target_value, reward_json, metadata")
    .eq("active", true);

  if (error) throw error;
  return (data ?? []) as QuestDefinitionRow[];
}

export async function evaluateQuestProgress(input: EvaluateQuestProgressInput) {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const { data, error } = await input.admin
    .from("player_quest_progress")
    .select("quest_id, period_key, progress, completed_at, reward_claimed_at")
    .eq("user_id", input.userId);

  if (error) throw error;

  const existingByKey = new Map(
    ((data ?? []) as QuestProgressRow[]).map((row) => [`${row.quest_id}:${row.period_key}`, row]),
  );

  const playerInput = {
    mode: input.mode,
    placement: input.placement,
    liveProgress: input.liveProgress,
    liveCompletions: input.liveCompletions,
    rankPoints: input.rankPoints,
    passXp: input.passXp,
  };

  const progressUpdates: Array<Record<string, unknown>> = [];
  let rewardGrant: QuestRewardGrant = {
    coins: 0,
    gems: 0,
    shards: 0,
    passXp: 0,
    itemIds: [],
  };

  for (const quest of input.quests) {
    const periodKey = getQuestPeriodKey(quest.track, quest.metadata, now);
    const mapKey = `${quest.id}:${periodKey}`;
    const previous = existingByKey.get(mapKey);
    const objectiveValue = getObjectiveValue(quest.objective_key, playerInput);
    const nextProgress = ACCUMULATING_OBJECTIVES.has(quest.objective_key)
      ? Math.min(quest.target_value, Number(previous?.progress ?? 0) + objectiveValue)
      : Math.min(quest.target_value, Math.max(Number(previous?.progress ?? 0), objectiveValue));

    const shouldGrant = nextProgress >= quest.target_value && !previous?.reward_claimed_at;
    if (shouldGrant) {
      rewardGrant = mergeQuestRewards(rewardGrant, parseRewardJson(quest.reward_json));
    }

    progressUpdates.push({
      user_id: input.userId,
      quest_id: quest.id,
      period_key: periodKey,
      progress: nextProgress,
      completed_at: previous?.completed_at ?? (nextProgress >= quest.target_value ? nowIso : null),
      reward_claimed_at: previous?.reward_claimed_at ?? (shouldGrant ? nowIso : null),
    });
  }

  if (progressUpdates.length > 0) {
    const { error: upsertError } = await input.admin.from("player_quest_progress").upsert(progressUpdates);
    if (upsertError) throw upsertError;
  }

  return rewardGrant;
}

export function getNextDailyWinState(lastDailyWinOn: string | null, currentDailyWinStreak: number, now = new Date()) {
  const today = getUtcDateKey(now);
  if (lastDailyWinOn === today) {
    return {
      lastDailyWinOn: today,
      dailyWinStreak: Math.max(currentDailyWinStreak, 1),
      isFirstDailyWin: false,
    };
  }

  const yesterday = getUtcDateKey(addUtcDays(now, -1));
  return {
    lastDailyWinOn: today,
    dailyWinStreak: lastDailyWinOn === yesterday ? currentDailyWinStreak + 1 : 1,
    isFirstDailyWin: true,
  };
}

export async function grantQuestItems(
  admin: SupabaseClient,
  userId: string,
  itemIds: string[],
  source: string,
) {
  const uniqueItemIds = [...new Set(itemIds)];
  for (const itemId of uniqueItemIds) {
    const product = await getActiveProduct(admin, itemId);
    await applyProductGrant(admin, userId, product, source);
  }
}





