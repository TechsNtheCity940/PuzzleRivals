import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "./components/AppShell";
import { AuthProvider } from "./providers/AuthProvider";
import { AuthDialogProvider } from "./components/auth/AuthDialogContext";
import { AppPreferencesProvider } from "./providers/AppPreferencesProvider";

const queryClient = new QueryClient();
const HomePage = lazy(() => import("./pages/HomePage"));
const PlayPage = lazy(() => import("./pages/PlayPage"));
const NeonRivalsGamePage = lazy(() => import("./pages/NeonRivalsGamePage"));
const TournamentsPage = lazy(() => import("./pages/TournamentsPage"));
const StorePage = lazy(() => import("./pages/StorePage"));
const SeasonPage = lazy(() => import("./pages/SeasonPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const FriendsPage = lazy(() => import("./pages/FriendsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

function RouteFallback() {
  return (
    <div className="page-screen">
      <div className="page-stack">
        <section className="command-panel flex min-h-[320px] items-center justify-center p-5">
          <div className="command-panel-soft flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <LoaderCircle size={24} className="animate-spin" />
            </div>
            <div>
              <p className="text-lg font-black">Loading command deck</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Streaming the next arena view.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppPreferencesProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AuthDialogProvider>
              <AppShell>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/play" element={<PlayPage />} />
                    <Route path="/play/neon-rival" element={<NeonRivalsGamePage />} />
                    <Route path="/play/neon-rivals" element={<NeonRivalsGamePage />} />
                    <Route path="/match" element={<Navigate to="/play/neon-rival" replace />} />
                    <Route path="/tournaments" element={<TournamentsPage />} />
                    <Route path="/store" element={<StorePage />} />
                    <Route path="/season" element={<SeasonPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/friends" element={<FriendsPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </AppShell>
            </AuthDialogProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AppPreferencesProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
