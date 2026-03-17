import type { Session } from "@supabase/supabase-js";
import { CURRENT_USER, getRankBand } from "@/lib/seed-data";
import { DEFAULT_AVATAR_ID } from "@/lib/profile-customization";
import {
  isSupabaseSchemaSetupIssue,
  supabase,
  toSupabaseSchemaSetupError,
} from "@/lib/supabase-client";
import type {
  LeaderboardEntry,
  PuzzleType,
  StockAvatarId,
  UserProfile,
} from "@/lib/types";

type ProfileRow = {
  id: string;
  username: string;
  avatar_id: StockAvatarId | null;
  rank: UserProfile["rank"];
  elo: number;
  level: number;
  xp: number;
  xp_to_next: number;
  coins: number;
  gems: number;
  puzzle_shards: number;
  rank_points: number;
  pass_xp: number;
  is_vip: boolean;
  vip_expires_at: string | null;
  has_season_pass: boolean;
  theme_id: string | null;
  frame_id: string | null;
  player_card_id: string | null;
  banner_id: string | null;
  emblem_id: string | null;
  title_id: string | null;
  hint_balance: number;
  best_puzzle_type: string | null;
  worst_puzzle_type: string | null;
  rival_user_id: string | null;
  facebook_handle: string | null;
  tiktok_handle: string | null;
  created_at: string;
};

type PlayerStatsRow = {
  wins: number;
  losses: number;
  matches_played: number;
  win_streak: number;
  best_streak: number;
};

type PuzzleStatsRow = {
  puzzle_type: PuzzleType;
  matches_played: number;
  wins: number;
  total_progress: number;
};

type SocialDirectoryEntry = {
  id: string;
  username: string;
  avatar_id: StockAvatarId | null;
  rank: UserProfile["rank"];
  elo: number;
  facebook_handle: string | null;
  tiktok_handle: string | null;
};

type SecurityQuestionsRow = {
  user_id: string;
};

function defaultUsernameForSession(session: Session) {
  const metadataUsername =
    typeof session.user.user_metadata?.username === "string" ? session.user.user_metadata.username.trim() : "";
  if (metadataUsername) {
    return metadataUsername;
  }

  const emailPrefix = session.user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9_-]/g, "") ?? "Player";
  const suffix = session.user.id.replace(/-/g, "").slice(0, 6);
  return `${emailPrefix || "Player"}-${suffix}`;
}

function throwIfUnexpected(error: unknown, resource: string) {
  if (!error) return;
  if (isSupabaseSchemaSetupIssue(error)) {
    throw toSupabaseSchemaSetupError(error, resource);
  }
  throw error;
}

async function ensureProfileAndStats(session: Session) {
  if (!supabase) return;

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", session.user.id)
    .maybeSingle<{ id: string }>();

  throwIfUnexpected(profileLookupError, "public.profiles");

  if (!existingProfile) {
    const { error: insertProfileError } = await supabase.from("profiles").insert({
      id: session.user.id,
      username: defaultUsernameForSession(session),
      avatar_id: DEFAULT_AVATAR_ID,
    });

    throwIfUnexpected(insertProfileError, "public.profiles");
  }

  const { data: existingStats, error: statsLookupError } = await supabase
    .from("player_stats")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle<{ user_id: string }>();

  throwIfUnexpected(statsLookupError, "public.player_stats");

  if (!existingStats) {
    const { error: insertStatsError } = await supabase.from("player_stats").insert({
      user_id: session.user.id,
    });

    throwIfUnexpected(insertStatsError, "public.player_stats");
  }
}

function emptyPuzzleSkills() {
  return { ...CURRENT_USER.puzzleSkills };
}

export function buildGuestUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    ...CURRENT_USER,
    id: "guest-player",
    username: overrides.username ?? "Guest Player",
    avatarId: overrides.avatarId ?? DEFAULT_AVATAR_ID,
    frameId: overrides.frameId,
    themeId: overrides.themeId,
    hintBalance: overrides.hintBalance ?? 0,
    hasSeasonPass: overrides.hasSeasonPass ?? false,
    vipExpiresAt: overrides.vipExpiresAt ?? null,
    puzzleShards: overrides.puzzleShards ?? 0,
    rankPoints: overrides.rankPoints ?? 0,
    passXp: overrides.passXp ?? 0,
    socialLinks: {
      ...CURRENT_USER.socialLinks,
      ...overrides.socialLinks,
    },
    puzzleSkills: {
      ...emptyPuzzleSkills(),
      ...overrides.puzzleSkills,
    },
    isGuest: true,
    authMethod: "guest",
    email: null,
    linkedProviders: {
      email: false,
      facebook: false,
      tiktok: false,
    },
    securityQuestionsConfigured: false,
    bestPuzzleType: null,
    worstPuzzleType: null,
    rivalUserId: null,
    ...overrides,
  };
}

export function buildAuthenticatedFallbackUser(session: Session, overrides: Partial<UserProfile> = {}): UserProfile {
  const linkedProviders = buildLinkedProviders(session);
  return buildGuestUser({
    id: session.user.id,
    username: defaultUsernameForSession(session),
    email: session.user.email ?? null,
    joinedAt: session.user.created_at ?? new Date().toISOString(),
    isGuest: false,
    authMethod: resolvePrimaryAuthMethod(linkedProviders),
    linkedProviders,
    ...overrides,
  });
}

function buildLinkedProviders(session: Session) {
  const identityProviders = new Set(
    (session.user.identities ?? [])
      .map((identity) => identity.provider?.toLowerCase())
      .filter((provider): provider is string => Boolean(provider)),
  );

  return {
    email: Boolean(session.user.email),
    facebook: identityProviders.has("facebook"),
    tiktok:
      identityProviders.has("tiktok") ||
      identityProviders.has("custom:tiktok") ||
      identityProviders.has("puzzle-rivals-tiktok"),
  };
}

function resolvePrimaryAuthMethod(linkedProviders: ReturnType<typeof buildLinkedProviders>): UserProfile["authMethod"] {
  if (linkedProviders.facebook) return "facebook";
  if (linkedProviders.tiktok) return "tiktok";
  if (linkedProviders.email) return "email";
  return "guest";
}

function computePuzzleSnapshot(rows: PuzzleStatsRow[]) {
  const puzzleSkills = emptyPuzzleSkills();
  let worstPuzzleType: PuzzleType | null = null;
  let worstScore = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    if (!row.matches_played) continue;
    const averageProgress = Math.round(row.total_progress / row.matches_played);
    puzzleSkills[row.puzzle_type] = averageProgress;
    if (averageProgress < worstScore) {
      worstScore = averageProgress;
      worstPuzzleType = row.puzzle_type;
    }
  }

  return {
    puzzleSkills,
    worstPuzzleType,
  };
}

export async function loadCurrentUserFromSession(session: Session | null): Promise<UserProfile | null> {
  if (!supabase || !session?.user) {
    return null;
  }

  await ensureProfileAndStats(session);

  const [
    { data: profile, error: profileError },
    { data: stats, error: statsError },
    { data: puzzleStats, error: puzzleStatsError },
    { data: securityQuestions, error: securityQuestionsError },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).single<ProfileRow>(),
    supabase.from("player_stats").select("*").eq("user_id", session.user.id).single<PlayerStatsRow>(),
    supabase.from("player_puzzle_stats").select("puzzle_type, matches_played, wins, total_progress").eq("user_id", session.user.id),
    supabase.from("user_security_questions").select("user_id").eq("user_id", session.user.id).maybeSingle<SecurityQuestionsRow>(),
  ]);

  throwIfUnexpected(profileError, "public.profiles");
  throwIfUnexpected(statsError, "public.player_stats");

  if (puzzleStatsError && !isSupabaseSchemaSetupIssue(puzzleStatsError)) {
    throw puzzleStatsError;
  }

  if (securityQuestionsError && !isSupabaseSchemaSetupIssue(securityQuestionsError)) {
    throw securityQuestionsError;
  }

  if (!profile) {
    return buildAuthenticatedFallbackUser(session);
  }

  const computed = computePuzzleSnapshot((puzzleStatsError ? [] : puzzleStats ?? []) as PuzzleStatsRow[]);
  const linkedProviders = buildLinkedProviders(session);

  return {
    ...CURRENT_USER,
    id: profile.id,
    username: profile.username,
    email: session.user.email ?? null,
    avatarId: profile.avatar_id ?? DEFAULT_AVATAR_ID,
    frameId: profile.frame_id ?? undefined,
    themeId: profile.theme_id ?? undefined,
    playerCardId: profile.player_card_id ?? undefined,
    bannerId: profile.banner_id ?? undefined,
    emblemId: profile.emblem_id ?? undefined,
    titleId: profile.title_id ?? undefined,
    hintBalance: profile.hint_balance,
    hasSeasonPass: profile.has_season_pass,
    vipExpiresAt: profile.vip_expires_at,
    elo: profile.elo,
    rank: getRankBand(profile.elo).tier,
    level: profile.level,
    xp: profile.xp,
    xpToNext: profile.xp_to_next,
    coins: profile.coins,
    gems: profile.gems,
    puzzleShards: profile.puzzle_shards,
    rankPoints: profile.rank_points,
    passXp: profile.pass_xp,
    isVip: profile.is_vip,
    wins: stats?.wins ?? 0,
    losses: stats?.losses ?? 0,
    matchesPlayed: stats?.matches_played ?? 0,
    winStreak: stats?.win_streak ?? 0,
    bestStreak: stats?.best_streak ?? 0,
    joinedAt: profile.created_at,
    isGuest: false,
    authMethod: resolvePrimaryAuthMethod(linkedProviders),
    linkedProviders,
    securityQuestionsConfigured: Boolean(securityQuestionsError ? null : securityQuestions),
    bestPuzzleType: (profile.best_puzzle_type as PuzzleType | null) ?? null,
    worstPuzzleType: (profile.worst_puzzle_type as PuzzleType | null) ?? computed.worstPuzzleType,
    rivalUserId: profile.rival_user_id,
    socialLinks: {
      facebook: profile.facebook_handle ?? undefined,
      tiktok: profile.tiktok_handle ?? undefined,
    },
    puzzleSkills: computed.puzzleSkills,
  };
}

export async function saveProfileToSupabase(user: UserProfile) {
  if (!supabase || user.isGuest) {
    return;
  }

  const { error } = await supabase.from("profiles").update({
    username: user.username,
    avatar_id: user.avatarId ?? DEFAULT_AVATAR_ID,
    hint_balance: user.hintBalance ?? 0,
    facebook_handle: user.socialLinks.facebook?.trim() || null,
    tiktok_handle: user.socialLinks.tiktok?.trim() || null,
  }).eq("id", user.id);

  if (error) {
    throw error;
  }
}

export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  if (!supabase) {
    return [];
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return [];
  }

  const { data } = await supabase
    .from("player_stats")
    .select("user_id, wins, matches_played, profiles!inner(id, username, rank, elo, avatar_id)")
    .gt("matches_played", 0)
    .limit(Math.max(limit, 10));

  return (data ?? [])
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      if (!profile) return null;
      return {
        userId: profile.id,
        username: profile.username,
        avatarId: profile.avatar_id ?? undefined,
        avatarUrl: profile.avatar_id ?? undefined,
        elo: profile.elo,
        rankTier: profile.rank,
        wins: row.wins,
        rank: 0,
      } satisfies LeaderboardEntry;
    })
    .filter((entry): entry is LeaderboardEntry => Boolean(entry))
    .sort((left, right) => right.elo - left.elo)
    .slice(0, limit)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

export async function fetchSocialDirectory(currentUserId?: string): Promise<SocialDirectoryEntry[]> {
  if (!supabase) {
    return [];
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return [];
  }

  let query = supabase
    .from("profiles")
    .select("id, username, avatar_id, rank, elo, facebook_handle, tiktok_handle");

  if (currentUserId) {
    query = query.neq("id", currentUserId);
  }

  const { data } = await query.order("elo", { ascending: false });
  return (data ?? []) as SocialDirectoryEntry[];
}
