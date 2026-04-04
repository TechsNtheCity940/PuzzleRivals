import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Megaphone, RefreshCw, Search, Shield, ShoppingBag, TrendingUp } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/layout/PageHeader";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import {
  grantAdminProduct,
  loadAdminDashboard,
  loadAdminTickets,
  searchAdminUsers,
  updateAdminBroadcast,
  updateAdminTicket,
  updateAdminUser,
  type AdminDashboardSnapshot,
  type AdminSupportTicket,
  type AdminUserRecord,
} from "@/lib/admin-console";
import { OWNER_ACCOUNT_EMAIL, isOwnerUser } from "@/lib/dev-account";
import type { SupportTicketPriority, SupportTicketStatus, UserAppRole } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

type UserDraft = {
  username: string;
  appRole: UserAppRole;
  vipAccess: boolean;
  hasSeasonPass: boolean;
  isVip: boolean;
  vipExpiresAt: string;
  isBlocked: boolean;
  blockedReason: string;
  coins: string;
  gems: string;
  puzzleShards: string;
  rankPoints: string;
  passXp: string;
  hintBalance: string;
};

type TicketDraft = {
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  adminNotes: string;
};

type BroadcastDraft = {
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  isActive: boolean;
};

const ROLE_OPTIONS: UserAppRole[] = ["player", "admin", "owner"];
const TICKET_FILTERS: Array<SupportTicketStatus | "all"> = ["open", "reviewing", "resolved", "dismissed", "all"];
const TICKET_PRIORITIES: SupportTicketPriority[] = ["low", "normal", "high", "urgent"];
const TICKET_STATUSES: SupportTicketStatus[] = ["open", "reviewing", "resolved", "dismissed"];

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

function formatCompactDate(value: string | null) {
  if (!value) return "Not set";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString();
}

function toLocalDateTimeValue(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

function createUserDraft(user: AdminUserRecord): UserDraft {
  return {
    username: user.username,
    appRole: user.appRole ?? "player",
    vipAccess: user.vipAccess,
    hasSeasonPass: user.hasSeasonPass,
    isVip: user.isVip,
    vipExpiresAt: toLocalDateTimeValue(user.vipExpiresAt),
    isBlocked: user.isBlocked,
    blockedReason: user.blockedReason ?? "",
    coins: String(user.coins),
    gems: String(user.gems),
    puzzleShards: String(user.puzzleShards),
    rankPoints: String(user.rankPoints),
    passXp: String(user.passXp),
    hintBalance: String(user.hintBalance),
  };
}

function createTicketDraft(ticket: AdminSupportTicket): TicketDraft {
  return {
    status: ticket.status,
    priority: ticket.priority,
    adminNotes: ticket.adminNotes ?? "",
  };
}

function createBroadcastDraft(broadcast: AdminDashboardSnapshot["broadcast"] | null): BroadcastDraft {
  return {
    title: broadcast?.title ?? "Arena Broadcast",
    message: broadcast?.message ?? "",
    ctaLabel: broadcast?.ctaLabel ?? "",
    ctaHref: broadcast?.ctaHref ?? "",
    isActive: broadcast?.isActive ?? false,
  };
}

function formatTrendDate(value: string) {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function metricCards(snapshot: AdminDashboardSnapshot | null) {
  if (!snapshot) return [];
  return [
    { label: "Total Users", value: snapshot.metrics.totalUsers.toLocaleString() },
    { label: "New Today", value: snapshot.metrics.signupsToday.toLocaleString() },
    { label: "New 7 Days", value: snapshot.metrics.signups7d.toLocaleString() },
    { label: "New 30 Days", value: snapshot.metrics.signups30d.toLocaleString() },
    { label: "Sales USD", value: `$${snapshot.metrics.totalSalesUsd.toFixed(2)}` },
    { label: "Captured Orders", value: snapshot.metrics.capturedPurchases.toLocaleString() },
    { label: "Season Pass", value: snapshot.metrics.seasonPassUsers.toLocaleString() },
    { label: "Paid VIP", value: snapshot.metrics.paidVipUsers.toLocaleString() },
    { label: "VIP Access", value: snapshot.metrics.vipAccessUsers.toLocaleString() },
    { label: "Blocked Users", value: snapshot.metrics.blockedUsers.toLocaleString() },
    { label: "Open Tickets", value: snapshot.metrics.openTickets.toLocaleString() },
  ];
}

function monitoringTone(isHealthy: boolean) {
  return isHealthy ? "text-emerald-300" : "text-amber-300";
}

export default function AdminPage() {
  const { user, isReady, hasSession, signOut } = useAuth();
  const { openSignIn } = useAuthDialog();
  const accountNeedsSync = hasSession && !user;
  const ownerAccess = isOwnerUser(user);
  const [dashboard, setDashboard] = useState<AdminDashboardSnapshot | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState<UserDraft | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrantProduct, setSelectedGrantProduct] = useState<string>("");
  const [broadcastDraft, setBroadcastDraft] = useState<BroadcastDraft>(() => createBroadcastDraft(null));
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDraft, setTicketDraft] = useState<TicketDraft | null>(null);
  const [ticketFilter, setTicketFilter] = useState<SupportTicketStatus | "all">("open");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isTicketsLoading, setIsTicketsLoading] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isGrantingProduct, setIsGrantingProduct] = useState(false);
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedUser = useMemo(() => users.find((entry) => entry.id === selectedUserId) ?? null, [selectedUserId, users]);
  const selectedTicket = useMemo(() => tickets.find((entry) => entry.id === selectedTicketId) ?? null, [selectedTicketId, tickets]);
  const latestWebhookIssue = dashboard?.recentWebhooks.find((entry) => !entry.processedAt) ?? dashboard?.recentWebhooks[0] ?? null;
  const latestRunReview = dashboard?.recentRuns.find((entry) => entry.suspicionLabel !== "clean") ?? dashboard?.recentRuns[0] ?? null;
  const signupTrendMax = Math.max(1, ...(dashboard?.signupTrend ?? []).map((entry) => entry.count));

  async function refreshDashboard() {
    const snapshot = await loadAdminDashboard();
    setDashboard(snapshot);
    setBroadcastDraft(createBroadcastDraft(snapshot.broadcast));
    setSelectedGrantProduct((current) => current || snapshot.products[0]?.id || "");
  }

  async function refreshUsers(query = searchQuery) {
    setIsUsersLoading(true);
    try {
      const response = await searchAdminUsers(query, 24);
      setUsers(response.users);
      const nextUser = response.users.find((entry) => entry.id === selectedUserId) ?? response.users[0] ?? null;
      setSelectedUserId(nextUser?.id ?? null);
      setUserDraft(nextUser ? createUserDraft(nextUser) : null);
    } finally {
      setIsUsersLoading(false);
    }
  }

  async function refreshTickets(filter = ticketFilter) {
    setIsTicketsLoading(true);
    try {
      const response = await loadAdminTickets(filter, 40);
      setTickets(response.tickets);
      const nextTicket = response.tickets.find((entry) => entry.id === selectedTicketId) ?? response.tickets[0] ?? null;
      setSelectedTicketId(nextTicket?.id ?? null);
      setTicketDraft(nextTicket ? createTicketDraft(nextTicket) : null);
    } finally {
      setIsTicketsLoading(false);
    }
  }

  useEffect(() => {
    if (!isReady || !ownerAccess) {
      setIsPageLoading(false);
      return;
    }

    let active = true;
    setIsPageLoading(true);
    setLoadError(null);

    Promise.all([loadAdminDashboard(), searchAdminUsers("", 24), loadAdminTickets(ticketFilter, 40)])
      .then(([dashboardSnapshot, userResponse, ticketResponse]) => {
        if (!active) return;
        setDashboard(dashboardSnapshot);
        setBroadcastDraft(createBroadcastDraft(dashboardSnapshot.broadcast));
        setSelectedGrantProduct(dashboardSnapshot.products[0]?.id ?? "");
        setUsers(userResponse.users);
        const firstUser = userResponse.users[0] ?? null;
        setSelectedUserId(firstUser?.id ?? null);
        setUserDraft(firstUser ? createUserDraft(firstUser) : null);
        setTickets(ticketResponse.tickets);
        const firstTicket = ticketResponse.tickets[0] ?? null;
        setSelectedTicketId(firstTicket?.id ?? null);
        setTicketDraft(firstTicket ? createTicketDraft(firstTicket) : null);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load the admin console.");
      })
      .finally(() => {
        if (active) {
          setIsPageLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isReady, ownerAccess]);

  useEffect(() => {
    if (!selectedUser) return;
    setUserDraft(createUserDraft(selectedUser));
  }, [selectedUser]);

  useEffect(() => {
    if (!selectedTicket) return;
    setTicketDraft(createTicketDraft(selectedTicket));
  }, [selectedTicket]);

  useEffect(() => {
    setBroadcastDraft(createBroadcastDraft(dashboard?.broadcast ?? null));
  }, [dashboard?.broadcast]);

  if (!isReady || isPageLoading) {
    return <div className="page-screen"><div className="page-stack"><section className="command-panel flex min-h-[320px] items-center justify-center p-5 text-sm text-muted-foreground">Loading the owner console...</section></div></div>;
  }

  if (!hasSession) {
    return <div className="page-screen"><div className="page-stack"><section className="section-panel"><PageHeader eyebrow="Owner Console" title="Sign in required" subtitle="Only the owner account can open the admin tools." /><Button onClick={openSignIn} variant="play" size="xl" className="w-full sm:w-auto">Open Sign In</Button></section></div></div>;
  }

  if (accountNeedsSync) {
    return <div className="page-screen"><div className="page-stack"><section className="section-panel"><PageHeader eyebrow="Owner Console" title="Profile sync required" subtitle="The session is active, but the live owner profile did not load. Sign out and retry cleanly." /><Button onClick={() => void signOut()} variant="outline" size="xl" className="w-full sm:w-auto">Sign Out To Retry</Button></section></div></div>;
  }

  if (!ownerAccess) {
    return <div className="page-screen"><div className="page-stack"><section className="section-panel"><PageHeader eyebrow="Owner Console" title="Access denied" subtitle="This route is reserved for the owner account only." /></section></div></div>;
  }

  async function handleUserSearch() {
    try {
      await refreshUsers(searchQuery);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to search users.");
    }
  }

  async function handleSaveUser() {
    if (!selectedUser || !userDraft) return;
    setIsSavingUser(true);
    try {
      const response = await updateAdminUser({
        userId: selectedUser.id,
        username: userDraft.username,
        appRole: userDraft.appRole,
        vipAccess: userDraft.vipAccess,
        hasSeasonPass: userDraft.hasSeasonPass,
        isVip: userDraft.isVip,
        vipExpiresAt: userDraft.vipExpiresAt ? new Date(userDraft.vipExpiresAt).toISOString() : null,
        isBlocked: userDraft.isBlocked,
        blockedReason: userDraft.blockedReason.trim() || null,
        coins: Number(userDraft.coins || 0),
        gems: Number(userDraft.gems || 0),
        puzzleShards: Number(userDraft.puzzleShards || 0),
        rankPoints: Number(userDraft.rankPoints || 0),
        passXp: Number(userDraft.passXp || 0),
        hintBalance: Number(userDraft.hintBalance || 0),
      });
      setUsers((current) => current.map((entry) => (entry.id === response.user.id ? response.user : entry)));
      setSelectedUserId(response.user.id);
      setUserDraft(createUserDraft(response.user));
      setDashboard((current) => current ? {
        ...current,
        recentUsers: current.recentUsers.map((entry) => (entry.id === response.user.id ? response.user : entry)),
      } : current);
      toast.success(`${response.user.username} updated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user.");
    } finally {
      setIsSavingUser(false);
    }
  }

  async function handleSaveBroadcast() {
    setIsSavingBroadcast(true);
    try {
      const response = await updateAdminBroadcast({
        title: broadcastDraft.title,
        message: broadcastDraft.message,
        ctaLabel: broadcastDraft.ctaLabel.trim() || null,
        ctaHref: broadcastDraft.ctaHref.trim() || null,
        isActive: broadcastDraft.isActive,
      });
      setDashboard((current) => current ? { ...current, broadcast: response.broadcast } : current);
      setBroadcastDraft(createBroadcastDraft(response.broadcast));
      toast.success(`Broadcast ${response.broadcast.isActive ? "published" : "saved"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update broadcast.");
    } finally {
      setIsSavingBroadcast(false);
    }
  }

  async function handleGrantProduct() {
    if (!selectedUser || !selectedGrantProduct) return;
    setIsGrantingProduct(true);
    try {
      await grantAdminProduct(selectedUser.id, selectedGrantProduct);
      toast.success(`Granted ${selectedGrantProduct} to ${selectedUser.username}.`);
      await Promise.all([refreshDashboard(), refreshUsers(searchQuery)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to grant product.");
    } finally {
      setIsGrantingProduct(false);
    }
  }

  async function handleSaveTicket() {
    if (!selectedTicket || !ticketDraft) return;
    setIsSavingTicket(true);
    try {
      const response = await updateAdminTicket({
        ticketId: selectedTicket.id,
        status: ticketDraft.status,
        priority: ticketDraft.priority,
        adminNotes: ticketDraft.adminNotes,
      });
      setTickets((current) => current.map((entry) => (entry.id === response.ticket.id ? response.ticket : entry)));
      setSelectedTicketId(response.ticket.id);
      setTicketDraft(createTicketDraft(response.ticket));
      setDashboard((current) => current ? {
        ...current,
        recentTickets: current.recentTickets.map((entry) => (entry.id === response.ticket.id ? response.ticket : entry)),
      } : current);
      toast.success(`Ticket ${response.ticket.subject} updated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update ticket.");
    } finally {
      setIsSavingTicket(false);
    }
  }

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Owner Console"
          title="Owner Admin"
          subtitle="Owner-only control plane for growth, VIP access, moderation, commerce, support, and Arena telemetry."
          right={<Button onClick={() => { void refreshDashboard().catch((error) => toast.error(error instanceof Error ? error.message : "Refresh failed.")); void refreshUsers(searchQuery).catch(() => undefined); void refreshTickets(ticketFilter).catch(() => undefined); }} variant="outline" size="sm"><RefreshCw size={16} />Refresh</Button>}
        />
        {loadError ? <section className="command-panel-soft p-4 text-sm text-muted-foreground">{loadError}</section> : null}
        <section className="hero-panel">
          <div className="command-panel-soft flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="section-kicker">Owner Identity</p>
              <h2 className="section-title mt-1">JudgeMrogan owner access is live</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Only the owner account can open this route, promote VIP access, block users, or review privileged telemetry.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="segment-chip segment-chip-active">Owner Only</span>
              <span className="segment-chip">{OWNER_ACCOUNT_EMAIL}</span>
            </div>
          </div>
          <div className="metric-grid mt-4">{metricCards(dashboard).map((card) => <div key={card.label} className="rich-stat"><p className="hud-label">{card.label}</p><p className="stat-value">{card.value}</p></div>)}</div>
          {dashboard ? (
            <>
              <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
                <div className="command-panel-soft p-4">
                  <div className="flex items-start gap-3">
                    <div className="neon-rivals-stat-icon"><Megaphone size={18} /></div>
                    <div>
                      <p className="section-kicker">Home Broadcast</p>
                      <h2 className="section-title mt-1">Top-of-home announcement</h2>
                      <p className="mt-2 text-sm text-muted-foreground">This banner is shown at the top of the home page for every player as soon as it goes live.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div><label className="hud-label">Title</label><Input value={broadcastDraft.title} onChange={(event) => setBroadcastDraft({ ...broadcastDraft, title: event.target.value })} className="mt-2" maxLength={80} /></div>
                    <div className="command-panel-soft flex items-center justify-between gap-3 p-4"><div><p className="font-black">Broadcast Live</p><p className="text-xs text-muted-foreground">When active, the banner is visible to all players immediately.</p></div><Switch checked={broadcastDraft.isActive} onCheckedChange={(checked) => setBroadcastDraft({ ...broadcastDraft, isActive: checked })} /></div>
                    <div className="md:col-span-2"><label className="hud-label">Message</label><Textarea value={broadcastDraft.message} onChange={(event) => setBroadcastDraft({ ...broadcastDraft, message: event.target.value })} className="mt-2 min-h-[120px]" maxLength={320} placeholder="Post a visible platform message for all players." /></div>
                    <div><label className="hud-label">CTA Label</label><Input value={broadcastDraft.ctaLabel} onChange={(event) => setBroadcastDraft({ ...broadcastDraft, ctaLabel: event.target.value })} className="mt-2" placeholder="Optional button label" maxLength={32} /></div>
                    <div><label className="hud-label">CTA Link</label><Input value={broadcastDraft.ctaHref} onChange={(event) => setBroadcastDraft({ ...broadcastDraft, ctaHref: event.target.value })} className="mt-2" placeholder="/play or https://..." maxLength={240} /></div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">Last updated {dashboard.broadcast ? formatDateTime(dashboard.broadcast.updatedAt) : "never"}</p>
                    <Button onClick={() => void handleSaveBroadcast()} variant="play" size="lg" disabled={isSavingBroadcast}>{isSavingBroadcast ? "Saving..." : "Save Broadcast"}</Button>
                  </div>
                </div>
                <div className="command-panel-soft p-4">
                  <div className="flex items-start gap-3">
                    <div className="neon-rivals-stat-icon"><TrendingUp size={18} /></div>
                    <div>
                      <p className="section-kicker">Growth Pulse</p>
                      <h2 className="section-title mt-1">New user trend</h2>
                      <p className="mt-2 text-sm text-muted-foreground">Track daily signup volume and recent account creation velocity over the last two weeks.</p>
                    </div>
                  </div>
                  <div className="signup-trend-grid mt-5">
                    {dashboard.signupTrend.map((point) => (
                      <div key={point.date} className="signup-trend-column">
                        <div className="signup-trend-value">{point.count}</div>
                        <div className="signup-trend-bar-shell">
                          <div className="signup-trend-bar" style={{ height: `${Math.max(10, (point.count / signupTrendMax) * 100)}%` }} />
                        </div>
                        <div className="signup-trend-label">{formatTrendDate(point.date)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-[320px,1fr,1fr]">
              <div className="command-panel-soft p-4">
                <p className="section-kicker">Commerce Readiness</p>
                <h2 className="section-title mt-1">Checkout status</h2>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>PayPal mode</span>
                    <span className={monitoringTone(dashboard.monitoring.paypalMode === "live")}>{dashboard.monitoring.paypalMode.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Credentials</span>
                    <span className={monitoringTone(dashboard.monitoring.paypalConfigured)}>{dashboard.monitoring.paypalConfigured ? "Configured" : "Missing"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Active catalog</span>
                    <span className="text-foreground">{dashboard.monitoring.activeProductCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Webhook</span>
                    <span className={monitoringTone(dashboard.monitoring.paypalWebhookConfigured)}>{dashboard.monitoring.paypalWebhookConfigured ? "Configured" : "Missing"}</span>
                  </div>
                </div>
                {!dashboard.monitoring.paypalConfigured ? (
                  <p className="mt-4 text-xs text-amber-300">Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in Supabase secrets before beta payments.</p>
                ) : null}
              </div>
              <div className="command-panel-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="section-kicker">Recent Signups</p>
                    <h2 className="section-title mt-1">Newest accounts</h2>
                  </div>
                  <span className="hud-label">30d: {dashboard.metrics.signups30d}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {dashboard.recentUsers.length > 0 ? dashboard.recentUsers.map((entry) => (
                    <button key={entry.id} type="button" onClick={() => setSelectedUserId(entry.id)} className="command-panel w-full p-3 text-left">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-foreground">{entry.username}</p>
                          <p className="truncate text-xs text-muted-foreground">{entry.email ?? "No email found"}</p>
                        </div>
                        <span className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">{formatCompactDate(entry.createdAt)}</span>
                      </div>
                    </button>
                  )) : <div className="command-panel p-3 text-sm text-muted-foreground">No recent signups yet.</div>}
                </div>
              </div>
              <div className="command-panel-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="section-kicker">Complaint Queue</p>
                    <h2 className="section-title mt-1">Recent tickets</h2>
                  </div>
                  <span className="hud-label">Open: {dashboard.metrics.openTickets}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {dashboard.recentTickets.length > 0 ? dashboard.recentTickets.map((ticket) => (
                    <button key={ticket.id} type="button" onClick={() => setSelectedTicketId(ticket.id)} className="command-panel w-full p-3 text-left">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-black text-foreground">{ticket.subject}</p>
                        <span className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">{ticket.status}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{ticket.category} | {ticket.reporterUsername} | {formatCompactDate(ticket.createdAt)}</p>
                    </button>
                  )) : <div className="command-panel p-3 text-sm text-muted-foreground">No complaints or bug tickets yet.</div>}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-3">
              <div className="command-panel-soft p-4">
                <div className="flex items-start gap-3">
                  <div className="neon-rivals-stat-icon"><Activity size={18} /></div>
                  <div>
                    <p className="section-kicker">Webhook Monitor</p>
                    <h2 className="section-title mt-1">Latest delivery</h2>
                  </div>
                </div>
                {latestWebhookIssue ? (
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p className="font-black text-foreground">{latestWebhookIssue.eventType}</p>
                    <p className={latestWebhookIssue.processedAt ? "text-emerald-300" : "text-amber-300"}>{latestWebhookIssue.processedAt ? "Processed" : "Pending"}</p>
                    <p>{latestWebhookIssue.summary ?? latestWebhookIssue.orderId ?? "No summary"}</p>
                    <p className="text-xs">{formatDateTime(latestWebhookIssue.receivedAt)}</p>
                  </div>
                ) : <div className="mt-4 text-sm text-muted-foreground">No webhook deliveries recorded yet.</div>}
              </div>
              <div className="command-panel-soft p-4">
                <div className="flex items-start gap-3">
                  <div className="neon-rivals-stat-icon"><AlertTriangle size={18} /></div>
                  <div>
                    <p className="section-kicker">Arena Review</p>
                    <h2 className="section-title mt-1">Recent run flag</h2>
                  </div>
                </div>
                {latestRunReview ? (
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p className="font-black text-foreground">{latestRunReview.username} | {latestRunReview.mode}</p>
                    <p className={latestRunReview.suspicionLabel === "high" ? "text-destructive" : latestRunReview.suspicionLabel === "review" ? "text-amber-300" : "text-emerald-300"}>{latestRunReview.suspicionLabel.toUpperCase()}</p>
                    <p>{latestRunReview.suspicionReason ?? `${latestRunReview.objectiveTitle} | ${latestRunReview.score.toLocaleString()} score`}</p>
                    <p className="text-xs">{formatDateTime(latestRunReview.createdAt)}</p>
                  </div>
                ) : <div className="mt-4 text-sm text-muted-foreground">No Arena runs available yet.</div>}
              </div>
              <div className="command-panel-soft p-4">
                <div className="flex items-start gap-3">
                  <div className="neon-rivals-stat-icon"><Shield size={18} /></div>
                  <div>
                    <p className="section-kicker">Owner Audit</p>
                    <h2 className="section-title mt-1">Latest privileged action</h2>
                  </div>
                </div>
                {dashboard.recentAudits.length > 0 ? (
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <p className="font-black text-foreground">{dashboard.recentAudits[0].action.replaceAll("_", " ")}</p>
                    <p>Actor {dashboard.recentAudits[0].actorUsername ?? dashboard.recentAudits[0].actorUserId}</p>
                    <p>{dashboard.recentAudits[0].targetUsername ?? dashboard.recentAudits[0].targetTicketId ?? "No target"}</p>
                    <p className="text-xs">{formatDateTime(dashboard.recentAudits[0].createdAt)}</p>
                  </div>
                ) : <div className="mt-4 text-sm text-muted-foreground">No privileged actions logged yet.</div>}
              </div>            </div>
            </>
          ) : null}
        </section>
        <div className="page-grid">
          <section className="section-panel lg:col-span-2">
            <div className="section-header"><div><p className="section-kicker">User Search</p><h2 className="section-title">Profiles and privileges</h2></div></div>
            <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
              <div className="section-stack">
                <div className="command-panel-soft flex gap-2 p-3">
                  <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search username or email" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleUserSearch(); } }} />
                  <Button onClick={() => void handleUserSearch()} variant="outline" size="icon" disabled={isUsersLoading}><Search size={16} /></Button>
                </div>
                <div className="section-stack">
                  {(users.length > 0 ? users : dashboard?.recentUsers ?? []).map((entry) => (
                    <button key={entry.id} type="button" onClick={() => setSelectedUserId(entry.id)} className={`command-panel-soft w-full p-4 text-left ${selectedUserId === entry.id ? "border-primary/50 bg-primary/10" : ""}`}>
                      <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-base font-black">{entry.username}</p><p className="truncate text-xs text-muted-foreground">{entry.email ?? "No email found"}</p></div><span className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">{entry.appRole ?? "player"}</span></div>
                      <p className="mt-2 text-xs text-muted-foreground">{entry.vipAccess ? "VIP Access" : "Standard access"}{entry.isBlocked ? " | Blocked" : ""} | ELO {entry.elo} | Joined {new Date(entry.createdAt).toLocaleDateString()}</p>
                    </button>
                  ))}
                  {isUsersLoading ? <div className="command-panel-soft p-4 text-sm text-muted-foreground">Searching users...</div> : null}
                </div>
              </div>
              <div className="section-stack">
                {selectedUser && userDraft ? (
                  <div className="command-panel-soft grid gap-4 p-4 md:grid-cols-2">
                    <div className="md:col-span-2 flex items-start justify-between gap-4">
                      <div>
                        <p className="section-kicker">Selected Player</p>
                        <h3 className="text-2xl font-black">{selectedUser.username}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{selectedUser.email ?? "No email available"}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Role {selectedUser.appRole ?? "player"} | Season Pass {selectedUser.hasSeasonPass ? "Yes" : "No"} | Paid VIP {selectedUser.isVip ? "Yes" : "No"} | VIP Access {selectedUser.vipAccess ? "Yes" : "No"} | Blocked {selectedUser.isBlocked ? "Yes" : "No"}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground"><p>Rank {selectedUser.rank ?? "unranked"}</p><p>ELO {selectedUser.elo}</p><p>Created {formatDateTime(selectedUser.createdAt)}</p></div>
                    </div>
                    <div><label className="hud-label">Username</label><Input value={userDraft.username} onChange={(event) => setUserDraft({ ...userDraft, username: event.target.value })} className="mt-2" /></div>
                    <div><label className="hud-label">Role</label><Select value={userDraft.appRole} onValueChange={(value) => setUserDraft({ ...userDraft, appRole: value as UserAppRole })}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{ROLE_OPTIONS.map((entry) => <SelectItem key={entry} value={entry}>{entry}</SelectItem>)}</SelectContent></Select></div>
                    <div className="command-panel-soft p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black">Season Pass</p><p className="text-xs text-muted-foreground">Grant or remove premium season access.</p></div><Switch checked={userDraft.hasSeasonPass} onCheckedChange={(checked) => setUserDraft({ ...userDraft, hasSeasonPass: checked })} /></div></div>
                    <div className="command-panel-soft p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black">Paid VIP</p><p className="text-xs text-muted-foreground">Standard membership state and expiry.</p></div><Switch checked={userDraft.isVip} onCheckedChange={(checked) => setUserDraft({ ...userDraft, isVip: checked })} /></div></div>
                    <div className="command-panel-soft p-4 md:col-span-2"><div className="flex items-center justify-between gap-3"><div><p className="font-black">VIP Access</p><p className="text-xs text-muted-foreground">Very Intelligent Puzzler. Complimentary access to purchasable cosmetics, season items, and store unlocks.</p></div><Switch checked={userDraft.vipAccess} onCheckedChange={(checked) => setUserDraft({ ...userDraft, vipAccess: checked })} /></div></div><div className="command-panel-soft p-4 md:col-span-2"><div className="flex items-center justify-between gap-3"><div><p className="font-black">Block Account</p><p className="text-xs text-muted-foreground">Blocked users lose backend access and will see a restricted shell instead of live gameplay and store flows.</p></div><Switch checked={userDraft.isBlocked} onCheckedChange={(checked) => setUserDraft({ ...userDraft, isBlocked: checked })} /></div></div>
                    <div><label className="hud-label">VIP Expiration</label><Input type="datetime-local" value={userDraft.vipExpiresAt} onChange={(event) => setUserDraft({ ...userDraft, vipExpiresAt: event.target.value })} className="mt-2" /></div><div><label className="hud-label">Blocked At</label><div className="command-panel mt-2 px-3 py-2 text-sm text-muted-foreground">{formatDateTime(selectedUser.blockedAt)}</div></div><div className="md:col-span-2"><label className="hud-label">Block Reason</label><Textarea value={userDraft.blockedReason} onChange={(event) => setUserDraft({ ...userDraft, blockedReason: event.target.value })} className="mt-2 min-h-[120px]" placeholder="Moderation reason, abuse details, chargeback, cheating notes, or follow-up context." /></div>
                    <div><label className="hud-label">Coins</label><Input type="number" value={userDraft.coins} onChange={(event) => setUserDraft({ ...userDraft, coins: event.target.value })} className="mt-2" /></div>
                    <div><label className="hud-label">Gems</label><Input type="number" value={userDraft.gems} onChange={(event) => setUserDraft({ ...userDraft, gems: event.target.value })} className="mt-2" /></div>
                    <div><label className="hud-label">Puzzle Shards</label><Input type="number" value={userDraft.puzzleShards} onChange={(event) => setUserDraft({ ...userDraft, puzzleShards: event.target.value })} className="mt-2" /></div>
                    <div><label className="hud-label">Hints</label><Input type="number" value={userDraft.hintBalance} onChange={(event) => setUserDraft({ ...userDraft, hintBalance: event.target.value })} className="mt-2" /></div>
                    <div><label className="hud-label">Rank Points</label><Input type="number" value={userDraft.rankPoints} onChange={(event) => setUserDraft({ ...userDraft, rankPoints: event.target.value })} className="mt-2" /></div>
                    <div><label className="hud-label">Pass XP</label><Input type="number" value={userDraft.passXp} onChange={(event) => setUserDraft({ ...userDraft, passXp: event.target.value })} className="mt-2" /></div>
                    <div className="md:col-span-2 flex flex-wrap gap-3"><Button onClick={() => void handleSaveUser()} variant="play" size="lg" disabled={isSavingUser}><Shield size={16} />{isSavingUser ? "Saving..." : "Save User Changes"}</Button></div>
                    <div className="md:col-span-2 command-panel-soft p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black">Grant Store / Season Product</p><p className="text-xs text-muted-foreground">Use the live catalog to grant specific items, battle passes, or bundles directly.</p></div><ShoppingBag size={16} className="text-primary" /></div><div className="mt-4 flex flex-col gap-3 md:flex-row"><Select value={selectedGrantProduct} onValueChange={setSelectedGrantProduct}><SelectTrigger className="md:flex-1"><SelectValue placeholder="Select a product" /></SelectTrigger><SelectContent>{(dashboard?.products ?? []).map((product) => <SelectItem key={product.id} value={product.id}>{product.name} ({product.kind})</SelectItem>)}</SelectContent></Select><Button onClick={() => void handleGrantProduct()} variant="outline" size="lg" disabled={!selectedGrantProduct || isGrantingProduct}>{isGrantingProduct ? "Granting..." : "Grant Product"}</Button></div></div>
                  </div>
                ) : <div className="command-panel-soft p-4 text-sm text-muted-foreground">Select a user from the search panel to edit their profile and privileges.</div>}
              </div>
            </div>
          </section>
          <section className="section-panel">
            <div className="section-header"><div><p className="section-kicker">Complaints & Bugs</p><h2 className="section-title">Issue review deck</h2></div></div>
            <div className="flex flex-wrap gap-2">{TICKET_FILTERS.map((entry) => <button key={entry} type="button" onClick={() => { setTicketFilter(entry); void refreshTickets(entry).catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load tickets.")); }} className={`segment-chip ${ticketFilter === entry ? "segment-chip-active" : ""}`}>{entry}</button>)}</div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[320px,1fr]">
              <div className="section-stack">{tickets.map((ticket) => <button key={ticket.id} type="button" onClick={() => setSelectedTicketId(ticket.id)} className={`command-panel-soft w-full p-4 text-left ${selectedTicketId === ticket.id ? "border-primary/50 bg-primary/10" : ""}`}><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-black">{ticket.subject}</p><span className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">{ticket.status}</span></div><p className="mt-2 text-xs text-muted-foreground">{ticket.reporterUsername} | {ticket.category} | {formatDateTime(ticket.createdAt)}</p></button>)}{isTicketsLoading ? <div className="command-panel-soft p-4 text-sm text-muted-foreground">Loading tickets...</div> : null}</div>
              <div className="section-stack">{selectedTicket && ticketDraft ? <div className="command-panel-soft grid gap-4 p-4"><div><p className="section-kicker">Reporter</p><h3 className="text-xl font-black">{selectedTicket.reporterUsername}</h3><p className="mt-1 text-sm text-muted-foreground">{selectedTicket.reporterEmail ?? "No email available"}</p><p className="mt-2 text-xs text-muted-foreground">Assigned to {selectedTicket.assignedToUsername ?? "unassigned"} | Resolved {formatDateTime(selectedTicket.resolvedAt)}</p></div><div><p className="hud-label">Subject</p><p className="mt-2 text-base font-black">{selectedTicket.subject}</p></div><div><p className="hud-label">Ticket Body</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selectedTicket.body}</p></div><div className="grid gap-4 md:grid-cols-2"><div><label className="hud-label">Status</label><Select value={ticketDraft.status} onValueChange={(value) => setTicketDraft({ ...ticketDraft, status: value as SupportTicketStatus })}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{TICKET_STATUSES.map((entry) => <SelectItem key={entry} value={entry}>{entry}</SelectItem>)}</SelectContent></Select></div><div><label className="hud-label">Priority</label><Select value={ticketDraft.priority} onValueChange={(value) => setTicketDraft({ ...ticketDraft, priority: value as SupportTicketPriority })}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{TICKET_PRIORITIES.map((entry) => <SelectItem key={entry} value={entry}>{entry}</SelectItem>)}</SelectContent></Select></div></div><div><label className="hud-label">Admin Notes</label><Textarea value={ticketDraft.adminNotes} onChange={(event) => setTicketDraft({ ...ticketDraft, adminNotes: event.target.value })} className="mt-2 min-h-[160px]" /></div><div className="flex flex-wrap gap-3"><Button onClick={() => void handleSaveTicket()} variant="play" size="lg" disabled={isSavingTicket}>{isSavingTicket ? "Saving..." : "Save Ticket Review"}</Button><div className="text-sm text-muted-foreground">Updated {formatDateTime(selectedTicket.updatedAt)}</div></div></div> : <div className="command-panel-soft p-4 text-sm text-muted-foreground">Select a ticket to review bug details, complaints, or player support requests.</div>}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

