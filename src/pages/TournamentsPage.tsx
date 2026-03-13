import { useMemo, useState } from "react";
import { Radar, Trophy, Users, Zap } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { TOURNAMENTS, PUZZLE_TYPES } from "@/lib/seed-data";

type Tab = "upcoming" | "live" | "completed";

export default function TournamentsPage() {
  const [tab, setTab] = useState<Tab>("live");

  const filtered = useMemo(() => TOURNAMENTS.filter((tournament) => tournament.status === tab), [tab]);
  const tabs: { id: Tab; label: string }[] = [
    { id: "live", label: "Live" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
  ];
  const liveTournament = TOURNAMENTS.find((tournament) => tournament.status === "live");
  const visible = filtered.slice(0, 3);

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Competitive Circuit"
          title="Tournaments"
          subtitle="Fast snapshots of active, upcoming, and finished events."
          right={
            <div className="command-panel-soft px-4 py-3 text-center">
              <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">Events</p>
              <p className="text-sm font-black">{TOURNAMENTS.length}</p>
            </div>
          }
        />

        <section className="command-panel grid min-h-0 flex-1 grid-rows-[auto_auto_1fr] gap-3 overflow-hidden p-3">
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={`segment-chip ${tab === entry.id ? "segment-chip-active" : ""}`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {liveTournament ? (
            <div className="command-panel-soft grid grid-cols-[1fr_auto] gap-3 p-3">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <img
                    src="/brand/puzzle-rivals-logo.png"
                    alt="Puzzle Rivals"
                    className="h-8 w-8 rounded-full object-cover"
                    draggable={false}
                  />
                  <div>
                    <p className="hud-label text-primary">Featured Event</p>
                    <p className="text-base font-black">{liveTournament.name}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Live bracket, compact watchlist, rapid entry lock.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="compact-metric min-w-[78px] text-center">
                  <span className="hud-label">Prize</span>
                  <span className="text-sm font-black text-primary">{liveTournament.prizePool.toLocaleString()}</span>
                </div>
                <div className="compact-metric min-w-[78px] text-center">
                  <span className="hud-label">Entry</span>
                  <span className="text-sm font-black">{liveTournament.entryFee || "Free"}</span>
                </div>
                <div className="compact-metric min-w-[78px] text-center">
                  <span className="hud-label">Players</span>
                  <span className="text-sm font-black">{liveTournament.currentPlayers}</span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid min-h-0 gap-3">
            {visible.length === 0 ? (
              <div className="command-panel-soft flex min-h-[120px] items-center justify-center p-6 text-sm text-muted-foreground">
                No {tab} tournaments.
              </div>
            ) : (
              visible.map((tournament) => {
                const puzzle = PUZZLE_TYPES.find((entry) => entry.type === tournament.puzzleType);
                return (
                  <PuzzleTileButton
                    key={tournament.id}
                    title={tournament.name}
                    description={`${puzzle?.label ?? "Puzzle"} • ${tournament.status}`}
                    emoji={puzzle?.icon}
                    right={
                      <div className="space-y-1 text-right">
                        <div className="flex items-center justify-end gap-1 text-[10px] font-hud uppercase tracking-[0.16em] text-muted-foreground">
                          <Users size={10} />
                          {tournament.currentPlayers}/{tournament.maxPlayers}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[10px] font-hud uppercase tracking-[0.16em] text-primary">
                          <Zap size={10} />
                          {tournament.entryFee > 0 ? `${tournament.entryFee} coins` : "free"}
                        </div>
                      </div>
                    }
                  />
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
