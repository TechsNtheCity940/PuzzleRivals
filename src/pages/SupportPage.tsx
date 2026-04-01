import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, MonitorSmartphone, Send } from "lucide-react";
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
import PageHeader from "@/components/layout/PageHeader";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import {
  buildSupportClientContext,
  loadOwnSupportTickets,
  submitSupportTicket,
  type SupportClientContext,
  type SupportTicketRecord,
} from "@/lib/support";
import type { SupportTicketCategory } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

const CATEGORY_OPTIONS: SupportTicketCategory[] = ["bug", "complaint", "support", "feedback"];

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

function formatClientSummary(context: SupportClientContext | null) {
  if (!context) {
    return "Diagnostics unavailable";
  }

  const viewport = `${context.viewport.width}x${context.viewport.height} @${context.viewport.pixelRatio}x`;
  return `${context.route} | ${viewport} | ${context.online ? "online" : "offline"}`;
}

export default function SupportPage() {
  const { user, isReady, hasSession, signOut } = useAuth();
  const { openSignIn } = useAuthDialog();
  const accountNeedsSync = hasSession && !user;
  const [category, setCategory] = useState<SupportTicketCategory>("bug");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const diagnostics = useMemo(() => buildSupportClientContext(), []);

  useEffect(() => {
    if (!isReady || !user || user.isGuest) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    loadOwnSupportTickets(user.id)
      .then((next) => {
        if (active) {
          setTickets(next);
        }
      })
      .catch((error) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Failed to load your support tickets.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isReady, user?.id]);

  if (!isReady || isLoading) {
    return <div className="page-screen"><div className="page-stack"><section className="command-panel flex min-h-[320px] items-center justify-center p-5 text-sm text-muted-foreground">Loading support...</section></div></div>;
  }

  if (!hasSession) {
    return <div className="page-screen"><div className="page-stack"><section className="section-panel"><PageHeader eyebrow="Player Support" title="Sign in to report an issue" subtitle="Support tickets are linked to your live account so the owner can follow up cleanly." /><Button onClick={openSignIn} variant="play" size="xl" className="w-full sm:w-auto">Open Sign In</Button></section></div></div>;
  }

  if (accountNeedsSync) {
    return <div className="page-screen"><div className="page-stack"><section className="section-panel"><PageHeader eyebrow="Player Support" title="Profile sync required" subtitle="The session is active, but the live profile failed to load. Sign out and retry cleanly before opening a support ticket." /><Button onClick={() => void signOut()} variant="outline" size="xl" className="w-full sm:w-auto">Sign Out To Retry</Button></section></div></div>;
  }

  async function handleSubmit() {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const ticket = await submitSupportTicket({ reporterUserId: user.id, category, subject, body, clientContext: diagnostics });
      setTickets((current) => [ticket, ...current]);
      setSubject("");
      setBody("");
      setCategory("bug");
      toast.success("Support ticket submitted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit support ticket.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Player Support"
          title="Report an Issue"
          subtitle="Send bugs, complaints, or support requests directly into the owner review console with attached device diagnostics."
          right={<LifeBuoy size={18} className="text-primary" />}
        />
        {loadError ? <section className="command-panel-soft p-4 text-sm text-muted-foreground">{loadError}</section> : null}
        <div className="page-grid">
          <section className="section-panel">
            <div className="section-header"><div><p className="section-kicker">New Ticket</p><h2 className="section-title">Tell us what happened</h2></div></div>
            <div className="section-stack">
              <div><label className="hud-label">Category</label><Select value={category} onValueChange={(value) => setCategory(value as SupportTicketCategory)}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{CATEGORY_OPTIONS.map((entry) => <SelectItem key={entry} value={entry}>{entry}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="hud-label">Subject</label><Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Short summary of the issue" className="mt-2" /></div>
              <div><label className="hud-label">Details</label><Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="What were you doing, what happened, and what did you expect instead?" className="mt-2 min-h-[180px]" /></div>
              <div className="command-panel-soft flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><MonitorSmartphone size={16} className="text-primary" /><p className="text-sm font-black text-white">Attached diagnostics</p></div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{formatClientSummary(diagnostics)}</p>
                </div>
                <span className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">Auto-attached</span>
              </div>
              <Button onClick={() => void handleSubmit()} variant="play" size="xl" className="w-full sm:w-auto" disabled={isSubmitting}><Send size={16} />{isSubmitting ? "Submitting..." : "Submit Ticket"}</Button>
            </div>
          </section>
          <section className="section-panel">
            <div className="section-header"><div><p className="section-kicker">Your Tickets</p><h2 className="section-title">Status updates</h2></div></div>
            <div className="section-stack">
              {tickets.length > 0 ? tickets.map((ticket) => (
                <div key={ticket.id} className="command-panel-soft p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-base font-black">{ticket.subject}</p><p className="text-xs text-muted-foreground">{ticket.category} | created {formatDateTime(ticket.createdAt)}</p></div><span className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">{ticket.status}</span></div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{ticket.body}</p>
                  {ticket.clientContext ? <div className="mt-3 rounded-[18px] border border-white/10 bg-white/5 p-3 text-sm text-white/80"><p className="hud-label">Diagnostics</p><p className="mt-2 leading-6">{formatClientSummary(ticket.clientContext)}</p></div> : null}
                  {ticket.adminNotes ? <div className="mt-3 rounded-[18px] border border-white/10 bg-white/5 p-3 text-sm text-white/80"><p className="hud-label">Owner Notes</p><p className="mt-2 whitespace-pre-wrap leading-6">{ticket.adminNotes}</p></div> : null}
                </div>
              )) : <div className="command-panel-soft p-4 text-sm text-muted-foreground">No tickets yet. When you submit one, it will appear here with status updates.</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
