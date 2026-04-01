import { useEffect, useState } from "react";
import {
  LoaderCircle,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import IdentityLoadoutCard from "@/components/cosmetics/IdentityLoadoutCard";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import StockAvatar from "@/components/profile/StockAvatar";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  loadDirectConversation,
  loadFriendsDashboard,
  removeFriend,
  searchSocialProfiles,
  sendDirectMessage,
  sendFriendRequest,
  touchOwnPresence,
  type DirectConversationSnapshot,
  type FriendEntrySnapshot,
  type FriendsDashboardSnapshot,
  type SocialProfileCard,
} from "@/lib/friends";
import { getRankBand, getRankColor } from "@/lib/seed-data";
import { useAuth } from "@/providers/AuthProvider";

function formatPresence(entry: SocialProfileCard) {
  if (entry.isOnline) return "Online now";
  if (!entry.lastSeenAt) return "Offline";

  const timestamp = Date.parse(entry.lastSeenAt);
  if (Number.isNaN(timestamp)) return "Offline";

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60_000),
  );
  if (diffMinutes < 1) return "Seen just now";
  if (diffMinutes < 60) return `Seen ${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Seen ${diffHours}h ago`;
  return `Seen ${Math.floor(diffHours / 24)}d ago`;
}

function formatRequestTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Recent";
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function profileDescription(profile: SocialProfileCard) {
  const rankBand = getRankBand(profile.elo);
  return `${rankBand.label} | ELO ${profile.elo} | ${formatPresence(profile)}`;
}

function RelationshipAction({
  profile,
  onAdd,
}: {
  profile: SocialProfileCard;
  onAdd: () => void;
}) {
  if (profile.friendshipState === "friend") {
    return (
      <span className="font-hud text-[10px] uppercase tracking-[0.18em] text-primary">
        Connected
      </span>
    );
  }
  if (profile.friendshipState === "incoming_request") {
    return (
      <span className="font-hud text-[10px] uppercase tracking-[0.18em] text-amber-300">
        Incoming
      </span>
    );
  }
  if (profile.friendshipState === "outgoing_request") {
    return (
      <span className="font-hud text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Pending
      </span>
    );
  }
  return (
    <Button
      onClick={onAdd}
      variant="outline"
      size="sm"
      className="rounded-full px-4"
    >
      <UserPlus size={14} />
      Add
    </Button>
  );
}

function FriendCard({
  entry,
  onMessage,
  onRemove,
}: {
  entry: FriendEntrySnapshot;
  onMessage: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="command-panel-soft flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <StockAvatar avatarId={entry.profile.avatarId} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-black">
              {entry.profile.username}
            </p>
            <span
              className={`font-hud text-[10px] uppercase tracking-[0.18em] ${getRankColor(entry.profile.rank)}`}
            >
              {entry.profile.rank}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {profileDescription(entry.profile)}
          </p>
        </div>
        <span
          className={`h-2.5 w-2.5 rounded-full ${entry.profile.isOnline ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" : "bg-white/15"}`}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onMessage}
          variant="play"
          size="sm"
          className="rounded-full px-4"
        >
          <MessageSquare size={14} />
          Message
        </Button>
        <Button
          onClick={onRemove}
          variant="outline"
          size="sm"
          className="rounded-full px-4"
        >
          <UserMinus size={14} />
          Remove
        </Button>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSignIn, openSignUp } = useAuthDialog();
  const { user, hasSession, signOut } = useAuth();
  const accountNeedsSync = hasSession && !user;
  const [dashboard, setDashboard] = useState<FriendsDashboardSnapshot | null>(
    null,
  );
  const [conversation, setConversation] =
    useState<DirectConversationSnapshot | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialProfileCard[]>([]);
  const [requestMessage, setRequestMessage] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const selectedPartnerId = searchParams.get("chat");

  async function refreshDashboard() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const snapshot = await loadFriendsDashboard(user);
      setDashboard(snapshot);
      if (!selectedPartnerId && snapshot.friends[0]) {
        setSearchParams(
          { chat: snapshot.friends[0].profile.id },
          { replace: true },
        );
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load your friends console.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!user || user.isGuest || accountNeedsSync) {
      setDashboard(null);
      setConversation(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    async function boot() {
      try {
        await touchOwnPresence(user.id);
      } catch {
        // Presence should never block the page.
      }
      if (active) {
        void refreshDashboard();
      }
    }
    void boot();

    const heartbeat = window.setInterval(() => {
      void touchOwnPresence(user.id);
    }, 45_000);
    const refresher = window.setInterval(() => {
      if (active) {
        void refreshDashboard();
      }
    }, 30_000);

    return () => {
      active = false;
      window.clearInterval(heartbeat);
      window.clearInterval(refresher);
    };
  }, [accountNeedsSync, user]);

  useEffect(() => {
    if (!user || user.isGuest || accountNeedsSync) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    async function loadSearch() {
      setIsSearching(true);
      try {
        const results = await searchSocialProfiles(user, searchQuery);
        if (active) {
          setSearchResults(results);
        }
      } catch (error) {
        if (active) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not search players.",
          );
        }
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }

    const timeout = window.setTimeout(
      () => {
        void loadSearch();
      },
      searchQuery.trim() ? 180 : 0,
    );

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [accountNeedsSync, searchQuery, user]);

  useEffect(() => {
    if (!user || user.isGuest || accountNeedsSync) {
      setConversation(null);
      return;
    }

    let active = true;
    async function loadConversation() {
      if (!selectedPartnerId) {
        setConversation(null);
        return;
      }
      try {
        const nextConversation = await loadDirectConversation(
          user,
          selectedPartnerId,
        );
        if (active) {
          setConversation(nextConversation);
        }
      } catch (error) {
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Could not load messages.",
          );
        }
      }
    }

    void loadConversation();
    return () => {
      active = false;
    };
  }, [accountNeedsSync, dashboard?.friends.length, selectedPartnerId, user]);

  const rankBand = getRankBand(user?.elo ?? 0);
  const searchCollection = searchQuery.trim()
    ? searchResults
    : (dashboard?.suggestions ?? []);

  async function handleMutation(
    work: () => Promise<void>,
    successMessage?: string,
  ) {
    setIsMutating(true);
    try {
      await work();
      await touchOwnPresence(user?.id);
      await refreshDashboard();
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "That social action did not complete.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function handleSendMessage() {
    if (!conversation || !user) {
      return;
    }

    const body = messageBody.trim();
    if (!body) {
      return;
    }

    setIsMutating(true);
    try {
      await sendDirectMessage(user.id, conversation.partner.id, body);
      const nextConversation = await loadDirectConversation(
        user,
        conversation.partner.id,
      );
      setConversation(nextConversation);
      setMessageBody("");
      await refreshDashboard();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send message.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  if (accountNeedsSync) {
    return (
      <div className="page-screen">
        <div className="page-stack">
          <PageHeader
            eyebrow="Friends Console"
            title="Profile sync required"
            subtitle="You are signed in, but the live profile row did not load. Fix that before using friends or messaging."
          />
          <section className="section-panel">
            <div className="command-panel-soft flex flex-col gap-4 p-5">
              <p className="text-base text-muted-foreground">
                Sign out and sign back in once the backend row is available
                again.
              </p>
              <Button
                onClick={() => void signOut()}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Sign Out To Retry
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!user || user.isGuest) {
    return (
      <div className="page-screen">
        <div className="page-stack">
          <PageHeader
            eyebrow="Friends Console"
            title="Bring your rival network online"
            subtitle="Search players, send friend requests, watch who is online, and open direct messages once you sign in."
          />
          <section className="section-panel">
            <div className="command-panel-soft flex flex-col gap-4 p-5">
              <p className="text-base text-muted-foreground">
                Guest accounts cannot use friends, presence, or messaging. Sign
                in to access the live social network.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={openSignIn} variant="outline" size="lg">
                  Sign In
                </Button>
                <Button onClick={openSignUp} variant="play" size="lg">
                  Create Account
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Friends Console"
          title="Your rival network"
          subtitle={`${rankBand.label} operator with live presence, friend requests, and direct chat.`}
          right={
            <IdentityLoadoutCard
              username={user.username}
              subtitle={
                dashboard?.resolution === "live"
                  ? "Live social link active"
                  : dashboard?.resolution === "unavailable"
                    ? "Social services unavailable"
                    : "Friends network ready"
              }
              avatarId={user.avatarId}
              frameId={user.frameId}
              playerCardId={user.playerCardId}
              bannerId={user.bannerId}
              emblemId={user.emblemId}
              titleId={user.titleId}
              compact
            />
          }
        />

        <section className="hero-panel">
          <div className="hero-grid">
            <div className="section-stack">
              <div className="command-panel-soft p-5">
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Find Players</p>
                    <h2 className="section-title">Search the platform</h2>
                  </div>
                  <span className="font-hud text-[10px] uppercase tracking-[0.18em] text-primary">
                    {dashboard?.resolution === "unavailable"
                      ? "Offline"
                      : "Live"}
                  </span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by username"
                    className="h-12 rounded-full border-white/10 bg-background/60 px-4"
                  />
                  <Button
                    onClick={() => void refreshDashboard()}
                    variant="outline"
                    size="lg"
                    className="rounded-full px-5"
                  >
                    <Search size={16} />
                    Refresh
                  </Button>
                </div>
                <Input
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  placeholder="Optional request note"
                  className="mt-3 h-11 rounded-full border-white/10 bg-background/50 px-4"
                />
                <div className="section-stack mt-4">
                  {isSearching ? (
                    <div className="command-panel-soft flex min-h-[140px] items-center justify-center text-sm text-muted-foreground">
                      <LoaderCircle size={18} className="mr-2 animate-spin" />{" "}
                      Searching players...
                    </div>
                  ) : searchCollection.length > 0 ? (
                    searchCollection.map((profile) => (
                      <PuzzleTileButton
                        key={profile.id}
                        media={
                          <StockAvatar avatarId={profile.avatarId} size="sm" />
                        }
                        title={profile.username}
                        description={profileDescription(profile)}
                        right={
                          <RelationshipAction
                            profile={profile}
                            onAdd={() =>
                              void handleMutation(
                                () =>
                                  sendFriendRequest(
                                    user.id,
                                    profile.id,
                                    requestMessage,
                                  ),
                                `Friend request sent to ${profile.username}.`,
                              )
                            }
                          />
                        }
                        onClick={() => {
                          if (profile.friendshipState === "friend") {
                            setSearchParams({ chat: profile.id });
                          }
                        }}
                      />
                    ))
                  ) : (
                    <div className="command-panel-soft px-4 py-5 text-sm text-muted-foreground">
                      {searchQuery.trim()
                        ? "No players matched that search yet."
                        : dashboard?.resolution === "unavailable"
                          ? "Player search is currently unavailable."
                          : dashboard?.resolution === "empty"
                            ? "No live suggestions yet. As players join the platform, they will appear here."
                            : "Type a username to search for players across Puzzle Rivals."}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="section-stack">
              <div className="command-panel-soft p-5">
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Requests</p>
                    <h2 className="section-title">Incoming and outgoing</h2>
                  </div>
                </div>
                <div className="section-stack">
                  {dashboard?.incomingRequests.length
                    ? dashboard.incomingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="command-panel-soft p-4"
                        >
                          <div className="flex items-center gap-3">
                            <StockAvatar
                              avatarId={request.profile.avatarId}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-black">
                                {request.profile.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {profileDescription(request.profile)}
                              </p>
                            </div>
                            <span className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">
                              {formatRequestTime(request.createdAt)}
                            </span>
                          </div>
                          {request.message ? (
                            <p className="mt-3 text-sm text-muted-foreground">
                              "{request.message}"
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              onClick={() =>
                                void handleMutation(
                                  () => acceptFriendRequest(request.id),
                                  `${request.profile.username} added to your friends.`,
                                )
                              }
                              variant="play"
                              size="sm"
                              className="rounded-full px-4"
                            >
                              <UserCheck size={14} /> Accept
                            </Button>
                            <Button
                              onClick={() =>
                                void handleMutation(
                                  () => declineFriendRequest(request.id),
                                  `Declined ${request.profile.username}.`,
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="rounded-full px-4"
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      ))
                    : null}

                  {dashboard?.outgoingRequests.length
                    ? dashboard.outgoingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="command-panel-soft p-4"
                        >
                          <div className="flex items-center gap-3">
                            <StockAvatar
                              avatarId={request.profile.avatarId}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-black">
                                {request.profile.username}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Waiting on response |{" "}
                                {formatPresence(request.profile)}
                              </p>
                            </div>
                            <span className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              Pending
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              onClick={() =>
                                void handleMutation(
                                  () => cancelFriendRequest(request.id),
                                  `Cancelled the request to ${request.profile.username}.`,
                                )
                              }
                              variant="outline"
                              size="sm"
                              className="rounded-full px-4"
                            >
                              Cancel Request
                            </Button>
                          </div>
                        </div>
                      ))
                    : null}

                  {!dashboard?.incomingRequests.length &&
                  !dashboard?.outgoingRequests.length ? (
                    <div className="command-panel-soft px-4 py-5 text-sm text-muted-foreground">
                      {loadError ??
                        (dashboard?.resolution === "unavailable"
                          ? "Friends data is currently unavailable."
                          : "No live friend requests are waiting right now.")}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="page-grid">
          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Friend Roster</p>
                <h2 className="section-title">Who is online</h2>
              </div>
              <Button
                onClick={() => navigate("/profile")}
                variant="ghost"
                size="sm"
              >
                <ShieldCheck size={14} /> Profile Deck
              </Button>
            </div>
            <div className="section-stack">
              {isLoading ? (
                <div className="command-panel-soft flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
                  <LoaderCircle size={18} className="mr-2 animate-spin" />{" "}
                  Loading friends...
                </div>
              ) : dashboard?.friends.length ? (
                dashboard.friends.map((entry) => (
                  <FriendCard
                    key={entry.profile.id}
                    entry={entry}
                    onMessage={() =>
                      setSearchParams({ chat: entry.profile.id })
                    }
                    onRemove={() =>
                      void handleMutation(
                        () => removeFriend(entry.profile.id),
                        `${entry.profile.username} removed from your roster.`,
                      )
                    }
                  />
                ))
              ) : (
                <div className="command-panel-soft flex min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
                  <Users size={22} className="text-primary" />
                  <div>
                    <p className="text-lg font-black">Build your squad</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {dashboard?.resolution === "unavailable"
                        ? "Live friends data is currently unavailable."
                        : "Search players above, send requests, and accepted rivals will land here with live online status."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Direct Messages</p>
                <h2 className="section-title">Chat with friends</h2>
              </div>
            </div>
            <div className="section-stack">
              {conversation ? (
                <>
                  <div className="command-panel-soft flex items-center gap-3 p-4">
                    <StockAvatar
                      avatarId={conversation.partner.avatarId}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black">
                        {conversation.partner.username}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {profileDescription(conversation.partner)}
                      </p>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${conversation.partner.isOnline ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" : "bg-white/15"}`}
                    />
                  </div>

                  <div className="command-panel-soft flex min-h-[320px] flex-col gap-3 p-4">
                    <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                      {conversation.messages.length > 0 ? (
                        conversation.messages.map((message) => (
                          <div
                            key={message.id}
                            className={`max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-6 ${message.isOwn ? "ml-auto bg-primary/16 text-white" : "bg-background/55 text-muted-foreground"}`}
                          >
                            <p>{message.body}</p>
                            <p className="mt-2 font-hud text-[10px] uppercase tracking-[0.14em] text-white/45">
                              {formatRequestTime(message.createdAt)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="flex min-h-[180px] items-center justify-center text-sm text-muted-foreground">
                          No messages yet. Break the ice and start the thread.
                        </div>
                      )}
                    </div>
                    {conversation.partner.friendshipState === "friend" ? (
                      <div className="flex flex-col gap-3 border-t border-white/10 pt-3">
                        <textarea
                          value={messageBody}
                          onChange={(event) =>
                            setMessageBody(event.target.value)
                          }
                          placeholder={`Message ${conversation.partner.username}`}
                          className="min-h-[110px] w-full rounded-[24px] border border-white/10 bg-background/60 px-4 py-3 text-sm text-white outline-none transition focus:border-primary/40"
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={() => void handleSendMessage()}
                            disabled={isMutating || !messageBody.trim()}
                            variant="play"
                            size="lg"
                            className="rounded-full px-5"
                          >
                            <Send size={16} /> Send Message
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[22px] border border-white/10 bg-background/40 px-4 py-4 text-sm text-muted-foreground">
                        Become friends first to unlock direct messaging with
                        this player.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="command-panel-soft flex min-h-[360px] flex-col items-center justify-center gap-3 p-6 text-center">
                  <MessageSquare size={22} className="text-primary" />
                  <div>
                    <p className="text-lg font-black">Open a friend thread</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Select a friend from your roster to see live messages, or
                      add someone new from the search console.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
