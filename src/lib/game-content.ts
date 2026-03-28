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
  ProfileActivityEvent,
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
export type GameContentResolution = "live" | "fallback" | "empty";
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
  resolutions: {
    dailyChallenges: GameContentResolution;
    tournaments: GameContentResolution;
    puzzleTypes: GameContentResolution;
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
  activityFeed: ProfileActivityEvent[];
  sources: {
    leaderboard: GameContentSource;
    socialDirectory: GameContentSource;
    puzzleTypes: GameContentSource;
    activityFeed: GameContentSource;
  };
  resolutions: {
    leaderboard: GameContentResolution;
    socialDirectory: GameContentResolution;
    puzzleTypes: GameContentResolution;
    activityFeed: GameContentResolution;
  };
}

export interface StoreContentSnapshot {
  storefront: StorefrontSnapshot;
  vipMembership: VipMembership | null;
  sources: {
    storefront: GameContentSource;
    vipMembership: GameContentSource;
  };
  resolutions: {
    storefront: GameContentResolution;
    vipMembership: GameContentResolution;
  };
}

export interface NotificationSummarySnapshot {
  unreadCount: number;
  recent: ProfileActivityEvent[];
  source: GameContentSource;
  resolution: GameContentResolution;
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

type ProfileRoundActivityRow = {
  round_id: string;
  created_at: string;
  placement: number | null;
  xp_delta: number;
  coin_delta: number;
  elo_delta: number;
  live_progress: number;
  solved_at_ms: number | null;
  rounds:
    | {
        round_no: number;
        puzzle_type: string;
        difficulty: number;
        lobbies:
          | {
              mode: string;
            }
          | Array<{
              mode: string;
            }>
          | null;
      }
    | Array<{
        round_no: number;
        puzzle_type: string;
        difficulty: number;
        lobbies:
          | {
              mode: string;
            }
          | Array<{
              mode: string;
            }>
          | null;
      }>
    | null;
};

type PurchaseProductRow = {
  id: string;
  kind: string;
  metadata: Record<string, unknown> | null;
};

type PurchaseItemActivityRow = {
  product_id: string;
  quantity: number;
  unit_amount: number | string;
  products: PurchaseProductRow | PurchaseProductRow[] | null;
};

type PurchaseActivityRow = {
  id: string;
  status: string;
  amount: number | string;
  currency: string;
  created_at: string;
  captured_at: string | null;
  purchase_items: PurchaseItemActivityRow[] | null;
};

type SocialProfileActivityRow = {
  id: string;
  username: string;
  facebook_handle: string | null;
  tiktok_handle: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileActivityEventRow = {
  id: string;
  event_type: ProfileActivityEvent["type"];
  label: string;
  title: string;
  description: string;
  occurred_at: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
};

const PUZZLE_TYPE_SET = new Set<PuzzleType>(PUZZLE_TYPES.map((entry) => entry.type));
const DEFAULT_PUZZLE_TYPE = PUZZLE_TYPES[0]?.type ?? "rotate_pipes";

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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatSignedValue(value: number, label: string) {
  if (!value) {
    return null;
  }

  return `${value > 0 ? "+" : ""}${value} ${label}`;
}

function formatCurrencyAmount(value: number | string, currency: string) {
  const amount = asNumber(value, 0);
  if (currency === "USD") {
    return `$${amount.toFixed(2)}`;
  }
  return `${currency} ${amount.toFixed(2)}`;
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

function cloneActivityEvent(entry: ProfileActivityEvent): ProfileActivityEvent {
  return { ...entry };
}

function buildNotificationSummary(
  activityFeed: ProfileActivityEvent[],
  source: GameContentSource,
  resolution: GameContentResolution,
): NotificationSummarySnapshot {
  const recent = activityFeed.slice(0, 3).map(cloneActivityEvent);
  const unreadCount = activityFeed.filter((entry) => !entry.isRead).length;

  return {
    unreadCount,
    recent,
    source,
    resolution,
  };
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
    vipMembership: snapshot.vipMembership ? cloneVipMembership(snapshot.vipMembership) : null,
    wallet: snapshot.wallet ? { ...snapshot.wallet } : null,
    source: snapshot.source,
  };
}

function resolveCollection<T>(liveData: T[] | null, fallbackData: T[]) {
  if (liveData === null) {
    return {
      data: fallbackData,
      source: "seed" as const,
      resolution: "fallback" as const,
    };
  }

  return {
    data: liveData,
    source: "supabase" as const,
    resolution: liveData.length > 0 ? ("live" as const) : ("empty" as const),
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

function buildSeedActivityFeed(currentUserId?: string): ProfileActivityEvent[] {
  const socialPreview = buildSeedSocialDirectory(currentUserId).find(
    (entry) => entry.facebook_handle || entry.tiktok_handle,
  );

  return [
    {
      id: "seed-match-victory",
      type: "match",
      label: "Ranked Match",
      title: "Won a ranked Pipe Flow round",
      description: "#1 finish | +180 XP | +90 Coins | +28 ELO",
      occurredAt: "2026-03-19T20:15:00Z",
      isRead: false,
    },
    {
      id: "seed-purchase-pass",
      type: "purchase",
      label: "Purchase",
      title: "Unlocked Season XI Battle Pass",
      description: "$9.99 | battle_pass | captured",
      occurredAt: "2026-03-19T18:40:00Z",
      isRead: false,
    },
    {
      id: "seed-social-rival",
      type: "social",
      label: "Social",
      title: socialPreview ? `${socialPreview.username} is active in the rival directory` : "Social identity connected",
      description: socialPreview
        ? `Creator handle: ${socialPreview.facebook_handle ?? socialPreview.tiktok_handle}`
        : "Linked profiles and creator handles appear here once the account is live.",
      occurredAt: "2026-03-19T17:05:00Z",
      isRead: false,
    },
  ];
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

function mapRoundActivity(
  row: ProfileRoundActivityRow,
  puzzleLabelByType: Map<PuzzleType, string>,
): ProfileActivityEvent {
  const round = firstRelation(row.rounds);
  const lobby = firstRelation(round?.lobbies ?? null);
  const puzzleType = asPuzzleType(round?.puzzle_type);
  const puzzleLabel = puzzleLabelByType.get(puzzleType) ?? PUZZLE_TYPES.find((entry) => entry.type === puzzleType)?.label ?? puzzleType;
  const modeLabel = lobby?.mode ? toTitleCase(lobby.mode) : "Live";
  const performanceBits = [
    row.placement ? `#${row.placement} finish` : null,
    formatSignedValue(row.xp_delta, "XP"),
    formatSignedValue(row.coin_delta, "Coins"),
    formatSignedValue(row.elo_delta, "ELO"),
    !row.placement && row.live_progress ? `${row.live_progress}% progress` : null,
  ].filter((entry): entry is string => Boolean(entry));

  const title = row.placement === 1
    ? `Won a ${modeLabel.toLowerCase()} ${puzzleLabel} round`
    : row.placement
      ? `Finished #${row.placement} in ${puzzleLabel}`
      : row.live_progress >= 100
        ? `Solved ${puzzleLabel}`
        : `Played ${puzzleLabel}`;

  return {
    id: `match-${row.round_id}`,
    type: "match",
    label: `${modeLabel} Match`,
    title,
    description: [performanceBits.join(" | "), round?.round_no ? `Round ${round.round_no}` : null]
      .filter((entry): entry is string => Boolean(entry))
      .join(" | "),
    occurredAt: row.created_at,
    isRead: false,
  };
}

function mapPurchaseActivity(row: PurchaseActivityRow): ProfileActivityEvent {
  const firstItem = row.purchase_items?.[0] ?? null;
  const product = firstRelation(firstItem?.products ?? null);
  const productName = asString(product?.metadata?.name, firstItem?.product_id ?? "Store item");
  const productKind = asString(product?.kind, "purchase");
  const status = asString(row.status, "created");
  const occurredAt = row.captured_at ?? row.created_at;

  const title = status === "captured"
    ? `Unlocked ${productName}`
    : status === "approved"
      ? `Purchase approved for ${productName}`
      : status === "failed"
        ? `Purchase failed for ${productName}`
        : `Checkout started for ${productName}`;

  return {
    id: `purchase-${row.id}`,
    type: "purchase",
    label: status === "captured" ? "Purchase" : "Checkout",
    title,
    description: [formatCurrencyAmount(row.amount, row.currency), productKind, status]
      .filter((entry): entry is string => Boolean(entry))
      .join(" | "),
    occurredAt,
    isRead: false,
  };
}

function mapSelfSocialActivity(row: SocialProfileActivityRow, platform: "facebook" | "tiktok"): ProfileActivityEvent {
  const handle = platform === "facebook" ? row.facebook_handle : row.tiktok_handle;
  const platformLabel = platform === "facebook" ? "Facebook" : "TikTok";

  return {
    id: `social-self-${platform}`,
    type: "social",
    label: "Social",
    title: `${platformLabel} identity linked`,
    description: `${handle} is visible in your live rival profile.`,
    occurredAt: row.updated_at ?? row.created_at,
    isRead: false,
  };
}

function mapRivalSocialActivity(row: SocialProfileActivityRow): ProfileActivityEvent | null {
  const handle = row.tiktok_handle ?? row.facebook_handle;
  const platformLabel = row.tiktok_handle ? "TikTok" : row.facebook_handle ? "Facebook" : null;

  if (!handle || !platformLabel) {
    return null;
  }

  return {
    id: `social-rival-${row.id}`,
    type: "social",
    label: "Social",
    title: `${row.username} is active on ${platformLabel}`,
    description: `Creator handle: ${handle}`,
    occurredAt: row.updated_at ?? row.created_at,
    isRead: false,
  };
}

function sortActivityFeed(entries: ProfileActivityEvent[]) {
  return [...entries].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}

function mapPersistedActivityEvent(row: ProfileActivityEventRow): ProfileActivityEvent {
  const type = row.event_type === "match" || row.event_type === "purchase" || row.event_type === "social"
    ? row.event_type
    : "social";

  return {
    id: row.id,
    type,
    label: row.label,
    title: row.title,
    description: row.description,
    occurredAt: row.occurred_at,
    isRead: Boolean(row.is_read),
  };
}

async function loadPersistedProfileActivity(currentUserId: string): Promise<ProfileActivityEvent[] | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profile_activity_events")
    .select("id, event_type, label, title, description, occurred_at, is_read, metadata")
    .eq("user_id", currentUserId)
    .order("occurred_at", { ascending: false })
    .limit(12);

  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return null;
    }
    throw error;
  }

  const rows = (data ?? []) as ProfileActivityEventRow[];
  return rows.map(mapPersistedActivityEvent);
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

async function loadLiveMatchActivity(
  currentUserId: string,
  puzzleLabelByType: Map<PuzzleType, string>,
): Promise<ProfileActivityEvent[] | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("round_results")
    .select("round_id, created_at, placement, xp_delta, coin_delta, elo_delta, live_progress, solved_at_ms, rounds!inner(round_no, puzzle_type, difficulty, lobbies!inner(mode))")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return null;
    }
    throw error;
  }

  const rows = (data ?? []) as ProfileRoundActivityRow[];
  return rows.map((row) => mapRoundActivity(row, puzzleLabelByType));
}

async function loadLivePurchaseActivity(currentUserId: string): Promise<ProfileActivityEvent[] | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("purchases")
    .select("id, status, amount, currency, created_at, captured_at, purchase_items(product_id, quantity, unit_amount, products(id, kind, metadata))")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return null;
    }
    throw error;
  }

  const rows = (data ?? []) as PurchaseActivityRow[];
  return rows.map(mapPurchaseActivity);
}

async function loadLiveSocialActivity(currentUserId: string): Promise<ProfileActivityEvent[] | null> {
  if (!supabase) {
    return null;
  }

  const [{ data: selfRows, error: selfError }, { data: socialRows, error: socialError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, facebook_handle, tiktok_handle, created_at, updated_at")
      .eq("id", currentUserId)
      .limit(1),
    supabase
      .from("profiles")
      .select("id, username, facebook_handle, tiktok_handle, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  if (selfError) {
    if (isSupabaseSchemaSetupIssue(selfError)) {
      return null;
    }
    throw selfError;
  }

  if (socialError) {
    if (isSupabaseSchemaSetupIssue(socialError)) {
      return null;
    }
    throw socialError;
  }

  const selfProfile = ((selfRows ?? []) as SocialProfileActivityRow[])[0] ?? null;
  const recentProfiles = ((socialRows ?? []) as SocialProfileActivityRow[])
    .filter((row) => row.id !== currentUserId && (row.facebook_handle || row.tiktok_handle))
    .slice(0, 2);

  const events: ProfileActivityEvent[] = [];

  if (selfProfile?.facebook_handle) {
    events.push(mapSelfSocialActivity(selfProfile, "facebook"));
  }
  if (selfProfile?.tiktok_handle) {
    events.push(mapSelfSocialActivity(selfProfile, "tiktok"));
  }

  for (const row of recentProfiles) {
    const event = mapRivalSocialActivity(row);
    if (event) {
      events.push(event);
    }
  }

  return sortActivityFeed(events);
}

async function loadLiveProfileActivity(
  currentUserId: string,
  puzzleTypes: PuzzleMeta[],
): Promise<ProfileActivityEvent[] | null> {
  const persistedActivity = await loadPersistedProfileActivity(currentUserId);
  if (persistedActivity && persistedActivity.length > 0) {
    return persistedActivity.slice(0, 8);
  }

  const puzzleLabelByType = new Map(puzzleTypes.map((entry) => [entry.type, entry.label] as const));
  const [matchActivity, purchaseActivity, socialActivity] = await Promise.all([
    loadLiveMatchActivity(currentUserId, puzzleLabelByType),
    loadLivePurchaseActivity(currentUserId),
    loadLiveSocialActivity(currentUserId),
  ]);

  const activityFeed = sortActivityFeed([
    ...(matchActivity ?? []),
    ...(purchaseActivity ?? []),
    ...(socialActivity ?? []),
  ]).slice(0, 8);

  return activityFeed;
}

export async function markProfileActivityEventsRead(currentUserId: string, eventIds: string[]) {
  if (!supabase || !currentUserId || eventIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("profile_activity_events")
    .update({ is_read: true })
    .eq("user_id", currentUserId)
    .in("id", eventIds)
    .eq("is_read", false);

  if (error && !isSupabaseSchemaSetupIssue(error)) {
    throw error;
  }
}
export async function loadDiscoveryContent(): Promise<DiscoveryContentSnapshot> {
  const [dailyChallenges, tournaments, puzzleTypes] = await Promise.all([
    loadLiveDailyChallenges(),
    loadLiveTournaments(),
    loadLivePuzzleCatalog(),
  ]);

  const resolvedDailyChallenges = resolveCollection(dailyChallenges, DAILY_CHALLENGES.map(cloneDailyChallenge));
  const resolvedTournaments = resolveCollection(tournaments, TOURNAMENTS.map(cloneTournament));
  const resolvedPuzzleTypes = resolveCollection(puzzleTypes, PUZZLE_TYPES.map(clonePuzzleMeta));

  return {
    dailyChallenges: resolvedDailyChallenges.data.map(cloneDailyChallenge),
    tournaments: resolvedTournaments.data.map(cloneTournament),
    puzzleTypes: resolvedPuzzleTypes.data.map(clonePuzzleMeta),
    sources: {
      dailyChallenges: resolvedDailyChallenges.source,
      tournaments: resolvedTournaments.source,
      puzzleTypes: resolvedPuzzleTypes.source,
    },
    resolutions: {
      dailyChallenges: resolvedDailyChallenges.resolution,
      tournaments: resolvedTournaments.resolution,
      puzzleTypes: resolvedPuzzleTypes.resolution,
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
  const canUseLiveDiscovery = Boolean(supabase);
  const canUseLiveActivity = Boolean(supabase && currentUserId && currentUserId !== "guest-player");
  const livePuzzleTypes = await loadLivePuzzleCatalog();
  const resolvedPuzzleTypes = resolveCollection(livePuzzleTypes, PUZZLE_TYPES.map(clonePuzzleMeta));

  if (!canUseLiveDiscovery) {
    return {
      leaderboard: LEADERBOARD.slice(0, 8).map(cloneLeaderboardEntry),
      socialDirectory: buildSeedSocialDirectory(currentUserId).map(cloneSocialEntry),
      puzzleTypes: resolvedPuzzleTypes.data.map(clonePuzzleMeta),
      activityFeed: buildSeedActivityFeed(currentUserId).map(cloneActivityEvent),
      sources: {
        leaderboard: "seed",
        socialDirectory: "seed",
        puzzleTypes: resolvedPuzzleTypes.source,
        activityFeed: "seed",
      },
      resolutions: {
        leaderboard: "fallback",
        socialDirectory: "fallback",
        puzzleTypes: resolvedPuzzleTypes.resolution,
        activityFeed: "fallback",
      },
    };
  }

  const [leaderboard, socialDirectory, activityFeed] = await Promise.all([
    fetchLeaderboard(8),
    fetchSocialDirectory(canUseLiveActivity ? currentUserId : undefined),
    canUseLiveActivity ? loadLiveProfileActivity(currentUserId, resolvedPuzzleTypes.data) : Promise.resolve([]),
  ]);

  const resolvedActivityFeed = activityFeed ?? buildSeedActivityFeed(currentUserId);

  return {
    leaderboard: leaderboard.map(cloneLeaderboardEntry),
    socialDirectory: socialDirectory.map(cloneSocialEntry),
    puzzleTypes: resolvedPuzzleTypes.data.map(clonePuzzleMeta),
    activityFeed: resolvedActivityFeed.map(cloneActivityEvent),
    sources: {
      leaderboard: "supabase",
      socialDirectory: "supabase",
      puzzleTypes: resolvedPuzzleTypes.source,
      activityFeed: activityFeed === null ? "seed" : "supabase",
    },
    resolutions: {
      leaderboard: leaderboard.length > 0 ? "live" : "empty",
      socialDirectory: socialDirectory.length > 0 ? "live" : "empty",
      puzzleTypes: resolvedPuzzleTypes.resolution,
      activityFeed: activityFeed === null ? "fallback" : activityFeed.length > 0 ? "live" : "empty",
    },
  };
}

export async function loadNotificationSummary(currentUserId?: string): Promise<NotificationSummarySnapshot> {
  const canUseLiveActivity = Boolean(supabase && currentUserId && currentUserId !== "guest-player");

  if (!supabase) {
    return buildNotificationSummary(buildSeedActivityFeed(currentUserId), "seed", "fallback");
  }

  if (!canUseLiveActivity) {
    return buildNotificationSummary([], "supabase", "empty");
  }

  const livePuzzleTypes = await loadLivePuzzleCatalog();
  const resolvedPuzzleTypes = resolveCollection(livePuzzleTypes, PUZZLE_TYPES.map(clonePuzzleMeta));
  const activityFeed = await loadLiveProfileActivity(currentUserId, resolvedPuzzleTypes.data);
  const resolvedActivityFeed = (activityFeed ?? buildSeedActivityFeed(currentUserId)).map(cloneActivityEvent);

  return buildNotificationSummary(
    resolvedActivityFeed,
    activityFeed === null ? "seed" : "supabase",
    activityFeed === null ? "fallback" : activityFeed.length > 0 ? "live" : "empty",
  );
}

export async function loadStoreContent(user: UserProfile | null): Promise<StoreContentSnapshot> {
  const storefront = await fetchStorefront(user);
  const vipMembership = storefront.vipMembership ? cloneVipMembership(storefront.vipMembership) : null;

  return {
    storefront: cloneStorefrontSnapshot(storefront),
    vipMembership,
    sources: {
      storefront: storefront.source,
      vipMembership: storefront.source === "supabase" ? "supabase" : "seed",
    },
    resolutions: {
      storefront: storefront.source === "seed" ? "fallback" : storefront.items.length > 0 || storefront.vipProduct ? "live" : "empty",
      vipMembership: storefront.source === "seed" ? "fallback" : vipMembership ? "live" : "empty",
    },
  };
}













