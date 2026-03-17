import type { CSSProperties, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Sparkles } from "lucide-react";
import IdentityLoadoutCard from "@/components/cosmetics/IdentityLoadoutCard";
import StockAvatar from "@/components/profile/StockAvatar";
import { Button } from "@/components/ui/button";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import { getThemeVisual } from "@/lib/cosmetics";
import { useAuth } from "@/providers/AuthProvider";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, isReady, backendWarning } = useAuth();
  const { openSignIn, openSignUp } = useAuthDialog();
  const isMatchRoute = location.pathname.startsWith("/match");
  const hideHeader = isMatchRoute;
  const theme = getThemeVisual(user?.themeId);
  const themeVars = {
    "--theme-shell-art": theme.shellArt ? `url("${theme.shellArt}")` : "none",
    "--theme-board-art": theme.boardArt ? `url("${theme.boardArt}")` : "none",
  } as CSSProperties;

  return (
    <div className={`app-shell bg-background ${theme.shellClass}`} style={themeVars}>
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 app-noise opacity-30" />
        <div className="absolute inset-0 app-theme-shell-art opacity-35" />
        <div className="absolute inset-x-0 top-0 h-72 app-theme-top-glow" />
        <div className="absolute right-[-8%] top-24 h-80 w-80 rounded-full app-theme-orb-primary blur-3xl" />
        <div className="absolute left-[-12%] top-1/3 h-96 w-96 rounded-full app-theme-orb-accent blur-3xl" />
        <div className="absolute bottom-[-10%] right-[10%] h-80 w-80 rounded-full app-theme-orb-tertiary blur-3xl" />
      </div>
      {!hideHeader && (
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
                <p className="font-hud text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Puzzle Rivals</p>
                <p className="text-xl font-black tracking-tight text-white">Big Brain Moves</p>
              </div>
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              {isReady && isGuest ? (
                <>
                  <Button onClick={openSignIn} variant="outline" size="sm" className="rounded-full px-4">
                    Sign In
                  </Button>
                  <Button onClick={openSignUp} variant="play" size="sm" className="rounded-full px-4">
                    Sign Up
                  </Button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="profile-badge interactive-halo"
                >
                  <div className="hidden sm:block">
                    <IdentityLoadoutCard
                      username={user?.username ?? "Profile"}
                      subtitle="Account"
                      avatarId={user?.avatarId}
                      frameId={user?.frameId}
                      playerCardId={user?.playerCardId}
                      bannerId={user?.bannerId}
                      emblemId={user?.emblemId}
                      titleId={user?.titleId}
                      compact
                      right={<Bell size={16} className="text-white/55" />}
                      className="min-w-[280px]"
                    />
                  </div>
                  <div className="sm:hidden">
                    <StockAvatar avatarId={user?.avatarId} frameId={user?.frameId} size="sm" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <main
        className={`relative mx-auto flex ${isMatchRoute ? "min-h-screen" : "min-h-[calc(100vh-88px)]"} w-full flex-col ${
          isMatchRoute ? "pb-0" : "pb-32"
        } ${hideHeader ? "" : "pt-4"}`}
      >
        {backendWarning && !hideHeader ? (
          <div className="mx-auto w-full max-w-6xl px-4 pb-2 md:px-6">
            <div className="flex items-start gap-3 rounded-[24px] border border-amber-300/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-50 shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
              <Sparkles size={18} className="mt-0.5 shrink-0" />
              <p>{backendWarning}</p>
            </div>
          </div>
        ) : null}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
