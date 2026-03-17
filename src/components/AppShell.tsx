import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(156,52,255,0.22),_transparent_55%)]" />
        <div className="absolute right-[-20%] top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-[-15%] h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>
      {!hideHeader && (
        <div className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
          <div className="mx-auto flex w-full max-w-md items-center justify-between rounded-[28px] border border-white/10 bg-slate-950/78 px-4 py-3 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-3 text-left"
            >
              <img
                src="/brand/puzzle-rivals-logo.png"
                alt="Puzzle Rivals"
                className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
                draggable={false}
              />
              <div>
                <p className="font-hud text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Puzzle Rivals</p>
                <p className="text-sm font-black text-white/90">Big Brain Moves</p>
              </div>
            </button>

            <div className="flex items-center gap-2">
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
                  className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-left transition-colors hover:bg-white/10"
                >
                  <StockAvatar avatarId={user?.avatarId} size="sm" />
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-white/90">{user?.username ?? "Profile"}</p>
                    <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-white/55">Account</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className={`relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden ${isMatchRoute ? "pb-0" : "pb-24"} ${hideHeader ? "" : "pt-20"}`}>
        {backendWarning && !hideHeader ? (
          <div className="px-3 pb-3 pt-3">
            <div className="rounded-[24px] border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50 shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
              {backendWarning}
            </div>
          </div>
        ) : null}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
