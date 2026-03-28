import type { ItemCategory, MatchReward, QuestDefinition } from "@/lib/types";
import type { UserProfile } from "@/lib/types";
import { NEON_RIVALS_SEASONAL_CHALLENGES, NEON_RIVALS_SEASON_KEY } from "@/lib/season-content";
import {
  isSupabaseSchemaSetupIssue,
  supabase,
  toSupabaseSchemaSetupError,
} from "@/lib/supabase-client";

export const PASS_XP_PER_TIER = 500;

export const STORE_TABS: Array<{ id: "all" | ItemCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "theme", label: "Themes" },
  { id: "avatar", label: "Avatars" },
  { id: "player_card", label: "Cards" },
  { id: "banner", label: "Banners" },
  { id: "frame", label: "Frames" },
  { id: "emblem", label: "Emblems" },
  { id: "bundle", label: "Bundles" },
  { id: "hint_pack", label: "Hints" },
  { id: "battle_pass", label: "Pass" },
];

export const CASUAL_MATCH_REWARDS: Record<1 | 2 | 3 | 4, MatchReward> = {
  1: { xp: 180, coins: 100, passXp: 110, shards: 8, elo: 16 },
  2: { xp: 130, coins: 70, passXp: 85, shards: 5, elo: 8 },
  3: { xp: 95, coins: 50, passXp: 65, shards: 3, elo: -2 },
  4: { xp: 65, coins: 35, passXp: 50, shards: 2, elo: -8 },
};

export const RANKED_MATCH_REWARDS: Record<1 | 2 | 3 | 4, MatchReward> = {
  1: { xp: 170, coins: 90, passXp: 120, shards: 12, rankPoints: 28, elo: 28 },
  2: { xp: 120, coins: 65, passXp: 90, shards: 7, rankPoints: 12, elo: 12 },
  3: { xp: 85, coins: 45, passXp: 65, shards: 4, rankPoints: -4, elo: -4 },
  4: { xp: 55, coins: 30, passXp: 45, shards: 2, rankPoints: -16, elo: -16 },
};

export const DAILY_QUESTS: QuestDefinition[] = [
  {
    id: "dq_play_3",
    title: "Play 3 Matches",
    description: "Finish three multiplayer matches in any queue.",
    track: "daily",
    target: 3,
    progress: 0,
    reward: { coins: 160, passXp: 120 },
    isCompleted: false,
  },
  {
    id: "dq_top2",
    title: "Top 2 Finish",
    description: "Place 1st or 2nd in a match once.",
    track: "daily",
    target: 1,
    progress: 0,
    reward: { coins: 120, passXp: 100, shards: 10 },
    isCompleted: false,
  },
  {
    id: "dq_perfect_solve",
    title: "Perfect Solve",
    description: "Finish a live round with a full solve.",
    track: "daily",
    target: 1,
    progress: 0,
    reward: { coins: 100, passXp: 90 },
    isCompleted: false,
  },
];

export const WEEKLY_QUESTS: QuestDefinition[] = [
  {
    id: "wq_finish_20",
    title: "Finish 20 Matches",
    description: "Keep queueing until twenty matches are logged this week.",
    track: "weekly",
    target: 20,
    progress: 7,
    reward: { coins: 900, gems: 20, passXp: 500 },
    isCompleted: false,
  },
  {
    id: "wq_ranked_5",
    title: "Ranked Grinder",
    description: "Win five ranked matches this week.",
    track: "weekly",
    target: 5,
    progress: 0,
    reward: { coins: 700, shards: 50, passXp: 420 },
    isCompleted: false,
  },
];

export const SEASONAL_CHALLENGES: QuestDefinition[] = NEON_RIVALS_SEASONAL_CHALLENGES.map((quest) => ({
  ...quest,
  reward: { ...quest.reward },
}));

type QuestDefinitionRow = {
  id: string;
  track: QuestDefinition["track"];
  title: string;
  description: string;
  target_value: number;
  reward_json: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
};

type QuestProgressRow = {
  quest_id: string;
  period_key: string;
  progress: number;
  completed_at: string | null;
};

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
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

function getQuestPeriodKey(track: QuestDefinition["track"], metadata: Record<string, unknown> | null, now = new Date()) {
  if (track === "daily") return getUtcDateKey(now);
  if (track === "weekly") return getIsoWeekKey(now);
  return asString(metadata?.seasonKey) ?? NEON_RIVALS_SEASON_KEY;
}

function parseQuestReward(value: Record<string, unknown> | null) {
  return {
    coins: asNumber(value?.coins, 0) || undefined,
    gems: asNumber(value?.gems, 0) || undefined,
    shards: asNumber(value?.shards, 0) || undefined,
    passXp: asNumber(value?.passXp, 0) || undefined,
    itemId: asString(value?.itemId) ?? undefined,
  };
}

function withAbsoluteFallbackProgress(quest: QuestDefinition, user: UserProfile | null) {
  if (!user) return quest;
  if (quest.id === "sq_gold") {
    return { ...quest, progress: Math.min(quest.target, user.rankPoints ?? 0), isCompleted: (user.rankPoints ?? 0) >= quest.target };
  }
  if (quest.id === "sq_pass_xp") {
    return { ...quest, progress: Math.min(quest.target, user.passXp ?? 0), isCompleted: (user.passXp ?? 0) >= quest.target };
  }
  return quest;
}

export async function loadQuestSnapshot(user: UserProfile | null) {
  const fallback = {
    daily: DAILY_QUESTS.map((quest) => withAbsoluteFallbackProgress(quest, user)),
    weekly: WEEKLY_QUESTS.map((quest) => withAbsoluteFallbackProgress(quest, user)),
    seasonal: SEASONAL_CHALLENGES.map((quest) => withAbsoluteFallbackProgress(quest, user)),
  };

  if (!supabase || !user || user.isGuest) {
    return fallback;
  }

  const now = new Date();
  const [{ data: definitions, error: definitionsError }, { data: progressRows, error: progressError }] = await Promise.all([
    supabase
      .from("quest_definitions")
      .select("id, track, title, description, target_value, reward_json, metadata")
      .eq("active", true),
    supabase
      .from("player_quest_progress")
      .select("quest_id, period_key, progress, completed_at")
      .eq("user_id", user.id),
  ]);

  if (definitionsError) {
    if (isSupabaseSchemaSetupIssue(definitionsError)) {
      throw toSupabaseSchemaSetupError(definitionsError, "public.quest_definitions");
    }
    throw definitionsError;
  }

  if (progressError) {
    if (isSupabaseSchemaSetupIssue(progressError)) {
      throw toSupabaseSchemaSetupError(progressError, "public.player_quest_progress");
    }
    throw progressError;
  }

  const progressByKey = new Map(
    ((progressRows ?? []) as QuestProgressRow[]).map((row) => [`${row.quest_id}:${row.period_key}`, row]),
  );

  const mapped = ((definitions ?? []) as QuestDefinitionRow[]).map((definition) => {
    const periodKey = getQuestPeriodKey(definition.track, definition.metadata, now);
    const progress = progressByKey.get(`${definition.id}:${periodKey}`);
    const quest: QuestDefinition = {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      track: definition.track,
      target: definition.target_value,
      progress: Math.min(definition.target_value, Number(progress?.progress ?? 0)),
      reward: parseQuestReward(definition.reward_json),
      isCompleted: Boolean(progress?.completed_at) || Number(progress?.progress ?? 0) >= definition.target_value,
    };

    return withAbsoluteFallbackProgress(quest, user);
  });

  if (mapped.length === 0) {
    return fallback;
  }

  return {
    daily: mapped.filter((quest) => quest.track === "daily"),
    weekly: mapped.filter((quest) => quest.track === "weekly"),
    seasonal: mapped.filter((quest) => quest.track === "seasonal"),
  };
}

export function getPassTierProgress(passXp: number, maxTier: number) {
  const currentTier = Math.max(1, Math.min(maxTier, Math.floor(passXp / PASS_XP_PER_TIER) + 1));
  const progressWithinTier = Math.round(((passXp % PASS_XP_PER_TIER) / PASS_XP_PER_TIER) * 100);
  return {
    currentTier,
    progressWithinTier,
    nextTierXp: PASS_XP_PER_TIER - (passXp % PASS_XP_PER_TIER || 0),
  };
}
