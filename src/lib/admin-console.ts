import { supabase, supabaseConfigErrorMessage } from "@/lib/supabase-client";
import type { SupportTicketPriority, SupportTicketStatus, UserAppRole } from "@/lib/types";

export interface AdminDashboardMetrics {
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
}

export interface AdminProductSummary {
  id: string;
  kind: string;
  name: string;
}

export interface AdminUserRecord {
  id: string;
  email: string | null;
  username: string;
  appRole: UserAppRole | null;
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
}

export interface AdminSupportTicket {
  id: string;
  reporterUserId: string;
  reporterUsername: string;
  reporterEmail: string | null;
  category: "bug" | "complaint" | "support" | "feedback";
  subject: string;
  body: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  adminNotes: string | null;
  assignedTo: string | null;
  assignedToUsername: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AdminDashboardSnapshot {
  metrics: AdminDashboardMetrics;
  products: AdminProductSummary[];
  recentUsers: AdminUserRecord[];
  recentTickets: AdminSupportTicket[];
}

export interface AdminUserUpdateInput {
  userId: string;
  username?: string;
  appRole?: UserAppRole | null;
  vipAccess?: boolean;
  hasSeasonPass?: boolean;
  isVip?: boolean;
  vipExpiresAt?: string | null;
  coins?: number;
  gems?: number;
  puzzleShards?: number;
  rankPoints?: number;
  passXp?: number;
  hintBalance?: number;
}

export interface AdminTicketUpdateInput {
  ticketId: string;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  adminNotes?: string | null;
  assignedTo?: string | null;
}

async function invoke<T>(body: Record<string, unknown>) {
  if (!supabase) {
    throw new Error(supabaseConfigErrorMessage);
  }

  const { data, error } = await supabase.functions.invoke("owner-admin-console", { body });
  if (error) {
    throw new Error(error.message);
  }

  return data as T;
}

export function loadAdminDashboard() {
  return invoke<AdminDashboardSnapshot>({ action: "dashboard" });
}

export function searchAdminUsers(query = "", limit = 20) {
  return invoke<{ users: AdminUserRecord[] }>({ action: "search_users", query, limit });
}

export function updateAdminUser(input: AdminUserUpdateInput) {
  return invoke<{ user: AdminUserRecord }>({ action: "update_user", ...input });
}

export function grantAdminProduct(userId: string, productId: string) {
  return invoke<{ ok: boolean }>({ action: "grant_product", userId, productId });
}

export function loadAdminTickets(status: SupportTicketStatus | "all" = "open", limit = 40) {
  return invoke<{ tickets: AdminSupportTicket[] }>({ action: "list_tickets", status, limit });
}

export function updateAdminTicket(input: AdminTicketUpdateInput) {
  return invoke<{ ticket: AdminSupportTicket }>({ action: "update_ticket", ...input });
}
