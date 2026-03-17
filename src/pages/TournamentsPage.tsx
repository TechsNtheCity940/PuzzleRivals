import { useMemo, useState } from "react";
import { Trophy, Users, Zap } from "lucide-react";
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
  const visible = filtered.slice(0, 6);

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Competitive Circuit"
          title="Tournaments"
          subtitle="Fast snapshots of active, upcoming, and finished events."
          right={
            <div className="spotlight-panel text-center">
              <p className="section-kicker">Events</p>
              <p className="mt-2 text-3xl font-black">{TOURNAMENTS.length}</p>
            </div>
          }
        />

        {liveTournament ? (
          <section className="hero-panel">
            <div className="hero-grid">
              <div className="command-panel-soft p-5">
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Featured Event</p>
                    <h2 className="section-title">{liveTournament.name}</h2>
                  </div>
                  <Trophy size={18} className="text-primary" />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Live bracket, compact watchlist, rapid entry lock.
                </p>
              </div>
              <div className="metric-grid">
                <div className="rich-stat">
                  <p className="hud-label">Prize</p>
                  <p className="stat-value text-primary">{liveTournament.prizePool.toLocaleString()}</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Entry</p>
                  <p className="stat-value">{liveTournament.entryFee || "Free"}</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Players</p>
                  <p className="stat-value">{liveTournament.currentPlayers}</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="section-panel">
          <div className="section-header">
            <div>
              <p className="section-kicker">Status Filter</p>
              <h2 className="section-title">Switch boards instantly</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
        </section>

        <section className="section-panel">
          <div className="section-header">
            <div>
              <p className="section-kicker">Tournament Feed</p>
              <h2 className="section-title">{tab === "live" ? "Broadcast-ready events" : `All ${tab} events`}</h2>
            </div>
          </div>

          <div className="deck-grid">
            {visible.length === 0 ? (
              <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                No {tab} tournaments.
              </div>
            ) : (
              visible.map((tournament) => {
                const puzzle = PUZZLE_TYPES.find((entry) => entry.type === tournament.puzzleType);
                return (
                  <PuzzleTileButton
                    key={tournament.id}
                    title={tournament.name}
                    description={`${puzzle?.label ?? "Puzzle"} - ${tournament.status}`}
                    emoji={puzzle?.icon}
                    right={
                      <div className="space-y-1">
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
