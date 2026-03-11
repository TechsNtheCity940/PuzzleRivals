import { useState } from "react";
import { Trophy, Users, Clock, ChevronRight, Zap } from "lucide-react";
import { TOURNAMENTS, PUZZLE_TYPES } from "@/lib/seed-data";

type Tab = "upcoming" | "live" | "completed";

export default function TournamentsPage() {
  const [tab, setTab] = useState<Tab>("live");

  const filtered = TOURNAMENTS.filter(t => t.status === tab);
  const tabs: { id: Tab; label: string }[] = [
    { id: "live", label: "Live" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-3">
        <h1 className="font-display font-bold text-lg">Tournaments</h1>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-1 mb-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 h-9 rounded text-xs font-display font-bold uppercase tracking-wider transition-colors ${
              tab === t.id ? "bg-ion text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Royale Banner */}
      <div className="mx-4 mb-4 surface rounded p-4 border-ion">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded bg-ion/10 flex items-center justify-center">
            <Trophy size={24} className="text-ion" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-sm">Puzzle Royale</p>
            <p className="text-[11px] text-muted-foreground">50 players, elimination rounds, 1 winner</p>
          </div>
          <div className="text-center">
            <p className="text-ion font-display font-bold text-sm">LIVE</p>
            <p className="text-[10px] text-muted-foreground">38 left</p>
          </div>
        </div>
      </div>

      {/* Tournament list */}
      <div className="px-4 space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No {tab} tournaments</p>
        )}
        {filtered.map(t => {
          const puzzle = PUZZLE_TYPES.find(p => p.type === t.puzzleType);
          return (
            <button key={t.id} className="w-full surface-interactive rounded p-4 text-left">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{puzzle?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm">{t.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users size={10} />
                      {t.currentPlayers}/{t.maxPlayers}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Zap size={10} />
                      {t.entryFee > 0 ? `${t.entryFee} coins` : "Free"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-sm text-ion">🪙 {t.prizePool.toLocaleString()}</p>
                  {t.status === "upcoming" && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(t.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
