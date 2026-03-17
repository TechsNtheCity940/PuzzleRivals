import type { ItemCategory, MatchReward, QuestDefinition } from "@/lib/types";

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
  1: { xp: 180, coins: 100 },
  2: { xp: 130, coins: 70 },
  3: { xp: 95, coins: 50 },
  4: { xp: 65, coins: 35 },
};

export const RANKED_MATCH_REWARDS: Record<1 | 2 | 3 | 4, MatchReward> = {
  1: { xp: 170, coins: 90 },
  2: { xp: 120, coins: 65 },
  3: { xp: 85, coins: 45 },
  4: { xp: 55, coins: 30 },
};

export const DAILY_QUESTS: QuestDefinition[] = [
  {
    id: "dq_play_3",
    title: "Play 3 Matches",
    description: "Finish three multiplayer matches in any queue.",
    track: "daily",
    target: 3,
    progress: 1,
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
    id: "dq_no_hints",
    title: "No Hint Win",
    description: "Win a match without spending a hint.",
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
    progress: 2,
    reward: { coins: 700, shards: 50, passXp: 420 },
    isCompleted: false,
  },
];

export const SEASONAL_CHALLENGES: QuestDefinition[] = [
  {
    id: "sq_gold",
    title: "Reach Gold",
    description: "Climb to Gold this season for a prestige unlock.",
    track: "seasonal",
    target: 1,
    progress: 0,
    reward: { gems: 60, shards: 120, itemId: "s_18" },
    isCompleted: false,
  },
  {
    id: "sq_pass_stars",
    title: "Earn 100 Pass Stars",
    description: "Stack pass XP from matches and missions all season long.",
    track: "seasonal",
    target: 100,
    progress: 34,
    reward: { gems: 80, itemId: "s_20" },
    isCompleted: false,
  },
];

export function getPassTierProgress(passXp: number, maxTier: number) {
  const currentTier = Math.max(1, Math.min(maxTier, Math.floor(passXp / PASS_XP_PER_TIER) + 1));
  const progressWithinTier = Math.round(((passXp % PASS_XP_PER_TIER) / PASS_XP_PER_TIER) * 100);
  return {
    currentTier,
    progressWithinTier,
    nextTierXp: PASS_XP_PER_TIER - (passXp % PASS_XP_PER_TIER || 0),
  };
}
