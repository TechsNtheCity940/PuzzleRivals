import {
  isSupabaseSchemaSetupIssue,
  supabase,
  supabaseConfigErrorMessage,
} from "@/lib/supabase-client";
import type {
  RankTier,
  StockAvatarId,
  UserAppRole,
  UserProfile,
} from "@/lib/types";

export type SocialContentSource = "supabase";
export type SocialContentResolution = "live" | "empty" | "unavailable";
export type FriendshipState =
  | "none"
  | "friend"
  | "incoming_request"
  | "outgoing_request";

export interface SocialProfileCard {
  id: string;
  username: string;
  avatarId?: StockAvatarId;
  rank: RankTier;
  elo: number;
  appRole?: UserAppRole | null;
  socialLinks: {
    facebook?: string;
    tiktok?: string;
  };
  isOnline: boolean;
  lastSeenAt: string | null;
  friendshipState: FriendshipState;
}

export interface FriendRequestSnapshot {
  id: string;
  direction: "incoming" | "outgoing";
  message?: string;
  createdAt: string;
  profile: SocialProfileCard;
}

export interface FriendEntrySnapshot {
  profile: SocialProfileCard;
  since: string;
  threadId: string | null;
}

export interface DirectMessageSnapshot {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
}

export interface DirectConversationSnapshot {
  partner: SocialProfileCard;
  threadId: string | null;
  messages: DirectMessageSnapshot[];
  source: SocialContentSource;
  resolution: SocialContentResolution;
}

export interface FriendsDashboardSnapshot {
  friends: FriendEntrySnapshot[];
  incomingRequests: FriendRequestSnapshot[];
  outgoingRequests: FriendRequestSnapshot[];
  suggestions: SocialProfileCard[];
  source: SocialContentSource;
  resolution: SocialContentResolution;
}

export interface SocialAlertSummary {
  incomingRequests: number;
  unreadMessages: number;
  connectedFriends: number;
  onlineFriends: number;
  source: SocialContentSource;
  resolution: SocialContentResolution;
}

type ProfileSearchRow = {
  id: string;
  username: string;
  avatar_id: StockAvatarId | null;
  rank: RankTier;
  elo: number;
  app_role: UserAppRole | null;
  facebook_handle: string | null;
  tiktok_handle: string | null;
};

type PresenceRow = {
  user_id: string;
  last_seen_at: string;
};

type FriendRequestRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  message: string | null;
  created_at: string;
};

type FriendshipRow = {
  friend_id: string;
  created_at: string;
  thread_id: string | null;
};

type DirectMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type DirectThreadMemberRow = {
  thread_id: string;
  last_read_at: string | null;
};

const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000;

function assertConfiguredSession(currentUserId?: string | null) {
  if (!supabase) {
    throw new Error(supabaseConfigErrorMessage);
  }
  if (!currentUserId || currentUserId === "guest-player") {
    throw new Error("Sign in to use friends, presence, and messaging.");
  }
}

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return false;
  }

  const timestamp = Date.parse(lastSeenAt);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= PRESENCE_TIMEOUT_MS;
}

function mapProfileCard(
  profile: Pick<
    ProfileSearchRow,
    | "id"
    | "username"
    | "avatar_id"
    | "rank"
    | "elo"
    | "app_role"
    | "facebook_handle"
    | "tiktok_handle"
  >,
  relationship: FriendshipState,
  lastSeenAt: string | null,
): SocialProfileCard {
  return {
    id: profile.id,
    username: profile.username,
    avatarId: profile.avatar_id ?? undefined,
    rank: profile.rank,
    elo: profile.elo,
    appRole: profile.app_role ?? null,
    socialLinks: {
      facebook: profile.facebook_handle ?? undefined,
      tiktok: profile.tiktok_handle ?? undefined,
    },
    isOnline: isOnline(lastSeenAt),
    lastSeenAt,
    friendshipState: relationship,
  };
}

function buildRelationshipMap(
  currentUserId: string,
  friendIds: string[],
  incomingIds: string[],
  outgoingIds: string[],
) {
  const friends = new Set(friendIds);
  const incoming = new Set(incomingIds);
  const outgoing = new Set(outgoingIds);
  return (profileId: string): FriendshipState => {
    if (profileId === currentUserId) return "friend";
    if (friends.has(profileId)) return "friend";
    if (incoming.has(profileId)) return "incoming_request";
    if (outgoing.has(profileId)) return "outgoing_request";
    return "none";
  };
}

async function loadProfilesByIds(profileIds: string[]) {
  if (!supabase || profileIds.length === 0) {
    return [] as ProfileSearchRow[];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, avatar_id, rank, elo, app_role, facebook_handle, tiktok_handle",
    )
    .in("id", profileIds);

  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return [] as ProfileSearchRow[];
    }
    throw error;
  }

  return (data ?? []) as ProfileSearchRow[];
}

async function loadPresenceMap(profileIds: string[]) {
  if (!supabase || profileIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from("user_presence")
    .select("user_id, last_seen_at")
    .in("user_id", profileIds);

  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return new Map<string, string>();
    }
    throw error;
  }

  return new Map(
    ((data ?? []) as PresenceRow[]).map((entry) => [
      entry.user_id,
      entry.last_seen_at,
    ]),
  );
}

async function loadRelationshipState(currentUserId: string) {
  assertConfiguredSession(currentUserId);

  const [
    { data: friendshipRows, error: friendshipError },
    { data: requestRows, error: requestError },
  ] = await Promise.all([
    supabase!
      .from("friendships")
      .select("friend_id, created_at, thread_id")
      .eq("user_id", currentUserId),
    supabase!
      .from("friend_requests")
      .select("id, sender_id, receiver_id, status, message, created_at")
      .eq("status", "pending")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`),
  ]);

  if (friendshipError) {
    if (isSupabaseSchemaSetupIssue(friendshipError)) {
      return null;
    }
    throw friendshipError;
  }

  if (requestError) {
    if (isSupabaseSchemaSetupIssue(requestError)) {
      return null;
    }
    throw requestError;
  }

  return {
    friendships: (friendshipRows ?? []) as FriendshipRow[],
    requests: (requestRows ?? []) as FriendRequestRow[],
  };
}

export async function touchOwnPresence(currentUserId?: string | null) {
  if (!supabase || !currentUserId || currentUserId === "guest-player") {
    return;
  }

  const { error } = await supabase
    .from("user_presence")
    .upsert(
      { user_id: currentUserId, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error && !isSupabaseSchemaSetupIssue(error)) {
    throw error;
  }
}

export async function loadFriendsDashboard(
  currentUser?: Pick<UserProfile, "id" | "isGuest" | "friends"> | null,
): Promise<FriendsDashboardSnapshot> {
  if (
    !currentUser ||
    currentUser.isGuest ||
    currentUser.id === "guest-player"
  ) {
    return {
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      suggestions: [],
      source: "supabase",
      resolution: "empty",
    };
  }

  if (!supabase) {
    return {
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      suggestions: [],
      source: "supabase",
      resolution: "unavailable",
    };
  }

  const relationships = await loadRelationshipState(currentUser.id);
  if (!relationships) {
    return {
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      suggestions: [],
      source: "supabase",
      resolution: "unavailable",
    };
  }

  const friendIds = relationships.friendships.map((entry) => entry.friend_id);
  const incoming = relationships.requests.filter(
    (entry) => entry.receiver_id === currentUser.id,
  );
  const outgoing = relationships.requests.filter(
    (entry) => entry.sender_id === currentUser.id,
  );
  const relatedIds = [
    ...new Set(
      friendIds.concat(
        incoming.map((entry) => entry.sender_id),
        outgoing.map((entry) => entry.receiver_id),
      ),
    ),
  ];

  const [profiles, presenceMap, suggestionRows] = await Promise.all([
    loadProfilesByIds(relatedIds),
    loadPresenceMap(relatedIds),
    supabase
      .from("profiles")
      .select(
        "id, username, avatar_id, rank, elo, app_role, facebook_handle, tiktok_handle",
      )
      .neq("id", currentUser.id)
      .order("elo", { ascending: false })
      .limit(18),
  ]);

  if (
    suggestionRows.error &&
    !isSupabaseSchemaSetupIssue(suggestionRows.error)
  ) {
    throw suggestionRows.error;
  }

  const relationshipFor = buildRelationshipMap(
    currentUser.id,
    friendIds,
    incoming.map((entry) => entry.sender_id),
    outgoing.map((entry) => entry.receiver_id),
  );
  const profileMap = new Map(profiles.map((entry) => [entry.id, entry]));

  const friends = relationships.friendships
    .map((entry) => {
      const profile = profileMap.get(entry.friend_id);
      return profile
        ? {
            profile: mapProfileCard(
              profile,
              "friend",
              presenceMap.get(profile.id) ?? null,
            ),
            since: entry.created_at,
            threadId: entry.thread_id,
          }
        : null;
    })
    .filter((entry): entry is FriendEntrySnapshot => Boolean(entry))
    .sort(
      (left, right) =>
        Number(right.profile.isOnline) - Number(left.profile.isOnline) ||
        right.profile.elo - left.profile.elo,
    );

  const incomingRequests = incoming
    .map((entry) => {
      const profile = profileMap.get(entry.sender_id);
      return profile
        ? {
            id: entry.id,
            direction: "incoming" as const,
            message: entry.message ?? undefined,
            createdAt: entry.created_at,
            profile: mapProfileCard(
              profile,
              "incoming_request",
              presenceMap.get(profile.id) ?? null,
            ),
          }
        : null;
    })
    .filter((entry): entry is FriendRequestSnapshot => Boolean(entry));

  const outgoingRequests = outgoing
    .map((entry) => {
      const profile = profileMap.get(entry.receiver_id);
      return profile
        ? {
            id: entry.id,
            direction: "outgoing" as const,
            message: entry.message ?? undefined,
            createdAt: entry.created_at,
            profile: mapProfileCard(
              profile,
              "outgoing_request",
              presenceMap.get(profile.id) ?? null,
            ),
          }
        : null;
    })
    .filter((entry): entry is FriendRequestSnapshot => Boolean(entry));

  const suggestions = ((suggestionRows.data ?? []) as ProfileSearchRow[])
    .filter((entry) => relationshipFor(entry.id) === "none")
    .slice(0, 8)
    .map((entry) => mapProfileCard(entry, "none", null));

  const hasData =
    friends.length > 0 ||
    incomingRequests.length > 0 ||
    outgoingRequests.length > 0 ||
    suggestions.length > 0;
  return {
    friends,
    incomingRequests,
    outgoingRequests,
    suggestions,
    source: "supabase",
    resolution: hasData ? "live" : "empty",
  };
}

export async function searchSocialProfiles(
  currentUser?: Pick<UserProfile, "id" | "isGuest"> | null,
  query = "",
) {
  const trimmed = query.trim();
  if (
    !currentUser ||
    currentUser.isGuest ||
    currentUser.id === "guest-player" ||
    !supabase
  ) {
    return [] as SocialProfileCard[];
  }

  const relationships = await loadRelationshipState(currentUser.id);
  if (!relationships) {
    return [] as SocialProfileCard[];
  }

  let request = supabase
    .from("profiles")
    .select(
      "id, username, avatar_id, rank, elo, app_role, facebook_handle, tiktok_handle",
    )
    .neq("id", currentUser.id)
    .order("elo", { ascending: false })
    .limit(12);

  if (trimmed) {
    request = request.ilike("username", `%${trimmed}%`);
  }

  const { data, error } = await request;
  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return [] as SocialProfileCard[];
    }
    throw error;
  }

  const rows = (data ?? []) as ProfileSearchRow[];
  const presenceMap = await loadPresenceMap(rows.map((entry) => entry.id));
  const relationshipFor = buildRelationshipMap(
    currentUser.id,
    relationships.friendships.map((entry) => entry.friend_id),
    relationships.requests
      .filter((entry) => entry.receiver_id === currentUser.id)
      .map((entry) => entry.sender_id),
    relationships.requests
      .filter((entry) => entry.sender_id === currentUser.id)
      .map((entry) => entry.receiver_id),
  );

  return rows.map((entry) =>
    mapProfileCard(
      entry,
      relationshipFor(entry.id),
      presenceMap.get(entry.id) ?? null,
    ),
  );
}

async function loadUnreadMessageCount(currentUserId: string) {
  assertConfiguredSession(currentUserId);

  const { data: memberRows, error: memberError } = await supabase!
    .from("direct_thread_members")
    .select("thread_id, last_read_at")
    .eq("user_id", currentUserId);

  if (memberError) {
    if (isSupabaseSchemaSetupIssue(memberError)) {
      return null;
    }
    throw memberError;
  }

  const members = (memberRows ?? []) as DirectThreadMemberRow[];
  if (members.length === 0) {
    return 0;
  }

  const lastReadByThread = new Map(
    members.map((entry) => [entry.thread_id, entry.last_read_at]),
  );

  const { data: messageRows, error: messageError } = await supabase!
    .from("direct_messages")
    .select("id, thread_id, sender_id, body, created_at")
    .in(
      "thread_id",
      members.map((entry) => entry.thread_id),
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (messageError) {
    if (isSupabaseSchemaSetupIssue(messageError)) {
      return null;
    }
    throw messageError;
  }

  return ((messageRows ?? []) as DirectMessageRow[]).filter((entry) => {
    if (entry.sender_id === currentUserId) {
      return false;
    }

    const lastReadAt = lastReadByThread.get(entry.thread_id) ?? null;
    if (!lastReadAt) {
      return true;
    }

    return entry.created_at > lastReadAt;
  }).length;
}

export async function loadSocialAlertSummary(
  currentUser?: Pick<UserProfile, "id" | "isGuest"> | null,
): Promise<SocialAlertSummary> {
  if (
    !currentUser ||
    currentUser.isGuest ||
    currentUser.id === "guest-player" ||
    !supabase
  ) {
    return {
      incomingRequests: 0,
      unreadMessages: 0,
      connectedFriends: 0,
      onlineFriends: 0,
      source: "supabase",
      resolution: !supabase ? "unavailable" : "empty",
    };
  }

  const dashboard = await loadFriendsDashboard(currentUser);
  const unreadMessages = await loadUnreadMessageCount(currentUser.id);

  return {
    incomingRequests: dashboard.incomingRequests.length,
    unreadMessages: unreadMessages ?? 0,
    connectedFriends: dashboard.friends.length,
    onlineFriends: dashboard.friends.filter((entry) => entry.profile.isOnline)
      .length,
    source: "supabase",
    resolution:
      dashboard.resolution === "unavailable" || unreadMessages === null
        ? "unavailable"
        : dashboard.friends.length > 0 ||
            dashboard.incomingRequests.length > 0 ||
            (unreadMessages ?? 0) > 0
          ? "live"
          : "empty",
  };
}
export async function sendFriendRequest(
  currentUserId: string,
  receiverId: string,
  message?: string,
) {
  assertConfiguredSession(currentUserId);
  const { error } = await supabase!.from("friend_requests").insert({
    sender_id: currentUserId,
    receiver_id: receiverId,
    message: message?.trim() || null,
  });

  if (error) {
    throw new Error(
      isSupabaseSchemaSetupIssue(error)
        ? "Friends are not available until the social migrations are pushed."
        : error.message,
    );
  }
}

export async function acceptFriendRequest(requestId: string) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    throw new Error(
      isSupabaseSchemaSetupIssue(error)
        ? "Friends are not available until the social migrations are pushed."
        : error.message,
    );
  }
}

export async function declineFriendRequest(requestId: string) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined" })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    throw new Error(
      isSupabaseSchemaSetupIssue(error)
        ? "Friends are not available until the social migrations are pushed."
        : error.message,
    );
  }
}

export async function cancelFriendRequest(requestId: string) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) {
    throw new Error(
      isSupabaseSchemaSetupIssue(error)
        ? "Friends are not available until the social migrations are pushed."
        : error.message,
    );
  }
}

export async function removeFriend(friendId: string) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.rpc("remove_friend", {
    p_friend_id: friendId,
  });
  if (error) {
    throw new Error(
      isSupabaseSchemaSetupIssue(error)
        ? "Friends are not available until the social migrations are pushed."
        : error.message,
    );
  }
}

async function ensureThread(currentUserId: string, partnerId: string) {
  assertConfiguredSession(currentUserId);
  const { data, error } = await supabase!.rpc("ensure_direct_thread", {
    p_user_a: currentUserId,
    p_user_b: partnerId,
  });

  if (error) {
    throw new Error(
      isSupabaseSchemaSetupIssue(error)
        ? "Messaging is not available until the social migrations are pushed."
        : error.message,
    );
  }

  return String(data);
}

export async function loadDirectConversation(
  currentUser?: Pick<UserProfile, "id" | "isGuest" | "friends"> | null,
  partnerId?: string | null,
): Promise<DirectConversationSnapshot | null> {
  if (!partnerId) {
    return null;
  }

  if (
    !supabase ||
    !currentUser ||
    currentUser.isGuest ||
    currentUser.id === "guest-player"
  ) {
    return null;
  }

  const [profiles, presenceMap, relationships] = await Promise.all([
    loadProfilesByIds([partnerId]),
    loadPresenceMap([partnerId]),
    loadRelationshipState(currentUser.id),
  ]);

  const partner = profiles[0] ?? null;
  if (!partner || !relationships) {
    return null;
  }

  const friendship =
    relationships.friendships.find((entry) => entry.friend_id === partnerId) ??
    null;
  const relationshipFor = buildRelationshipMap(
    currentUser.id,
    relationships.friendships.map((entry) => entry.friend_id),
    relationships.requests
      .filter((entry) => entry.receiver_id === currentUser.id)
      .map((entry) => entry.sender_id),
    relationships.requests
      .filter((entry) => entry.sender_id === currentUser.id)
      .map((entry) => entry.receiver_id),
  );

  const partnerCard = mapProfileCard(
    partner,
    relationshipFor(partner.id),
    presenceMap.get(partner.id) ?? null,
  );
  if (!friendship) {
    return {
      partner: partnerCard,
      threadId: null,
      messages: [],
      source: "supabase",
      resolution: "empty",
    };
  }

  const threadId =
    friendship.thread_id ?? (await ensureThread(currentUser.id, partnerId));
  const { data, error } = await supabase!
    .from("direct_messages")
    .select("id, thread_id, sender_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    throw new Error(
      isSupabaseSchemaSetupIssue(error)
        ? "Messaging is not available until the social migrations are pushed."
        : error.message,
    );
  }

  const messages = ((data ?? []) as DirectMessageRow[]).map((entry) => ({
    id: entry.id,
    senderId: entry.sender_id,
    body: entry.body,
    createdAt: entry.created_at,
    isOwn: entry.sender_id === currentUser.id,
  }));

  const { error: readError } = await supabase!
    .from("direct_thread_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", currentUser.id);

  if (readError && !isSupabaseSchemaSetupIssue(readError)) {
    throw readError;
  }

  return {
    partner: partnerCard,
    threadId,
    messages,
    source: "supabase",
    resolution: messages.length > 0 ? "live" : "empty",
  };
}

export async function sendDirectMessage(
  currentUserId: string,
  partnerId: string,
  body: string,
) {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Enter a message before sending.");
  }

  const threadId = await ensureThread(currentUserId, partnerId);
  const { error } = await supabase!.from("direct_messages").insert({
    thread_id: threadId,
    sender_id: currentUserId,
    body: trimmed,
  });

  if (error) {
    throw new Error(
      isSupabaseSchemaSetupIssue(error)
        ? "Messaging is not available until the social migrations are pushed."
        : error.message,
    );
  }

  return threadId;
}


