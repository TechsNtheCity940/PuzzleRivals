import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Sparkles } from "lucide-react";
import StockAvatar from "@/components/profile/StockAvatar";
import { Button } from "@/components/ui/button";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import { useAuth } from "@/providers/AuthProvider";
import BottomNav from "./BottomNav";

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, isReady, backendWarning } = useAuth();
  const { openSignIn, openSignUp } = useAuthDialog();
  const isMatchRoute = location.pathname.startsWith("/match");
  const hideHeader = isMatchRoute;

  return (
    <div className="app-shell bg-background">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 app-noise opacity-30" />
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(156,52,255,0.24),_transparent_56%)]" />
        <div className="absolute right-[-8%] top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute left-[-12%] top-1/3 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[10%] h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
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
                  <StockAvatar avatarId={user?.avatarId} size="sm" />
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-sm font-black text-white/90">{user?.username ?? "Profile"}</p>
                    <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-white/55">Account</p>
                  </div>
                  <Bell size={16} className="hidden text-white/55 sm:block" />
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      <main
        className={`relative mx-auto flex min-h-[calc(100vh-88px)] w-full flex-col ${
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
