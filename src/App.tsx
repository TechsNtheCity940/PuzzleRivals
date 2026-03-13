import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";
import PlayPage from "./pages/PlayPage";
import MatchPage from "./pages/MatchPage";
import TournamentsPage from "./pages/TournamentsPage";
import StorePage from "./pages/StorePage";
import SeasonPage from "./pages/SeasonPage";
import ProfilePage from "./pages/ProfilePage";
import { AuthProvider } from "./providers/AuthProvider";
import { AuthDialogProvider } from "./components/auth/AuthDialogContext";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthDialogProvider>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/play" element={<PlayPage />} />
                <Route path="/match" element={<MatchPage />} />
                <Route path="/tournaments" element={<TournamentsPage />} />
                <Route path="/store" element={<StorePage />} />
                <Route path="/season" element={<SeasonPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppShell>
          </AuthDialogProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
