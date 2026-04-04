import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Bell, RefreshCw, Settings2, Shield, Sparkles, WifiOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import IdentityLoadoutCard from "@/components/cosmetics/IdentityLoadoutCard";
import StockAvatar from "@/components/profile/StockAvatar";
import { Button } from "@/components/ui/button";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import { getThemeVisual } from "@/lib/cosmetics";
import { isOwnerUser } from "@/lib/dev-account";
import { loadNotificationSummary } from "@/lib/game-content";
import { loadSocialAlertSummary } from "@/lib/friends";
import { FALLBACK_APP_RUNTIME_STATUS, loadAppRuntimeStatus } from "@/lib/app-status";
import { useAuth } from "@/providers/AuthProvider";
import { useAppPreferences } from "@/providers/AppPreferencesProvider";
import RouteMusicController from "@/components/audio/RouteMusicController";
import BottomNav from "./BottomNav";
import {
  resolveCanonicalBrowserUrl,
  shouldRedirectToCanonical,
} from "@/lib/app-origin";

function unreadBadgeLabel(unreadCount: number) {
  if (unreadCount <= 0) return "Account";
  if (unreadCount === 1) return "1 new alert";
  return `${unreadCount} new alerts`;
}

function UnreadBell({ unreadCount }: { unreadCount: number }) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <Bell size={16} className="text-white/55" />
      {unreadCount > 0 ? (
        <span className="absolute -right-2 -top-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black leading-none text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </span>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, isReady, backendWarning, hasSession, signOut } =
    useAuth();
  const { openSignIn, openSignUp } = useAuthDialog();
  const { notificationsEnabled } = useAppPreferences();
  const [activityUnreadCount, setActivityUnreadCount] = useState(0);
  const [friendUnreadCount, setFriendUnreadCount] = useState(0);
  const [runtimeStatus, setRuntimeStatus] = useState(FALLBACK_APP_RUNTIME_STATUS);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const isMatchRoute = location.pathname.startsWith("/match");
  const isNeonRivalsRoute = location.pathname.startsWith("/play/neon-rival");
  const isHeadToHeadRoute = location.pathname.startsWith("/play/head-to-head");
  const hideHeader = isMatchRoute || isNeonRivalsRoute || isHeadToHeadRoute;
  const hideBottomNav = isNeonRivalsRoute || isHeadToHeadRoute;
  const accountNeedsSync = hasSession && !user;
  const ownerAccess = isOwnerUser(user);
  const blockedAccount = Boolean(user?.isBlocked);
  const theme = getThemeVisual(user?.themeId);
  const themeVars = {
    "--theme-shell-art": theme.shellArt ? `url("${theme.shellArt}")` : "none",
    "--theme-board-art": theme.boardArt ? `url("${theme.boardArt}")` : "none",
  } as CSSProperties;

  useEffect(() => {
    if (shouldRedirectToCanonical()) {
      window.location.replace(resolveCanonicalBrowserUrl());
      return;
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadAppRuntimeStatus()
      .then((status) => {
        if (active) {
          setRuntimeStatus(status);
        }
      })
      .catch(() => {
        if (active) {
          setRuntimeStatus(FALLBACK_APP_RUNTIME_STATUS);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!isReady || isGuest) {
        if (active) {
          setActivityUnreadCount(0);
          setFriendUnreadCount(0);
        }
        return;
      }

      try {
        const [activitySummary, socialSummary] = await Promise.all([
          notificationsEnabled
            ? loadNotificationSummary(user?.id)
            : Promise.resolve(null),
          loadSocialAlertSummary(user),
        ]);
        if (active) {
          setActivityUnreadCount(activitySummary?.unreadCount ?? 0);
          setFriendUnreadCount(
            (socialSummary.incomingRequests ?? 0) +
              (socialSummary.unreadMessages ?? 0),
          );
        }
      } catch {
        if (active) {
          setActivityUnreadCount(0);
          setFriendUnreadCount(0);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [isGuest, isReady, location.pathname, notificationsEnabled, user]);

  const totalUnreadCount = activityUnreadCount + friendUnreadCount;
  const serviceSignals = useMemo(() => {
    const signals: Array<{ title: string; body: string; tone: "warning" | "info" }> = [];

    if (isOffline) {
      signals.push({
        title: "Offline",
        body: "The shell is offline. Live friends, purchases, and season sync will stall until the connection returns.",
        tone: "warning",
      });
    }

    if (blockedAccount) {
      signals.push({
        title: "Account blocked",
        body: user?.blockedReason ?? "This account is blocked from live services. Contact support if you believe this is incorrect.",
        tone: "warning",
      });
    }

    if (accountNeedsSync) {
      signals.push({
        title: "Profile sync required",
        body: "Auth is active but the live profile payload is missing. Sign out and retry before using live systems.",
        tone: "warning",
      });
    } else if (backendWarning) {
      signals.push({
        title: "Backend degraded",
        body: backendWarning,
        tone: "warning",
      });
    }

    if (runtimeStatus.resolution === "live" && !runtimeStatus.commerceReady) {
      signals.push({
        title: "Commerce paused",
        body: "Live checkout is not fully configured yet. USD purchases stay disabled until PayPal credentials are complete.",
        tone: "info",
      });
    }

    return signals;
  }, [accountNeedsSync, backendWarning, blockedAccount, isOffline, runtimeStatus, user?.blockedReason]);

  return (
    <div className={`app-shell bg-background ${theme.shellClass}`} style={themeVars}>
      <RouteMusicController />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 app-noise opacity-30" />
        <div className="absolute inset-0 app-theme-shell-art opacity-35" />
        <div className="absolute inset-x-0 top-0 h-72 app-theme-top-glow" />
        <div className="absolute right-[-8%] top-24 h-80 w-80 rounded-full app-theme-orb-primary blur-3xl" />
        <div className="absolute left-[-12%] top-1/3 h-96 w-96 rounded-full app-theme-orb-accent blur-3xl" />
        <div className="absolute bottom-[-10%] right-[10%] h-80 w-80 rounded-full app-theme-orb-tertiary blur-3xl" />
      </div>
      {!hideHeader ? (
        <header className="app-header safe-top">
          <div className="shell-frame">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="brand-lockup deck-float text-left"
            >
              <img
                src="/brand/puzzle-rivals-logo.png"
                alt="Puzzle Rivals"
                className="h-14 w-14 rounded-[22px] border border-white/10 object-cover shadow-[0_18px_40px_rgba(0,0,0,0.26)]"
                draggable={false}
              />
              <div className="min-w-0">
                <p className="font-hud text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                  Puzzle Rivals
                </p>
                <p className="text-xl font-black tracking-tight text-white">
                  Big Brain Moves
                </p>
              </div>
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              {isReady && isGuest ? (
                <>
                  <Button
                    onClick={openSignIn}
                    variant="outline"
                    size="sm"
                    className="rounded-full px-4"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={openSignUp}
                    variant="play"
                    size="sm"
                    className="rounded-full px-4"
                  >
                    Sign Up
                  </Button>
                </>
              ) : accountNeedsSync ? (
                <div className="spotlight-panel flex max-w-[320px] items-center gap-3 px-4 py-3 text-left">
                  <div className="min-w-0 flex-1">
                    <p className="section-kicker">Account Sync</p>
                    <p className="truncate text-base font-black text-white">
                      Profile unavailable
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Auth is live, but profile data did not load from Supabase.
                    </p>
                  </div>
                  <Button
                    onClick={() => void signOut()}
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-full px-4"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={() => navigate("/notifications")}
                    variant="outline"
                    size="icon"
                    className="relative h-12 w-12 rounded-full"
                    aria-label="Open notifications"
                  >
                    <Bell size={18} />
                    {totalUnreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black leading-none text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
                        {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                      </span>
                    ) : null}
                  </Button>
                  {ownerAccess ? (
                    <Button
                      type="button"
                      onClick={() => navigate("/admin")}
                      variant="outline"
                      size="sm"
                      className="rounded-full px-4"
                      aria-label="Open owner admin console"
                    >
                      <Shield size={16} />
                      Admin
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => navigate("/settings")}
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    aria-label="Open settings"
                  >
                    <Settings2 size={18} />
                  </Button>
                  <button
                    type="button"
                    onClick={() => navigate("/profile")}
                    className="profile-badge interactive-halo"
                  >
                    <div className="hidden sm:block">
                      <IdentityLoadoutCard
                        username={user?.username ?? "Profile"}
                        subtitle={ownerAccess ? `Owner account | ${unreadBadgeLabel(totalUnreadCount)}` : unreadBadgeLabel(totalUnreadCount)}
                        avatarId={user?.avatarId}
                        frameId={user?.frameId}
                        playerCardId={user?.playerCardId}
                        bannerId={user?.bannerId}
                        emblemId={user?.emblemId}
                        titleId={user?.titleId}
                        compact
                        right={<UnreadBell unreadCount={totalUnreadCount} />}
                        className="min-w-[280px]"
                      />
                    </div>
                    <div className="sm:hidden relative">
                      <StockAvatar avatarId={user?.avatarId} frameId={user?.frameId} size="sm" />
                      {totalUnreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black leading-none text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
                          {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
      ) : null}

      <main
        className={`relative mx-auto flex ${hideHeader ? "min-h-screen" : "min-h-[calc(100vh-88px)]"} w-full flex-col ${
          hideHeader ? "pb-0" : "pb-32"
        } ${hideHeader ? "" : "pt-4"}`}
      >
        {!hideHeader && serviceSignals.length > 0 ? (
          <div className="mx-auto w-full max-w-6xl px-4 pb-2 md:px-6">
            <div className="service-status-strip flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.2)] md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-2">
                {serviceSignals.map((signal) => (
                  <div key={signal.title} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${signal.tone === "warning" ? "bg-amber-500/12 text-amber-200" : "bg-primary/12 text-primary"}`}
                    >
                      {signal.tone === "warning" ? (
                        <WifiOff size={16} />
                      ) : (
                        <Sparkles size={16} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">{signal.title}</p>
                      <p className="text-sm leading-6 text-muted-foreground">{signal.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                {accountNeedsSync ? (
                  <Button onClick={() => void signOut()} variant="outline" size="sm">
                    Sign Out To Retry
                  </Button>
                ) : null}
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                  <RefreshCw size={14} />
                  Reload
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {blockedAccount ? (
          <div className="page-screen"><div className="page-stack"><section className="section-panel"><div className="flex items-start gap-4"><div className="neon-rivals-stat-icon"><Shield size={18} /></div><div><p className="section-kicker">Account blocked</p><h1 className="section-title mt-1">Live access restricted</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{user?.blockedReason ?? "This account has been blocked by the owner console. Gameplay, purchases, and social actions are restricted until the block is lifted."}</p></div></div><div className="mt-6 flex flex-wrap gap-3"><Button onClick={() => navigate("/support")} variant="play" size="lg">Contact Support</Button><Button onClick={() => void signOut()} variant="outline" size="lg">Sign Out</Button></div></section></div></div>
        ) : children}
      </main>
      {!hideBottomNav ? (
        <BottomNav
          friendsBadge={friendUnreadCount}
          notificationsBadge={totalUnreadCount}
          ownerAccess={ownerAccess}
        />
      ) : null}
    </div>
  );
}




