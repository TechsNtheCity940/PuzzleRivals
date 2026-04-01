import { useEffect, useMemo, useState } from "react";
import { Trophy, Users, Zap } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import {
  loadDiscoveryContent,
  type GameContentResolution,
  type GameContentSource,
} from "@/lib/game-content";
import {
  getNeonPuzzleSurfaceAsset,
  getNeonPuzzleThemeDefinition,
} from "@/lib/match-board-theme";
import type { PuzzleMeta, Tournament } from "@/lib/types";

type Tab = "upcoming" | "live" | "completed";

function sourceLabel(source: GameContentSource) {
  return source === "supabase" ? "Live circuit" : "Offline";
}

function describeTournamentResolution(resolution: GameContentResolution) {
  if (resolution === "empty") {
    return "No tournaments are currently published in this circuit state.";
  }
  if (resolution === "unavailable") {
    return "Live tournament data is currently unavailable.";
  }
  return "Tournament data is unavailable in this environment.";
}

function TournamentMedia({
  tournament,
  puzzle,
}: {
  tournament: Tournament;
  puzzle?: PuzzleMeta;
}) {
  const theme = getNeonPuzzleThemeDefinition(tournament.puzzleType);
  const assetRef = getNeonPuzzleSurfaceAsset(tournament.puzzleType);

  return (
    <div className="relative h-[84px] w-[84px] overflow-hidden rounded-[24px] border border-primary/20 bg-slate-950/80 shadow-[0_16px_36px_rgba(6,10,20,0.32)]">
      <img
        src={assetRef}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-90"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,18,0.12),rgba(6,10,18,0.78))]" />
      <div className="absolute inset-x-0 bottom-0 p-2">
        <p className="font-hud text-[9px] uppercase tracking-[0.18em] text-primary">
          {theme.kicker}
        </p>
        <p className="truncate text-xs font-black text-white">
          {puzzle?.label ?? theme.label}
        </p>
      </div>
    </div>
  );
}

export default function TournamentsPage() {
  const [tab, setTab] = useState<Tab>("live");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [puzzleTypes, setPuzzleTypes] = useState<PuzzleMeta[]>([]);
  const [tournamentSource, setTournamentSource] =
    useState<GameContentSource>("supabase");
  const [tournamentResolution, setTournamentResolution] =
    useState<GameContentResolution>("unavailable");
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
        setTournamentResolution(discovery.resolutions.tournaments);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load tournament circuit.",
        );
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

  const filtered = useMemo(
    () => tournaments.filter((tournament) => tournament.status === tab),
    [tab, tournaments],
  );
  const tabs: { id: Tab; label: string }[] = [
    { id: "live", label: "Live" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
  ];
  const liveTournament = tournaments.find(
    (tournament) => tournament.status === "live",
  );
  const visible = filtered.slice(0, 6);
  const livePuzzle = liveTournament
    ? puzzleTypes.find((entry) => entry.type === liveTournament.puzzleType)
    : undefined;
  const liveTheme = liveTournament
    ? getNeonPuzzleThemeDefinition(liveTournament.puzzleType)
    : null;

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Competitive Circuit"
          title="Tournaments"
          subtitle={
            loadError ??
            (isLoading
              ? "Syncing the tournament circuit..."
              : tournamentResolution === "live"
                ? `${sourceLabel(tournamentSource)} snapshot for active, upcoming, and finished events.`
                : describeTournamentResolution(tournamentResolution))
          }
          right={
            <div className="spotlight-panel text-center">
              <p className="section-kicker">Events</p>
              <p className="mt-2 text-3xl font-black">
                {isLoading ? "--" : tournaments.length}
              </p>
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
                  {liveTheme?.summary ??
                    "Live bracket, compact watchlist, rapid entry lock."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="command-panel-soft px-4 py-3">
                    <p className="hud-label">Puzzle Lane</p>
                    <p className="mt-2 text-sm font-black text-primary">
                      {livePuzzle?.label ?? liveTournament.puzzleType}
                    </p>
                  </div>
                  <div className="command-panel-soft px-4 py-3">
                    <p className="hud-label">Status</p>
                    <p className="mt-2 text-sm font-black text-white">
                      {liveTournament.status}
                    </p>
                  </div>
                </div>
              </div>
              <div className="metric-grid">
                <div className="command-panel-soft flex items-center justify-center p-4 sm:col-span-3">
                  <TournamentMedia
                    tournament={liveTournament}
                    puzzle={livePuzzle}
                  />
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Prize</p>
                  <p className="stat-value text-primary">
                    {liveTournament.prizePool.toLocaleString()}
                  </p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Entry</p>
                  <p className="stat-value">
                    {liveTournament.entryFee || "Free"}
                  </p>
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
              <h2 className="section-title">
                {tab === "live"
                  ? "Broadcast-ready events"
                  : `All ${tab} events`}
              </h2>
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
                {describeTournamentResolution(tournamentResolution)}
              </div>
            ) : (
              visible.map((tournament) => {
                const puzzle = puzzleTypes.find(
                  (entry) => entry.type === tournament.puzzleType,
                );
                const theme = getNeonPuzzleThemeDefinition(
                  tournament.puzzleType,
                );
                return (
                  <PuzzleTileButton
                    key={tournament.id}
                    title={tournament.name}
                    description={`${puzzle?.label ?? "Puzzle"} | ${theme.summary}`}
                    media={
                      <TournamentMedia
                        tournament={tournament}
                        puzzle={puzzle}
                      />
                    }
                    right={
                      <div className="space-y-1">
                        <div className="flex items-center justify-end gap-1 text-[10px] font-hud uppercase tracking-[0.16em] text-muted-foreground">
                          <Users size={10} />
                          {tournament.currentPlayers}/{tournament.maxPlayers}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[10px] font-hud uppercase tracking-[0.16em] text-primary">
                          <Zap size={10} />
                          {tournament.entryFee > 0
                            ? `${tournament.entryFee} coins`
                            : "free"}
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
