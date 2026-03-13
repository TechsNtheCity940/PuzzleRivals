import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/engine/gameContext";
import Home from "./pages/Home";
import Matchmaking from "./pages/Matchmaking";
import Lobby from "./pages/Lobby";
import GameScreen from "./pages/GameScreen";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import Shop from "./pages/Shop";
import BattlePass from "./pages/BattlePass";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <GameProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/matchmaking" element={<Matchmaking />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/game" element={<GameScreen />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/battlepass" element={<BattlePass />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </GameProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
