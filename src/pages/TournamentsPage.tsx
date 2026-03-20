import { useEffect, useMemo, useState } from "react";
import { Trophy, Users, Zap } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { loadDiscoveryContent, type GameContentSource } from "@/lib/game-content";
import type { PuzzleMeta, Tournament } from "@/lib/types";

type Tab = "upcoming" | "live" | "completed";

function sourceLabel(source: GameContentSource) {
  return source === "supabase" ? "Live circuit" : "Demo circuit";
}

export default function TournamentsPage() {
  const [tab, setTab] = useState<Tab>("live");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [puzzleTypes, setPuzzleTypes] = useState<PuzzleMeta[]>([]);
  const [tournamentSource, setTournamentSource] = useState<GameContentSource>("seed");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const discovery = await loadDiscoveryContent();
        if (cancelled) return;

        setTournaments(discovery.tournaments);
        setPuzzleTypes(discovery.puzzleTypes);
        setTournamentSource(discovery.sources.tournaments);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load tournament circuit.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => tournaments.filter((tournament) => tournament.status === tab), [tab, tournaments]);
  const tabs: { id: Tab; label: string }[] = [
    { id: "live", label: "Live" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
  ];
  const liveTournament = tournaments.find((tournament) => tournament.status === "live");
  const visible = filtered.slice(0, 6);

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Competitive Circuit"
          title="Tournaments"
          subtitle={`${sourceLabel(tournamentSource)} snapshot for active, upcoming, and finished events.`}
          right={
            <div className="spotlight-panel text-center">
              <p className="section-kicker">Events</p>
              <p className="mt-2 text-3xl font-black">{isLoading ? "--" : tournaments.length}</p>
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
            {loadError ? (
              <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                {loadError}
              </div>
            ) : isLoading ? (
              <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                Loading tournament circuit...
              </div>
            ) : visible.length === 0 ? (
              <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                No {tab} tournaments.
              </div>
            ) : (
              visible.map((tournament) => {
                const puzzle = puzzleTypes.find((entry) => entry.type === tournament.puzzleType);
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
