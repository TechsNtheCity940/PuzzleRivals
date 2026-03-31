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
  openTickets: number;
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
};

type ProfileRow = {
  id: string;
  username: string;
  app_role: "player" | "admin" | "owner" | null;
  vip_access: boolean;
  has_season_pass: boolean;
  is_vip: boolean;
  vip_expires_at: string | null;
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
};

const VALID_APP_ROLES = new Set(["player", "admin", "owner"]);
const VALID_TICKET_STATUSES = new Set(["open", "reviewing", "resolved", "dismissed"]);
const VALID_TICKET_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const PROFILE_SELECT = "id, username, app_role, vip_access, has_season_pass, is_vip, vip_expires_at, coins, gems, puzzle_shards, rank_points, pass_xp, hint_balance, avatar_id, rank, elo, created_at";
const TICKET_SELECT = "id, reporter_user_id, category, subject, body, status, priority, admin_notes, assigned_to, created_at, updated_at, resolved_at";

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

  let profileMap = new Map<string, { username: string }>();
  if (relatedUserIds.length > 0) {
    const { data, error } = await admin.from("profiles").select("id, username").in("id", relatedUserIds);
    if (error) {
      throw error;
    }
    profileMap = new Map(((data ?? []) as Array<{ id: string; username: string }>).map((entry) => [entry.id, { username: entry.username }]));
  }

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
  })) satisfies SupportTicketRecord[];
}

async function loadDashboard(admin: SupabaseClient) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsersResult,
    signupsTodayResult,
    signups7dResult,
    signups30dResult,
    seasonPassUsersResult,
    paidVipUsersResult,
    vipAccessUsersResult,
    openTicketsResult,
    purchasesResult,
    productsResult,
    recentUsersResult,
    recentTicketsResult,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", last24h),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", last7d),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", last30d),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("has_season_pass", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_vip", true),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("vip_access", true),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
    admin.from("purchases").select("amount, currency, status"),
    admin.from("products").select("id, kind, metadata").eq("active", true).order("id"),
    admin.from("profiles").select(PROFILE_SELECT).order("created_at", { ascending: false }).limit(8),
    admin.from("support_tickets").select(TICKET_SELECT).order("created_at", { ascending: false }).limit(8),
  ]);

  for (const result of [
    totalUsersResult,
    signupsTodayResult,
    signups7dResult,
    signups30dResult,
    seasonPassUsersResult,
    paidVipUsersResult,
    vipAccessUsersResult,
    openTicketsResult,
    purchasesResult,
    productsResult,
    recentUsersResult,
    recentTicketsResult,
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

  const authUsers = await listAllAuthUsers(admin);
  const authUserMap = new Map(authUsers.map((entry) => [entry.id, entry.email]));

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
      openTickets: openTicketsResult.count ?? 0,
    } satisfies AdminDashboardMetrics,
    products: ((productsResult.data ?? []) as Array<{ id: string; kind: string; metadata: Record<string, unknown> | null }>).map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      name: readProductName(entry.metadata),
    })) satisfies ProductSummary[],
    recentUsers: ((recentUsersResult.data ?? []) as ProfileRow[]).map((profile) => mapUserRecord(profile, authUserMap.get(profile.id) ?? null)),
    recentTickets: await mapTickets(admin, (recentTicketsResult.data ?? []) as TicketRow[], authUserMap),
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

async function grantProduct(admin: SupabaseClient, payload: Record<string, unknown>) {
  const userId = asString(payload.userId).trim();
  const productId = asString(payload.productId).trim();
  if (!userId || !productId) {
    throw new Error("userId and productId are required.");
  }

  const product = await getActiveProduct(admin, productId);
  await applyProductGrant(admin, userId, product, "owner_admin_grant");
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

async function updateTicket(admin: SupabaseClient, payload: Record<string, unknown>) {
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
        result = await grantProduct(admin, body as Record<string, unknown>);
        break;
      case "list_tickets":
        result = await listTickets(admin, (body as Record<string, unknown>).status, (body as Record<string, unknown>).limit);
        break;
      case "update_ticket":
        result = await updateTicket(admin, body as Record<string, unknown>);
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
