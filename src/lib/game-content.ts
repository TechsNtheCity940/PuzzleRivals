import { loadQuestSnapshot } from "@/lib/economy";
import {
  CURRENT_SEASON,
  DAILY_CHALLENGES,
  LEADERBOARD,
  PLAYERS,
  PUZZLE_TYPES,
  TOURNAMENTS,
  VIP_MEMBERSHIP,
} from "@/lib/seed-data";
import { fetchLeaderboard, fetchSocialDirectory } from "@/lib/player-data";
import {
  fetchStorefront,
  type StorefrontSnapshot,
} from "@/lib/storefront";
import {
  isSupabaseSchemaSetupIssue,
  supabase,
} from "@/lib/supabase-client";
import type {
  DailyChallenge,
  LeaderboardEntry,
  MatchReward,
  PuzzleMeta,
  PuzzleType,
  QuestDefinition,
  SeasonPass,
  SeasonReward,
  SeasonTrack,
  Tournament,
  UserProfile,
  VipMembership,
} from "@/lib/types";

export type GameContentSource = "supabase" | "seed";
export type ProfileSocialDirectoryEntry = Awaited<ReturnType<typeof fetchSocialDirectory>>[number];

export interface DiscoveryContentSnapshot {
  dailyChallenges: DailyChallenge[];
  tournaments: Tournament[];
  puzzleTypes: PuzzleMeta[];
  sources: {
    dailyChallenges: GameContentSource;
    tournaments: GameContentSource;
    puzzleTypes: GameContentSource;
  };
}

export interface SeasonContentSnapshot {
  season: SeasonPass;
  hasSeasonPass: boolean;
  quests: {
    daily: QuestDefinition[];
    weekly: QuestDefinition[];
    seasonal: QuestDefinition[];
  };
  sources: {
    season: GameContentSource;
    entitlements: GameContentSource;
    quests: GameContentSource;
  };
}

export interface ProfileContentSnapshot {
  leaderboard: LeaderboardEntry[];
  socialDirectory: ProfileSocialDirectoryEntry[];
  puzzleTypes: PuzzleMeta[];
  sources: {
    leaderboard: GameContentSource;
    socialDirectory: GameContentSource;
    puzzleTypes: GameContentSource;
  };
}

export interface StoreContentSnapshot {
  storefront: StorefrontSnapshot;
  vipMembership: VipMembership;
  sources: {
    storefront: GameContentSource;
    vipMembership: GameContentSource;
  };
}

type PuzzleCatalogRow = {
  type: string;
  sort_order: number;
  label: string;
  icon: string;
  description: string;
  active: boolean;
};

type DailyChallengeRow = {
  id: string;
  challenge_date: string;
  puzzle_type: string;
  puzzle_seed: number;
  difficulty: number;
  time_limit: number;
  grid_size: number;
  title: string;
  description: string;
  reward_json: Record<string, unknown> | null;
  completed_by: number;
  active: boolean;
};

type TournamentRow = {
  id: string;
  name: string;
  puzzle_type: string;
  entry_fee: number;
  prize_pool: number;
  max_players: number;
  current_players: number;
  starts_at: string;
  status: Tournament["status"];
  active: boolean;
};

type SeasonRow = {
  id: string;
  name: string;
  season_number: number;
  starts_at: string;
  ends_at: string;
  current_tier: number;
  max_tier: number;
  is_premium: boolean;
  tracks_json: unknown[] | null;
  metadata: Record<string, unknown> | null;
  active: boolean;
};

const PUZZLE_TYPE_SET = new Set<PuzzleType>(PUZZLE_TYPES.map((entry) => entry.type));
const DEFAULT_PUZZLE_TYPE = PUZZLE_TYPES[0]?.type ?? "rotate_pipes";

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asPuzzleType(value: unknown): PuzzleType {
  return typeof value === "string" && PUZZLE_TYPE_SET.has(value as PuzzleType)
    ? (value as PuzzleType)
    : DEFAULT_PUZZLE_TYPE;
}

function toDifficulty(value: unknown): 1 | 2 | 3 | 4 | 5 {
  const difficulty = Math.round(asNumber(value, 1));
  if (difficulty <= 1) return 1;
  if (difficulty === 2) return 2;
  if (difficulty === 3) return 3;
  if (difficulty === 4) return 4;
  return 5;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneDailyChallenge(challenge: DailyChallenge): DailyChallenge {
  return {
    ...challenge,
    puzzleConfig: { ...challenge.puzzleConfig },
    reward: { ...challenge.reward },
  };
}

function cloneTournament(tournament: Tournament): Tournament {
  return { ...tournament };
}

function clonePuzzleMeta(entry: PuzzleMeta): PuzzleMeta {
  return { ...entry };
}

function cloneQuest(quest: QuestDefinition): QuestDefinition {
  return {
    ...quest,
    reward: { ...quest.reward },
  };
}

function cloneSeason(season: SeasonPass): SeasonPass {
  return {
    ...season,
    tracks: season.tracks.map((track) => ({
      ...track,
      freeReward: track.freeReward ? { ...track.freeReward } : undefined,
      premiumReward: track.premiumReward ? { ...track.premiumReward } : undefined,
    })),
  };
}

function cloneLeaderboardEntry(entry: LeaderboardEntry): LeaderboardEntry {
  return { ...entry };
}

function cloneSocialEntry(entry: ProfileSocialDirectoryEntry): ProfileSocialDirectoryEntry {
  return { ...entry };
}

function cloneVipMembership(membership: VipMembership): VipMembership {
  return {
    ...membership,
    perks: [...membership.perks],
  };
}

function cloneStorefrontSnapshot(snapshot: StorefrontSnapshot): StorefrontSnapshot {
  return {
    items: snapshot.items.map((item) => ({ ...item })),
    vipProduct: snapshot.vipProduct ? { ...snapshot.vipProduct } : null,
    wallet: snapshot.wallet ? { ...snapshot.wallet } : null,
  };
}

function buildSeedSocialDirectory(currentUserId?: string): ProfileSocialDirectoryEntry[] {
  return PLAYERS
    .filter((player) => player.id !== "u_self" && player.id !== currentUserId)
    .map((player) => ({
      id: player.id,
      username: player.username,
      avatar_id: player.avatarId ?? null,
      rank: player.rank,
      elo: player.elo,
      facebook_handle: player.socialLinks.facebook ?? null,
      tiktok_handle: player.socialLinks.tiktok ?? null,
    }));
}

function mapMatchReward(value: Record<string, unknown> | null): MatchReward {
  const reward = value ?? {};
  return {
    xp: asNumber(reward.xp),
    coins: asNumber(reward.coins),
    gems: asNumber(reward.gems) || undefined,
    elo: asNumber(reward.elo) || undefined,
    passXp: asNumber(reward.passXp ?? reward.pass_xp) || undefined,
    rankPoints: asNumber(reward.rankPoints ?? reward.rank_points) || undefined,
    shards: asNumber(reward.shards) || undefined,
    streakBonus: asNumber(reward.streakBonus ?? reward.streak_bonus) || undefined,
  };
}

function defaultSeasonRewardLabel(type: SeasonReward["type"], amount?: number, itemId?: string) {
  if (type === "item") return itemId ? `Item ${itemId}` : "Exclusive item";
  if (type === "title") return itemId ? `Title ${itemId}` : "Exclusive title";
  if (!amount) return type;
  if (type === "pass_xp") return `${amount} Pass XP`;
  if (type === "xp") return `${amount} XP`;
  if (type === "gems") return `${amount} Gems`;
  if (type === "shards") return `${amount} Shards`;
  return `${amount} Coins`;
}

function mapSeasonReward(value: unknown): SeasonReward | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const type = value.type;
  if (
    type !== "coins" &&
    type !== "gems" &&
    type !== "xp" &&
    type !== "shards" &&
    type !== "pass_xp" &&
    type !== "item" &&
    type !== "title"
  ) {
    return undefined;
  }

  const amount = asNumber(value.amount) || undefined;
  const itemId = asString(value.itemId) || undefined;
  const label = asString(value.label, defaultSeasonRewardLabel(type, amount, itemId));

  return {
    type,
    amount,
    itemId,
    label,
  };
}

function mapSeasonTrack(value: unknown): SeasonTrack | null {
  if (!isRecord(value)) {
    return null;
  }

  const tier = Math.max(1, Math.round(asNumber(value.tier, 0)));
  return {
    tier,
    freeReward: mapSeasonReward(value.freeReward),
    premiumReward: mapSeasonReward(value.premiumReward),
    isUnlocked: asBoolean(value.isUnlocked),
  };
}

function mapPuzzleMeta(row: PuzzleCatalogRow): PuzzleMeta {
  return {
    type: asPuzzleType(row.type),
    label: asString(row.label, row.type),
    icon: asString(row.icon, "Puzzle"),
    description: asString(row.description),
  };
}

function mapDailyChallenge(row: DailyChallengeRow): DailyChallenge {
  return {
    id: row.id,
    date: row.challenge_date,
    puzzleConfig: {
      type: asPuzzleType(row.puzzle_type),
      seed: asNumber(row.puzzle_seed),
      difficulty: toDifficulty(row.difficulty),
      timeLimit: Math.max(15, asNumber(row.time_limit, 60)),
      gridSize: Math.max(2, asNumber(row.grid_size, 4)),
    },
    title: row.title,
    description: row.description,
    reward: mapMatchReward(row.reward_json),
    completedBy: Math.max(0, asNumber(row.completed_by)),
    isCompleted: false,
  };
}

function mapTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    name: row.name,
    puzzleType: asPuzzleType(row.puzzle_type),
    entryFee: Math.max(0, asNumber(row.entry_fee)),
    prizePool: Math.max(0, asNumber(row.prize_pool)),
    maxPlayers: Math.max(0, asNumber(row.max_players)),
    currentPlayers: Math.max(0, asNumber(row.current_players)),
    startsAt: row.starts_at,
    status: row.status,
  };
}

function mapSeason(row: SeasonRow): SeasonPass {
  const tracks = (Array.isArray(row.tracks_json) ? row.tracks_json : [])
    .map(mapSeasonTrack)
    .filter((track): track is SeasonTrack => Boolean(track))
    .sort((left, right) => left.tier - right.tier);

  return {
    id: row.id,
    name: row.name,
    seasonNumber: Math.max(1, asNumber(row.season_number, CURRENT_SEASON.seasonNumber)),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    currentTier: Math.max(1, asNumber(row.current_tier, CURRENT_SEASON.currentTier)),
    maxTier: Math.max(1, asNumber(row.max_tier, CURRENT_SEASON.maxTier)),
    isPremium: asBoolean(row.is_premium),
    tracks: tracks.length > 0 ? tracks : CURRENT_SEASON.tracks.map((track) => ({ ...track })),
  };
}

async function loadLivePuzzleCatalog(): Promise<PuzzleMeta[] | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("puzzle_catalog")
    .select("type, sort_order, label, icon, description, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return null;
    }
    throw error;
  }

  const rows = (data ?? []) as PuzzleCatalogRow[];
  if (rows.length === 0) {
    return null;
  }

  return rows.map(mapPuzzleMeta);
}

async function loadLiveDailyChallenges(): Promise<DailyChallenge[] | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("daily_challenges")
    .select("id, challenge_date, puzzle_type, puzzle_seed, difficulty, time_limit, grid_size, title, description, reward_json, completed_by, active")
    .eq("active", true)
    .order("challenge_date", { ascending: false })
    .limit(8);

  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return null;
    }
    throw error;
  }

  const rows = (data ?? []) as DailyChallengeRow[];
  if (rows.length === 0) {
    return null;
  }

  return rows.map(mapDailyChallenge);
}

async function loadLiveTournaments(): Promise<Tournament[] | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("tournaments")
    .select("id, name, puzzle_type, entry_fee, prize_pool, max_players, current_players, starts_at, status, active")
    .eq("active", true)
    .order("starts_at", { ascending: true })
    .limit(12);

  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return null;
    }
    throw error;
  }

  const rows = (data ?? []) as TournamentRow[];
  if (rows.length === 0) {
    return null;
  }

  return rows.map(mapTournament);
}

async function loadLiveSeason(): Promise<SeasonPass | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, season_number, starts_at, ends_at, current_tier, max_tier, is_premium, tracks_json, metadata, active")
    .eq("active", true)
    .order("season_number", { ascending: false })
    .limit(1);

  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return null;
    }
    throw error;
  }

  const row = ((data ?? []) as SeasonRow[])[0];
  return row ? mapSeason(row) : null;
}

export async function loadDiscoveryContent(): Promise<DiscoveryContentSnapshot> {
  const [dailyChallenges, tournaments, puzzleTypes] = await Promise.all([
    loadLiveDailyChallenges(),
    loadLiveTournaments(),
    loadLivePuzzleCatalog(),
  ]);

  return {
    dailyChallenges: (dailyChallenges ?? DAILY_CHALLENGES).map(cloneDailyChallenge),
    tournaments: (tournaments ?? TOURNAMENTS).map(cloneTournament),
    puzzleTypes: (puzzleTypes ?? PUZZLE_TYPES).map(clonePuzzleMeta),
    sources: {
      dailyChallenges: dailyChallenges ? "supabase" : "seed",
      tournaments: tournaments ? "supabase" : "seed",
      puzzleTypes: puzzleTypes ? "supabase" : "seed",
    },
  };
}

export async function loadSeasonContent(user: UserProfile | null): Promise<SeasonContentSnapshot> {
  const [season, storefront, quests] = await Promise.all([
    loadLiveSeason(),
    fetchStorefront(user),
    loadQuestSnapshot(user),
  ]);

  const usesLiveProfileData = Boolean(supabase && user && !user.isGuest);

  return {
    season: cloneSeason(season ?? CURRENT_SEASON),
    hasSeasonPass: Boolean(storefront.wallet?.hasSeasonPass),
    quests: {
      daily: quests.daily.map(cloneQuest),
      weekly: quests.weekly.map(cloneQuest),
      seasonal: quests.seasonal.map(cloneQuest),
    },
    sources: {
      season: season ? "supabase" : "seed",
      entitlements: usesLiveProfileData ? "supabase" : "seed",
      quests: usesLiveProfileData ? "supabase" : "seed",
    },
  };
}

export async function loadProfileContent(currentUserId?: string): Promise<ProfileContentSnapshot> {
  const canUseLiveData = Boolean(supabase && currentUserId && currentUserId !== "guest-player");
  const livePuzzleTypes = await loadLivePuzzleCatalog();

  if (!canUseLiveData) {
    return {
      leaderboard: LEADERBOARD.slice(0, 8).map(cloneLeaderboardEntry),
      socialDirectory: buildSeedSocialDirectory(currentUserId).map(cloneSocialEntry),
      puzzleTypes: (livePuzzleTypes ?? PUZZLE_TYPES).map(clonePuzzleMeta),
      sources: {
        leaderboard: "seed",
        socialDirectory: "seed",
        puzzleTypes: livePuzzleTypes ? "supabase" : "seed",
      },
    };
  }

  const [leaderboard, socialDirectory] = await Promise.all([
    fetchLeaderboard(8),
    fetchSocialDirectory(currentUserId),
  ]);

  const resolvedLeaderboard = leaderboard.length > 0 ? leaderboard : LEADERBOARD.slice(0, 8);
  const resolvedSocialDirectory = socialDirectory.length > 0 ? socialDirectory : buildSeedSocialDirectory(currentUserId);

  return {
    leaderboard: resolvedLeaderboard.map(cloneLeaderboardEntry),
    socialDirectory: resolvedSocialDirectory.map(cloneSocialEntry),
    puzzleTypes: (livePuzzleTypes ?? PUZZLE_TYPES).map(clonePuzzleMeta),
    sources: {
      leaderboard: leaderboard.length > 0 ? "supabase" : "seed",
      socialDirectory: socialDirectory.length > 0 ? "supabase" : "seed",
      puzzleTypes: livePuzzleTypes ? "supabase" : "seed",
    },
  };
}

export async function loadStoreContent(user: UserProfile | null): Promise<StoreContentSnapshot> {
  const storefront = await fetchStorefront(user);
  const usesLiveProfileData = Boolean(supabase && user && !user.isGuest);

  return {
    storefront: cloneStorefrontSnapshot(storefront),
    vipMembership: cloneVipMembership(VIP_MEMBERSHIP),
    sources: {
      storefront: usesLiveProfileData ? "supabase" : "seed",
      vipMembership: "seed",
    },
  };
}
