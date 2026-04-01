import { useEffect, useState } from "react";
import { Bell, LifeBuoy, MessageSquare, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { Button } from "@/components/ui/button";
import { loadNotificationSummary, type NotificationSummarySnapshot } from "@/lib/game-content";
import { loadSocialAlertSummary, type SocialAlertSummary } from "@/lib/friends";
import { loadOwnSupportTickets, type SupportTicketRecord } from "@/lib/support";
import { useAuth } from "@/providers/AuthProvider";
import { useAppPreferences } from "@/providers/AppPreferencesProvider";

function formatRelative(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "Recent";
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user, hasSession } = useAuth();
  const { notificationsEnabled } = useAppPreferences();
  const [activity, setActivity] = useState<NotificationSummarySnapshot | null>(null);
  const [social, setSocial] = useState<SocialAlertSummary | null>(null);
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [activitySnapshot, socialSnapshot, ownTickets] = await Promise.all([
          loadNotificationSummary(user?.id),
          loadSocialAlertSummary(user),
          user && !user.isGuest ? loadOwnSupportTickets(user.id) : Promise.resolve([]),
        ]);

        if (!active) {
          return;
        }

        setActivity(activitySnapshot);
        setSocial(socialSnapshot);
        setTickets(ownTickets.slice(0, 4));
      } catch (error) {
        if (!active) {
          return;
        }
        setLoadError(
          error instanceof Error ? error.message : "Failed to load notification center.",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user]);

  const notificationTotal =
    (notificationsEnabled ? activity?.unreadCount ?? 0 : 0) +
    (social?.incomingRequests ?? 0) +
    (social?.unreadMessages ?? 0);

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Signal Center"
          title="Notifications"
          subtitle={
            hasSession
              ? `${notificationTotal} active alerts across activity, friend requests, and direct messages.`
              : "Sign in to bring account alerts, friend activity, and support updates into one feed."
          }
          right={<Bell size={18} className="text-primary" />}
        />

        {loadError ? (
          <section className="command-panel-soft p-4 text-sm text-muted-foreground">
            {loadError}
          </section>
        ) : null}

        <div className="page-grid">
          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Account Activity</p>
                <h2 className="section-title">What changed recently</h2>
              </div>
            </div>
            <div className="section-stack">
              {isLoading ? (
                <div className="command-panel-soft p-5 text-sm text-muted-foreground">
                  Loading activity...
                </div>
              ) : activity?.recent.length ? (
                activity.recent.map((entry) => (
                  <PuzzleTileButton
                    key={entry.id}
                    title={entry.title}
                    description={entry.description}
                    right={
                      <div className="text-right">
                        <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {entry.label}
                        </p>
                        <p className="mt-1 text-xs font-black text-primary">
                          {entry.isRead ? formatRelative(entry.occurredAt) : `New | ${formatRelative(entry.occurredAt)}`}
                        </p>
                      </div>
                    }
                    onClick={() => navigate("/profile")}
                  />
                ))
              ) : (
                <div className="command-panel-soft p-5 text-sm text-muted-foreground">
                  No live activity yet.
                </div>
              )}
            </div>
          </section>

          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Social Alerts</p>
                <h2 className="section-title">Friends and messages</h2>
              </div>
            </div>
            <div className="metric-grid">
              <div className="rich-stat">
                <p className="hud-label">Requests</p>
                <p className="stat-value">{social?.incomingRequests ?? 0}</p>
              </div>
              <div className="rich-stat">
                <p className="hud-label">Unread Messages</p>
                <p className="stat-value text-primary">{social?.unreadMessages ?? 0}</p>
              </div>
              <div className="rich-stat">
                <p className="hud-label">Friends</p>
                <p className="stat-value">{social?.connectedFriends ?? 0}</p>
              </div>
              <div className="rich-stat">
                <p className="hud-label">Online</p>
                <p className="stat-value text-xp">{social?.onlineFriends ?? 0}</p>
              </div>
            </div>
            <div className="mt-4 section-stack">
              <PuzzleTileButton
                icon={Users}
                title="Open Friends Console"
                description="Handle incoming requests, review who is online, and open direct conversations."
                onClick={() => navigate("/friends")}
              />
              <PuzzleTileButton
                icon={MessageSquare}
                title="Jump to active chats"
                description="Use the social deck to catch unread direct messages and keep your rival network warm."
                onClick={() => navigate("/friends")}
              />
            </div>
          </section>
        </div>

        <section className="section-panel">
          <div className="section-header">
            <div>
              <p className="section-kicker">Support Updates</p>
              <h2 className="section-title">Your open tickets</h2>
            </div>
            <LifeBuoy size={18} className="text-primary" />
          </div>
          <div className="section-stack">
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <PuzzleTileButton
                  key={ticket.id}
                  title={ticket.subject}
                  description={ticket.body}
                  right={
                    <div className="text-right">
                      <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {ticket.priority}
                      </p>
                      <p className="mt-1 text-xs font-black text-primary">
                        {ticket.status}
                      </p>
                    </div>
                  }
                  onClick={() => navigate("/support")}
                />
              ))
            ) : (
              <div className="command-panel-soft p-5 text-sm text-muted-foreground">
                No support tickets are active right now.
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => navigate("/support")} variant="outline" size="lg">
                Open Support
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
