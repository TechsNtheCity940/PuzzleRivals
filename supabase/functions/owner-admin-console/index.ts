import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { applyProductGrant, getActiveProduct } from "../_shared/store.ts";
import { requireOwner } from "../_shared/owner.ts";

type ProductSummary = {
  id: string;
  kind: string;
  name: string;
};

type AdminDashboardMetrics = {
  totalUsers: number;
  signupsToday: number;
  signups7d: number;
  signups30d: number;
  capturedPurchases: number;
  totalSalesUsd: number;
  seasonPassUsers: number;
  paidVipUsers: number;
  vipAccessUsers: number;
  blockedUsers: number;
  openTickets: number;
};

type AdminDashboardMonitoring = {
  paypalMode: "live" | "sandbox";
  paypalConfigured: boolean;
  paypalWebhookConfigured: boolean;
  activeProductCount: number;
};

type AdminBroadcastRecord = {
  slot: "home_top";
  title: string;
  message: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
  updatedAt: string;
};

type AdminSignupTrendPoint = {
  date: string;
  count: number;
};

type AdminUserRecord = {
  id: string;
  email: string | null;
  username: string;
  appRole: "player" | "admin" | "owner" | null;
  vipAccess: boolean;
  hasSeasonPass: boolean;
  isVip: boolean;
  vipExpiresAt: string | null;
  isBlocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  coins: number;
  gems: number;
  puzzleShards: number;
  rankPoints: number;
  passXp: number;
  hintBalance: number;
  avatarId: string | null;
  rank: string | null;
  elo: number;
  createdAt: string;
};

type SupportTicketRecord = {
  id: string;
  reporterUserId: string;
  reporterUsername: string;
  reporterEmail: string | null;
  category: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  adminNotes: string | null;
  assignedTo: string | null;
  assignedToUsername: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  clientContext: Record<string, unknown> | null;
};

type AdminAuditEntry = {
  id: string;
  action: string;
  actorUserId: string;
  actorUsername: string | null;
  targetUserId: string | null;
  targetUsername: string | null;
  targetTicketId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type AdminWebhookEntry = {
  id: string;
  paypalEventId: string;
  eventType: string;
  orderId: string | null;
  summary: string | null;
  resourceStatus: string | null;
  receivedAt: string;
  processedAt: string | null;
};

type AdminArenaRunEntry = {
  id: string;
  userId: string;
  username: string;
  mode: string;
  status: "complete" | "failed";
  objectiveTitle: string;
  score: number;
  maxCombo: number;
  matchedTiles: number;
  movesLeft: number;
  durationMs: number;
  createdAt: string;
  suspicionLabel: "clean" | "review" | "high";
  suspicionReason: string | null;
};

type ProfileRow = {
  id: string;
  username: string;
  app_role: "player" | "admin" | "owner" | null;
  vip_access: boolean;
  has_season_pass: boolean;
  is_vip: boolean;
  vip_expires_at: string | null;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  blocked_by: string | null;
  coins: number;
  gems: number;
  puzzle_shards: number;
  rank_points: number;
  pass_xp: number;
  hint_balance: number;
  avatar_id: string | null;
  rank: string | null;
  elo: number;
  created_at: string;
};

type PurchaseRow = {
  amount: number | null;
  currency: string | null;
  status: string | null;
};

type TicketRow = {
  id: string;
  reporter_user_id: string;
  category: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  admin_notes: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  client_context: Record<string, unknown> | null;
};

type AuditRow = {
  id: string;
  action: string;
  actor_user_id: string;
  target_user_id: string | null;
  target_ticket_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type WebhookRow = {
  id: string;
  paypal_event_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  received_at: string;
  processed_at: string | null;
};

type RunRow = {
  id: string;
  user_id: string;
  mode: string;
  status: "complete" | "failed";
  objective_title: string;
  score: number;
  max_combo: number;
  matched_tiles: number;
  moves_left: number;
  target_score: number;
  objective_target: number;
  duration_ms: number;
  created_at: string;
};

type SiteBroadcastRow = {
  slot: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_href: string | null;
  is_active: boolean;
  updated_at: string;
};

const VALID_APP_ROLES = new Set(["player", "admin", "owner"]);
const VALID_TICKET_STATUSES = new Set(["open", "reviewing", "resolved", "dismissed"]);
const VALID_TICKET_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const PROFILE_SELECT = "id, username, app_role, vip_access, has_season_pass, is_vip, vip_expires_at, is_blocked, blocked_at, blocked_reason, blocked_by, coins, gems, puzzle_shards, rank_points, pass_xp, hint_balance, avatar_id, rank, elo, created_at";
const TICKET_SELECT = "id, reporter_user_id, category, subject, body, status, priority, admin_notes, assigned_to, created_at, updated_at, resolved_at, client_context";
const AUDIT_SELECT = "id, action, actor_user_id, target_user_id, target_ticket_id, metadata, created_at";
const WEBHOOK_SELECT = "id, paypal_event_id, event_type, payload, received_at, processed_at";
const RUN_SELECT = "id, user_id, mode, status, objective_title, score, max_combo, matched_tiles, moves_left, target_score, objective_target, duration_ms, created_at";

function toErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
  if (message === "Unauthorized." || message === "Owner access required.") {
    return 403;
  }
  return 400;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "404" ||
    (error.message ?? "").toLowerCase().includes("does not exist") ||
    (error.message ?? "").toLowerCase().includes("not found")
  );
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeQuery(query: unknown) {
  return asString(query).trim().toLowerCase();
}

function readProductName(metadata: Record<string, unknown> | null) {
  if (metadata && typeof metadata.name === "string" && metadata.name.trim()) {
    return metadata.name;
  }
  return "Unnamed product";
}

function parseWebhookOrderId(payload: Record<string, unknown> | null) {
  const resource = payload?.resource as Record<string, unknown> | undefined;
  const supplementary = resource?.supplementary_data as Record<string, unknown> | undefined;
  const relatedIds = supplementary?.related_ids as Record<string, unknown> | undefined;
  const resourceId = typeof resource?.id === "string" ? resource.id : null;
  const orderId = typeof relatedIds?.order_id === "string" ? relatedIds.order_id : null;
  return orderId ?? resourceId;
}

function parseWebhookResourceStatus(payload: Record<string, unknown> | null) {
  const resource = payload?.resource as Record<string, unknown> | undefined;
  return typeof resource?.status === "string" ? resource.status : null;
}

function parseWebhookSummary(payload: Record<string, unknown> | null) {
  return typeof payload?.summary === "string" ? payload.summary : null;
}

function assessRunSuspicion(run: RunRow) {
  const reasons: string[] = [];

  if (run.status === "complete" && run.duration_ms > 0 && run.duration_ms < 7000) {
    reasons.push("completed in under 7 seconds");
  }

  if (run.max_combo >= 18) {
    reasons.push(`max combo ${run.max_combo}`);
  }

  if (run.target_score > 0 && run.score > run.target_score * 4) {
    reasons.push(`score ${run.score} exceeds target by 4x+`);
  }

  if (run.objective_target > 0 && run.matched_tiles > run.objective_target * 5) {
    reasons.push("matched tiles far exceed the objective target");
  }

  if (reasons.length >= 2) {
    return { suspicionLabel: "high" as const, suspicionReason: reasons.join(" | ") };
  }

  if (reasons.length === 1) {
    return { suspicionLabel: "review" as const, suspicionReason: reasons[0] };
  }

  return { suspicionLabel: "clean" as const, suspicionReason: null };
}

async function listAllAuthUsers(admin: SupabaseClient, maxUsers = 2000) {
  const users: Array<{ id: string; email: string | null }> = [];
  let page = 1;

  while (users.length < maxUsers) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw error;
    }

    for (const user of data.users) {
      users.push({ id: user.id, email: user.email ?? null });
      if (users.length >= maxUsers) {
        break;
      }
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  return users;
}

async function loadProfileNameMap(admin: SupabaseClient, ids: string[]) {
  if (ids.length === 0) {
    return new Map<string, { username: string }>();
  }

  const { data, error } = await admin.from("profiles").select("id, username").in("id", ids);
  if (error) {
    throw error;
  }

  return new Map(((data ?? []) as Array<{ id: string; username: string }>).map((entry) => [entry.id, { username: entry.username }]));
}

function mapBroadcast(row: SiteBroadcastRow | null): AdminBroadcastRecord | null {
  if (!row) {
    return null;
  }

  return {
    slot: "home_top",
    title: row.title,
    message: row.message,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

function buildSignupTrend(rows: Array<{ created_at: string }>, days = 14) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.created_at.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const points: AdminSignupTrendPoint[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    const key = date.toISOString().slice(0, 10);
    points.push({ date: key, count: counts.get(key) ?? 0 });
  }

  return points;
}

function mapUserRecord(profile: ProfileRow, email: string | null): AdminUserRecord {
  return {
    id: profile.id,
    email,
    username: profile.username,
    appRole: profile.app_role,
    vipAccess: Boolean(profile.vip_access),
    hasSeasonPass: Boolean(profile.has_season_pass),
    isVip: Boolean(profile.is_vip),
    vipExpiresAt: profile.vip_expires_at,
    isBlocked: Boolean(profile.is_blocked),
    blockedAt: profile.blocked_at,
    blockedReason: profile.blocked_reason,
    coins: profile.coins,
    gems: profile.gems,
    puzzleShards: profile.puzzle_shards,
    rankPoints: profile.rank_points,
    passXp: profile.pass_xp,
    hintBalance: profile.hint_balance,
    avatarId: profile.avatar_id,
    rank: profile.rank,
    elo: profile.elo,
    createdAt: profile.created_at,
  };
}

async function mapTickets(admin: SupabaseClient, tickets: TicketRow[], authUserMap?: Map<string, string | null>) {
  const relatedUserIds = Array.from(
    new Set(
      tickets.flatMap((ticket) => [ticket.reporter_user_id, ticket.assigned_to].filter(Boolean) as string[]),
    ),
  );

  const profileMap = await loadProfileNameMap(admin, relatedUserIds);

  let effectiveAuthUserMap = authUserMap;
  if (!effectiveAuthUserMap) {
    const authUsers = await listAllAuthUsers(admin);
    effectiveAuthUserMap = new Map(authUsers.map((entry) => [entry.id, entry.email]));
  }

  return tickets.map((ticket) => ({
    id: ticket.id,
    reporterUserId: ticket.reporter_user_id,
    reporterUsername: profileMap.get(ticket.reporter_user_id)?.username ?? "Unknown reporter",
    reporterEmail: effectiveAuthUserMap.get(ticket.reporter_user_id) ?? null,
    category: ticket.category,
    subject: ticket.subject,
    body: ticket.body,
    status: ticket.status,
    priority: ticket.priority,
    adminNotes: ticket.admin_notes,
    assignedTo: ticket.assigned_to,
    assignedToUsername: ticket.assigned_to ? (profileMap.get(ticket.assigned_to)?.username ?? null) : null,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    resolvedAt: ticket.resolved_at,
    clientContext: ticket.client_context ?? null,
  })) satisfies SupportTicketRecord[];
}

async function mapAudits(admin: SupabaseClient, audits: AuditRow[]) {
  const profileIds = Array.from(
    new Set(audits.flatMap((audit) => [audit.actor_user_id, audit.target_user_id].filter(Boolean) as string[])),
  );
  const profileMap = await loadProfileNameMap(admin, profileIds);

  return audits.map((audit) => ({
    id: audit.id,
    action: audit.action,
    actorUserId: audit.actor_user_id,
    actorUsername: profileMap.get(audit.actor_user_id)?.username ?? null,
    targetUserId: audit.target_user_id,
    targetUsername: audit.target_user_id ? (profileMap.get(audit.target_user_id)?.username ?? null) : null,
    targetTicketId: audit.target_ticket_id,
    metadata: audit.metadata ?? {},
    createdAt: audit.created_at,
  })) satisfies AdminAuditEntry[];
}

function mapWebhooks(rows: WebhookRow[]) {
  return rows.map((entry) => ({
    id: entry.id,
    paypalEventId: entry.paypal_event_id,
    eventType: entry.event_type,
    orderId: parseWebhookOrderId(entry.payload),
    summary: parseWebhookSummary(entry.payload),
    resourceStatus: parseWebhookResourceStatus(entry.payload),
    receivedAt: entry.received_at,
    processedAt: entry.processed_at,
  })) satisfies AdminWebhookEntry[];
}

async function mapRuns(admin: SupabaseClient, rows: RunRow[]) {
  const profileMap = await loadProfileNameMap(admin, Array.from(new Set(rows.map((entry) => entry.user_id))));
  return rows.map((entry) => {
    const suspicion = assessRunSuspicion(entry);
    return {
      id: entry.id,
      userId: entry.user_id,
      username: profileMap.get(entry.user_id)?.username ?? "Unknown rival",
      mode: entry.mode,
      status: entry.status,
      objectiveTitle: entry.objective_title,
      score: entry.score,
      maxCombo: entry.max_combo,
      matchedTiles: entry.matched_tiles,
      movesLeft: entry.moves_left,
      durationMs: entry.duration_ms,
      createdAt: entry.created_at,
      suspicionLabel: suspicion.suspicionLabel,
      suspicionReason: suspicion.suspicionReason,
    };
  }) satisfies AdminArenaRunEntry[];
}

async function writeAuditLog(
  admin: SupabaseClient,
  input: {
    actorUserId: string;
    action: string;
    targetUserId?: string | null;
    targetTicketId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("owner_admin_audit_log").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_user_id: input.targetUserId ?? null,
    target_ticket_id: input.targetTicketId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw error;
  }
}

async function loadDashboard(admin: SupabaseClient) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsersResult,
    signupsTodayResult,
    signups7dResult,
    signups30dResult,
    seasonPassUsersResult,
    paidVipUsersResult,
    vipAccessUsersResult,
    blockedUsersResult,
    openTicketsResult,
    purchasesResult,
    productsResult,
    recentUsersResult,
    recentTicketsResult,
    recentAuditsResult,
    recentWebhooksResult,
    recentRunsResult,
    signupTrendRowsResult,
    broadcastResult,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", last24h),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", last7d),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", last30d),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("has_season_pass", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_vip", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("vip_access", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_blocked", true),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    admin.from("purchases").select("amount, currency, status"),
    admin.from("products").select("id, kind, metadata").eq("active", true).order("id"),
    admin.from("profiles").select(PROFILE_SELECT).order("created_at", { ascending: false }).limit(8),
    admin.from("support_tickets").select(TICKET_SELECT).order("created_at", { ascending: false }).limit(8),
    admin.from("owner_admin_audit_log").select(AUDIT_SELECT).order("created_at", { ascending: false }).limit(10),
    admin.from("paypal_webhook_events").select(WEBHOOK_SELECT).order("received_at", { ascending: false }).limit(10),
    admin.from("neon_rivals_runs").select(RUN_SELECT).order("created_at", { ascending: false }).limit(12),
    admin.from("profiles").select("created_at").gte("created_at", last14d).order("created_at", { ascending: true }),
    admin.from("site_broadcasts").select("slot, title, message, cta_label, cta_href, is_active, updated_at").eq("slot", "home_top").maybeSingle(),
  ]);

  for (const result of [
    totalUsersResult,
    signupsTodayResult,
    signups7dResult,
    signups30dResult,
    seasonPassUsersResult,
    paidVipUsersResult,
    vipAccessUsersResult,
    blockedUsersResult,
    openTicketsResult,
    purchasesResult,
    productsResult,
    recentUsersResult,
    recentTicketsResult,
    recentAuditsResult,
    recentWebhooksResult,
    recentRunsResult,
    signupTrendRowsResult,
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  const purchaseRows = (purchasesResult.data ?? []) as PurchaseRow[];
  const capturedPurchases = purchaseRows.filter((entry) => entry.status === "captured");
  const totalSalesUsd = capturedPurchases
    .filter((entry) => entry.currency === "USD")
    .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);

  const products = ((productsResult.data ?? []) as Array<{ id: string; kind: string; metadata: Record<string, unknown> | null }>).map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    name: readProductName(entry.metadata),
  })) satisfies ProductSummary[];

  const authUsers = await listAllAuthUsers(admin);
  const authUserMap = new Map(authUsers.map((entry) => [entry.id, entry.email]));
  const paypalMode = (Deno.env.get("PAYPAL_ENV") ?? "live") === "live" ? "live" : "sandbox";
  const paypalConfigured = Boolean(Deno.env.get("PAYPAL_CLIENT_ID") && Deno.env.get("PAYPAL_CLIENT_SECRET"));
  const paypalWebhookConfigured = Boolean(Deno.env.get("PAYPAL_WEBHOOK_ID"));
  if (broadcastResult.error && !isMissingRelationError(broadcastResult.error)) {
    throw broadcastResult.error;
  }

  return {
    metrics: {
      totalUsers: totalUsersResult.count ?? 0,
      signupsToday: signupsTodayResult.count ?? 0,
      signups7d: signups7dResult.count ?? 0,
      signups30d: signups30dResult.count ?? 0,
      capturedPurchases: capturedPurchases.length,
      totalSalesUsd,
      seasonPassUsers: seasonPassUsersResult.count ?? 0,
      paidVipUsers: paidVipUsersResult.count ?? 0,
      vipAccessUsers: vipAccessUsersResult.count ?? 0,
      blockedUsers: blockedUsersResult.count ?? 0,
      openTickets: openTicketsResult.count ?? 0,
    } satisfies AdminDashboardMetrics,
    monitoring: {
      paypalMode,
      paypalConfigured,
      paypalWebhookConfigured,
      activeProductCount: products.length,
    } satisfies AdminDashboardMonitoring,
    broadcast: mapBroadcast((broadcastResult.data ?? null) as SiteBroadcastRow | null),
    signupTrend: buildSignupTrend((signupTrendRowsResult.data ?? []) as Array<{ created_at: string }>),
    products,
    recentUsers: ((recentUsersResult.data ?? []) as ProfileRow[]).map((profile) => mapUserRecord(profile, authUserMap.get(profile.id) ?? null)),
    recentTickets: await mapTickets(admin, (recentTicketsResult.data ?? []) as TicketRow[], authUserMap),
    recentAudits: await mapAudits(admin, (recentAuditsResult.data ?? []) as AuditRow[]),
    recentWebhooks: mapWebhooks((recentWebhooksResult.data ?? []) as WebhookRow[]),
    recentRuns: await mapRuns(admin, (recentRunsResult.data ?? []) as RunRow[]),
  };
}

async function searchUsers(admin: SupabaseClient, query: unknown, limitValue: unknown) {
  const normalizedQuery = normalizeQuery(query);
  const limit = Math.max(1, Math.min(50, Math.floor(asNumber(limitValue, 20))));
  const authUsers = await listAllAuthUsers(admin);
  const authUserMap = new Map(authUsers.map((entry) => [entry.id, entry.email]));

  if (!normalizedQuery) {
    const { data, error } = await admin
      .from("profiles")
      .select(PROFILE_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return {
      users: ((data ?? []) as ProfileRow[]).map((profile) => mapUserRecord(profile, authUserMap.get(profile.id) ?? null)),
    };
  }

  const matchingEmailIds = authUsers
    .filter((entry) => (entry.email ?? "").toLowerCase().includes(normalizedQuery))
    .map((entry) => entry.id);

  const [usernameProfilesResult, emailProfilesResult] = await Promise.all([
    admin
      .from("profiles")
      .select(PROFILE_SELECT)
      .ilike("username", `%${normalizedQuery}%`)
      .order("created_at", { ascending: false })
      .limit(limit),
    matchingEmailIds.length > 0
      ? admin.from("profiles").select(PROFILE_SELECT).in("id", matchingEmailIds.slice(0, limit))
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
  ]);

  if (usernameProfilesResult.error) {
    throw usernameProfilesResult.error;
  }
  if (emailProfilesResult.error) {
    throw emailProfilesResult.error;
  }

  const merged = new Map<string, ProfileRow>();
  for (const profile of ((usernameProfilesResult.data ?? []) as ProfileRow[]).concat((emailProfilesResult.data ?? []) as ProfileRow[])) {
    merged.set(profile.id, profile);
  }

  return {
    users: Array.from(merged.values())
      .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
      .slice(0, limit)
      .map((profile) => mapUserRecord(profile, authUserMap.get(profile.id) ?? null)),
  };
}

async function updateUser(admin: SupabaseClient, ownerUserId: string, payload: Record<string, unknown>) {
  const userId = asString(payload.userId).trim();
  if (!userId) {
    throw new Error("userId is required.");
  }

  const nextRole = payload.appRole == null ? null : asString(payload.appRole).trim();
  if (nextRole !== null && !VALID_APP_ROLES.has(nextRole)) {
    throw new Error("appRole must be player, admin, or owner.");
  }

  if (userId === ownerUserId && nextRole && nextRole !== "owner") {
    throw new Error("The owner account cannot remove its own owner access from this screen.");
  }

  if (userId === ownerUserId && payload.isBlocked === true) {
    throw new Error("The owner account cannot block itself.");
  }

  const updates: Record<string, unknown> = {};
  if (typeof payload.username === "string") {
    const username = payload.username.trim();
    if (username.length < 3) {
      throw new Error("Username must be at least 3 characters.");
    }
    updates.username = username;
  }
  if (nextRole !== null) updates.app_role = nextRole;
  if (typeof payload.vipAccess === "boolean") updates.vip_access = payload.vipAccess;
  if (typeof payload.hasSeasonPass === "boolean") updates.has_season_pass = payload.hasSeasonPass;
  if (typeof payload.isVip === "boolean") updates.is_vip = payload.isVip;
  if (payload.vipExpiresAt === null) updates.vip_expires_at = null;
  if (typeof payload.vipExpiresAt === "string" && payload.vipExpiresAt.trim()) {
    const parsed = new Date(payload.vipExpiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("vipExpiresAt must be a valid date.");
    }
    updates.vip_expires_at = parsed.toISOString();
  }
  if (typeof payload.isBlocked === "boolean") {
    updates.is_blocked = payload.isBlocked;
    updates.blocked_at = payload.isBlocked ? new Date().toISOString() : null;
    updates.blocked_by = payload.isBlocked ? ownerUserId : null;
    updates.blocked_reason = payload.isBlocked ? (asOptionalString(payload.blockedReason) ?? "Blocked by owner console") : null;
  } else if (payload.blockedReason !== undefined) {
    updates.blocked_reason = asOptionalString(payload.blockedReason);
  }
  if (typeof payload.coins === "number") updates.coins = Math.max(0, Math.floor(payload.coins));
  if (typeof payload.gems === "number") updates.gems = Math.max(0, Math.floor(payload.gems));
  if (typeof payload.puzzleShards === "number") updates.puzzle_shards = Math.max(0, Math.floor(payload.puzzleShards));
  if (typeof payload.rankPoints === "number") updates.rank_points = Math.max(0, Math.floor(payload.rankPoints));
  if (typeof payload.passXp === "number") updates.pass_xp = Math.max(0, Math.floor(payload.passXp));
  if (typeof payload.hintBalance === "number") updates.hint_balance = Math.max(0, Math.floor(payload.hintBalance));

  if (Object.keys(updates).length === 0) {
    throw new Error("No user updates were provided.");
  }

  if (updates.is_vip === false && !("vip_expires_at" in updates)) {
    updates.vip_expires_at = null;
  }

  const { error } = await admin.from("profiles").update(updates).eq("id", userId);
  if (error) {
    throw error;
  }

  await writeAuditLog(admin, {
    actorUserId: ownerUserId,
    action: "update_user",
    targetUserId: userId,
    metadata: updates,
  });

  const authUsers = await listAllAuthUsers(admin);
  const authUserMap = new Map(authUsers.map((entry) => [entry.id, entry.email]));
  const { data, error: reloadError } = await admin.from("profiles").select(PROFILE_SELECT).eq("id", userId).single();
  if (reloadError) {
    throw reloadError;
  }

  return {
    user: mapUserRecord(data as ProfileRow, authUserMap.get(userId) ?? null),
  };
}

async function updateBroadcast(admin: SupabaseClient, ownerUserId: string, payload: Record<string, unknown>) {
  const title = asString(payload.title).trim();
  const message = asString(payload.message).trim();
  const ctaLabel = asOptionalString(payload.ctaLabel);
  const ctaHref = asOptionalString(payload.ctaHref);

  if (!title) {
    throw new Error("Broadcast title is required.");
  }

  if (!message) {
    throw new Error("Broadcast message is required.");
  }

  const { data, error } = await admin
    .from("site_broadcasts")
    .upsert({
      slot: "home_top",
      title,
      message,
      cta_label: ctaLabel,
      cta_href: ctaHref,
      is_active: payload.isActive === true,
      updated_by: ownerUserId,
    }, { onConflict: "slot" })
    .select("slot, title, message, cta_label, cta_href, is_active, updated_at")
    .single();

  if (error) {
    throw error;
  }

  await writeAuditLog(admin, {
    actorUserId: ownerUserId,
    action: "update_broadcast",
    metadata: {
      slot: "home_top",
      title,
      message,
      ctaLabel,
      ctaHref,
      isActive: payload.isActive === true,
    },
  });

  return {
    broadcast: mapBroadcast(data as SiteBroadcastRow)!
  };
}

async function grantProduct(admin: SupabaseClient, ownerUserId: string, payload: Record<string, unknown>) {
  const userId = asString(payload.userId).trim();
  const productId = asString(payload.productId).trim();
  if (!userId || !productId) {
    throw new Error("userId and productId are required.");
  }

  const product = await getActiveProduct(admin, productId);
  await applyProductGrant(admin, userId, product, "owner_admin_grant");

  await writeAuditLog(admin, {
    actorUserId: ownerUserId,
    action: "grant_product",
    targetUserId: userId,
    metadata: { productId },
  });

  return { ok: true };
}

async function listTickets(admin: SupabaseClient, status: unknown, limitValue: unknown) {
  const limit = Math.max(1, Math.min(100, Math.floor(asNumber(limitValue, 40))));
  const statusFilter = asString(status).trim();

  let query = admin.from("support_tickets").select(TICKET_SELECT).order("created_at", { ascending: false }).limit(limit);
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return {
    tickets: await mapTickets(admin, (data ?? []) as TicketRow[]),
  };
}

async function updateTicket(admin: SupabaseClient, ownerUserId: string, payload: Record<string, unknown>) {
  const ticketId = asString(payload.ticketId).trim();
  if (!ticketId) {
    throw new Error("ticketId is required.");
  }

  const status = payload.status == null ? null : asString(payload.status).trim();
  const priority = payload.priority == null ? null : asString(payload.priority).trim();
  if (status !== null && !VALID_TICKET_STATUSES.has(status)) {
    throw new Error("Invalid ticket status.");
  }
  if (priority !== null && !VALID_TICKET_PRIORITIES.has(priority)) {
    throw new Error("Invalid ticket priority.");
  }

  const updates: Record<string, unknown> = {};
  if (status !== null) {
    updates.status = status;
    updates.resolved_at = status === "resolved" || status === "dismissed" ? new Date().toISOString() : null;
  }
  if (priority !== null) updates.priority = priority;
  if (payload.adminNotes !== undefined) updates.admin_notes = asOptionalString(payload.adminNotes);
  if (payload.assignedTo !== undefined) updates.assigned_to = asOptionalString(payload.assignedTo);

  if (Object.keys(updates).length === 0) {
    throw new Error("No ticket updates were provided.");
  }

  const { error } = await admin.from("support_tickets").update(updates).eq("id", ticketId);
  if (error) {
    throw error;
  }

  await writeAuditLog(admin, {
    actorUserId: ownerUserId,
    action: "update_ticket",
    targetTicketId: ticketId,
    metadata: updates,
  });

  const { data, error: reloadError } = await admin.from("support_tickets").select(TICKET_SELECT).eq("id", ticketId).single();
  if (reloadError) {
    throw reloadError;
  }

  return {
    ticket: (await mapTickets(admin, [data as TicketRow]))[0],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { admin, user } = await requireOwner(req);
    const body = await req.json().catch(() => ({}));
    const action = asString((body as Record<string, unknown>).action).trim();

    if (!action) {
      throw new Error("action is required.");
    }

    let result: unknown;
    switch (action) {
      case "dashboard":
        result = await loadDashboard(admin);
        break;
      case "search_users":
        result = await searchUsers(admin, (body as Record<string, unknown>).query, (body as Record<string, unknown>).limit);
        break;
      case "update_user":
        result = await updateUser(admin, user.id, body as Record<string, unknown>);
        break;
      case "grant_product":
        result = await grantProduct(admin, user.id, body as Record<string, unknown>);
        break;
      case "update_broadcast":
        result = await updateBroadcast(admin, user.id, body as Record<string, unknown>);
        break;
      case "list_tickets":
        result = await listTickets(admin, (body as Record<string, unknown>).status, (body as Record<string, unknown>).limit);
        break;
      case "update_ticket":
        result = await updateTicket(admin, user.id, body as Record<string, unknown>);
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Admin request failed." },
      { status: toErrorStatus(error), headers: corsHeaders },
    );
  }
});

