import {
  isSupabaseSchemaSetupIssue,
  supabase,
  supabaseConfigErrorMessage,
} from "@/lib/supabase-client";
import type { SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@/lib/types";

export interface SupportClientContext {
  route: string;
  referrer: string | null;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  locale: string | null;
  online: boolean;
}

export interface SupportTicketRecord {
  id: string;
  category: SupportTicketCategory;
  subject: string;
  body: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  clientContext: SupportClientContext | null;
}

type SupportTicketRow = {
  id: string;
  category: SupportTicketCategory;
  subject: string;
  body: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  client_context: SupportClientContext | null;
};

function assertSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigErrorMessage);
  }
}

function mapTicket(row: SupportTicketRow): SupportTicketRecord {
  return {
    id: row.id,
    category: row.category,
    subject: row.subject,
    body: row.body,
    status: row.status,
    priority: row.priority,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    clientContext: row.client_context,
  };
}

export function buildSupportClientContext(): SupportClientContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  return {
    route: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
    userAgent: window.navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
    },
    locale: window.navigator.language || null,
    online: window.navigator.onLine,
  };
}

export async function loadOwnSupportTickets(currentUserId: string) {
  assertSupabase();
  const { data, error } = await supabase!
    .from("support_tickets")
    .select("id, category, subject, body, status, priority, admin_notes, created_at, updated_at, resolved_at, client_context")
    .eq("reporter_user_id", currentUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(isSupabaseSchemaSetupIssue(error) ? "Support tickets are not available until the latest migrations are pushed." : error.message);
  }

  return ((data ?? []) as SupportTicketRow[]).map(mapTicket);
}

export async function submitSupportTicket(input: {
  reporterUserId: string;
  category: SupportTicketCategory;
  subject: string;
  body: string;
  clientContext?: SupportClientContext | null;
}) {
  assertSupabase();

  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length < 3) {
    throw new Error("Add a short subject so the issue is easy to triage.");
  }
  if (body.length < 10) {
    throw new Error("Add a little more detail so we can reproduce the issue.");
  }

  const { data, error } = await supabase!
    .from("support_tickets")
    .insert({
      reporter_user_id: input.reporterUserId,
      category: input.category,
      subject,
      body,
      client_context: input.clientContext ?? buildSupportClientContext(),
    })
    .select("id, category, subject, body, status, priority, admin_notes, created_at, updated_at, resolved_at, client_context")
    .single();

  if (error) {
    throw new Error(isSupabaseSchemaSetupIssue(error) ? "Support tickets are not available until the latest migrations are pushed." : error.message);
  }

  return mapTicket(data as SupportTicketRow);
}
