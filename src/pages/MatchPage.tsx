import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Clock3,
  DoorOpen,
  Home,
  Lightbulb,
  LoaderCircle,
  ScanSearch,
  UserRoundPlus,
  Users,
  WifiOff,
} from "lucide-react";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import PageHeader from "@/components/layout/PageHeader";
import MatchPuzzleBoard from "@/components/match/MatchPuzzleBoard";
import StockAvatar from "@/components/profile/StockAvatar";
import { Button } from "@/components/ui/button";
import { subscribeToLobby, supabaseApi } from "@/lib/api-client";
import type { BackendLobby, BackendLobbyPlayer, MatchMode, PuzzleSubmission } from "@/lib/backend";
import { getPuzzleHelpText, getPuzzleHintText, isRapidFirePuzzleType } from "@/lib/match-rules";
import { DEFAULT_AVATAR_ID, getStockAvatar } from "@/lib/profile-customization";
import { getRankColor } from "@/lib/seed-data";
import { isSupabaseConfigured, supabaseConfigErrorMessage } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatSolveTime(timeMs: number | null) {
  if (timeMs === null) return "DNF";
  return `${(timeMs / 1000).toFixed(1)}s`;
}

function formatMode(mode: MatchMode) {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

function formatPlacement(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

function rankPlayers(players: BackendLobbyPlayer[], rapidFire: boolean) {
  return [...players].sort((left, right) => {
    if (rapidFire && right.score !== left.score) return right.score - left.score;
    if (rapidFire && right.completions !== left.completions) return right.completions - left.completions;
    if (right.progress !== left.progress) return right.progress - left.progress;
    if (left.solvedAtMs === null && right.solvedAtMs === null) return 0;
    if (left.solvedAtMs === null) return 1;
    if (right.solvedAtMs === null) return -1;
    return left.solvedAtMs - right.solvedAtMs;
  });
}

function LobbySeat({
  player,
  seatLabel,
  isSelf,
}: {
  player: BackendLobbyPlayer | null;
  seatLabel: string;
  isSelf: boolean;
}) {
  const avatar = getStockAvatar(player?.avatarId ?? DEFAULT_AVATAR_ID);
  const title = player?.titleName ?? (player?.isBot ? "Easy Bot" : `${player?.rank} rival`);
  const cardName = player?.playerCardName ?? `${avatar.label} Card`;
  const bannerName = player?.bannerName ?? (player?.isBot ? "Training Banner" : "Arena Banner");
  const emblemName = player?.emblemName ?? (player?.isBot ? "Practice Emblem" : "Rank Emblem");

  return (
    <div
      className={cn(
        "match-seat-card",
        player && "match-seat-card-active",
        isSelf && "match-seat-card-self",
      )}
    >
      <div className="match-seat-banner">
        <span className="match-seat-banner-label">{player ? bannerName : "Queue Search"}</span>
        <span className="match-seat-banner-status">
          {player ? (player.ready ? "Ready" : "Locking") : "Scanning"}
        </span>
      </div>

      <div className="match-seat-main">
        <div className="match-seat-avatar-wrap">
          {player ? (
            <>
              <StockAvatar avatarId={player.avatarId ?? DEFAULT_AVATAR_ID} size="md" className="match-seat-avatar" />
              <div className="match-seat-avatar-ring" />
            </>
          ) : (
            <div className="match-seat-avatar-search">
              <ScanSearch size={24} />
            </div>
          )}
        </div>

        <div className="match-seat-copy">
          <div className="match-seat-name-row">
            <p className="match-seat-name">
              {player ? `${player.username}${isSelf ? " (You)" : ""}` : "Searching..."}
            </p>
            <span className="match-seat-title">{player ? title : "Open seat"}</span>
          </div>
          <p className="match-seat-subtitle">
            {seatLabel}
            {player?.isBot ? " • training rival" : player ? " • live profile synced" : " • waiting for challenger"}
          </p>
          <div className="match-seat-meta">
            <span className="match-seat-chip">{player ? cardName : "Player card pending"}</span>
            <span className="match-seat-chip">{player ? emblemName : "Emblem pending"}</span>
          </div>
        </div>

        <div className="match-seat-rank">
          <p className={cn("text-sm font-black", player ? getRankColor(player.rank) : "text-muted-foreground")}>
            {player ? `${player.isBot ? "Easy bot" : player.rank}` : "Open"}
          </p>
          <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {player ? `${player.elo} elo` : "waiting"}
          </p>
          <div
            className={cn(
              "match-seat-presence",
              player ? "match-seat-presence-ready" : "match-seat-presence-searching",
            )}
          >
            {player ? <Users size={14} /> : <LoaderCircle size={14} className="animate-spin" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function CountdownCard({
  label,
  value,
  urgent = false,
}: {
  label: string;
  value: string;
  urgent?: boolean;
}) {
  return (
    <div className={cn("match-countdown-card", urgent && "match-countdown-card-urgent")}>
      <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-white/55">{label}</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <Clock3 size={16} className={urgent ? "text-destructive" : "text-primary"} />
        <span className={cn("text-3xl font-black tracking-[-0.04em]", urgent ? "text-destructive" : "text-white")}>
          {value}
        </span>
      </div>
    </div>
  );
}

export default function MatchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { openSignIn, openSignUp } = useAuthDialog();
  const mode = (params.get("mode") || "ranked") as MatchMode;
  const { isReady, user, refreshUser, canSave, saveProfile } = useAuth();

  const [lobby, setLobby] = useState<BackendLobby | null>(null);
  const [practiceSolved, setPracticeSolved] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [rematchKey, setRematchKey] = useState(0);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [localHintBalance, setLocalHintBalance] = useState(0);
  const [hintUnlocked, setHintUnlocked] = useState(false);
  const [hintSaving, setHintSaving] = useState(false);
  const [solvePending, setSolvePending] = useState(false);
  const [exitPending, setExitPending] = useState(false);
  const [resultsSnapshot, setResultsSnapshot] = useState<BackendLobby | null>(null);

  const readyTimeoutRef = useRef<number | null>(null);
  const progressTimeoutRef = useRef<number | null>(null);
  const lastSubmissionRef = useRef<PuzzleSubmission | null>(null);
  const readySentLobbyIdRef = useRef<string | null>(null);
  const completedRoundRef = useRef<string | null>(null);

  useEffect(() => {
    setLocalHintBalance(user?.hintBalance ?? 0);
  }, [user?.hintBalance, user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !canSave || !isReady || !user) return;

    let cancelled = false;
    setLobby(null);
    setLobbyError(null);
    setPracticeSolved(false);
    setHintUnlocked(false);
    setSolvePending(false);
    setResultsSnapshot(null);
    readySentLobbyIdRef.current = null;
    completedRoundRef.current = null;

    void supabaseApi
      .joinLobby(mode)
      .then((response) => {
        if (!cancelled) {
          setLobby(response.lobby);
          setLobbyError(null);
        }
      })
      .catch((error) => {
        console.error("Failed to join lobby", error);
        if (!cancelled) {
          setLobbyError(error instanceof Error ? error.message : "Could not join matchmaking.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canSave, isReady, mode, rematchKey, user]);

  useEffect(() => {
    if (!lobby?.id) return;
    return subscribeToLobby(lobby.id, setLobby);
  }, [lobby?.id]);

  useEffect(() => {
    if (!lobby?.id) return;

    const intervalMs = lobby.status === "filling" ? 2000 : 1000;
    const interval = window.setInterval(() => {
      void supabaseApi
        .syncLobby(lobby.id)
        .then((response) => setLobby(response.lobby))
        .catch((error) => {
          console.error("Failed to sync lobby", error);
        });
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [lobby?.id, lobby?.status]);

  useEffect(() => {
    if (!lobby || lobby.status !== "ready") return;
    if (readySentLobbyIdRef.current === lobby.id) return;

    readyTimeoutRef.current = window.setTimeout(() => {
      readySentLobbyIdRef.current = lobby.id;
      void supabaseApi
        .readyLobby(lobby.id)
        .then((response) => setLobby(response.lobby))
        .catch((error) => {
          readySentLobbyIdRef.current = null;
          console.error("Failed to ready lobby", error);
        });
    }, 1200);

    return () => {
      if (readyTimeoutRef.current !== null) {
        window.clearTimeout(readyTimeoutRef.current);
      }
    };
  }, [lobby]);

  useEffect(() => {
    if (lobby?.status !== "practice" && lobby?.status !== "live" && lobby?.status !== "intermission") return;

    const interval = window.setInterval(() => {
      setClockNow(Date.now());
    }, 250);

    return () => window.clearInterval(interval);
  }, [lobby?.status]);

  useEffect(() => {
    const completedAt = lobby?.results?.completedAt ?? null;
    if (!completedAt || completedRoundRef.current === completedAt) return;
    completedRoundRef.current = completedAt;
    setHintUnlocked(false);
    void refreshUser();
  }, [lobby, refreshUser]);

  useEffect(() => {
    if (lobby?.status !== "live") {
      setSolvePending(false);
    }
  }, [lobby?.status]);

  useEffect(() => {
    if (lobby?.status !== "practice") {
      setPracticeSolved(false);
    }
  }, [lobby?.status]);

  useEffect(() => {
    if (!lobby) return;
    if ((lobby.status === "intermission" || lobby.status === "complete") && lobby.results?.standings?.length) {
      setResultsSnapshot(lobby);
    }
  }, [lobby]);

  useEffect(() => {
    setHintUnlocked(false);
  }, [lobby?.selection?.selectedAt]);

  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current !== null) {
        window.clearTimeout(progressTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!lobby || !user) return;
    if (lobby.players.some((player) => player.playerId === user.id)) return;
    navigate("/play");
  }, [lobby, navigate, user]);

  const activeResultsLobby = useMemo(() => {
    if (lobby && (lobby.status === "intermission" || lobby.status === "complete")) {
      return lobby;
    }

    if (!resultsSnapshot?.intermissionEndsAt) {
      return null;
    }

    const endsAt = new Date(resultsSnapshot.intermissionEndsAt).getTime();
    return clockNow <= endsAt + 750 ? resultsSnapshot : null;
  }, [clockNow, lobby, resultsSnapshot]);

  const resultsSourceLobby = activeResultsLobby ?? lobby;
  const selfPlayer = lobby?.players.find((player) => player.playerId === user?.id) ?? null;
  const selectionMeta = lobby?.selection?.meta ?? null;
  const rapidFire = lobby?.selection ? isRapidFirePuzzleType(lobby.selection.puzzleType) : false;
  const practiceTimeLeft = Math.max(
    0,
    Math.ceil(((lobby?.practiceEndsAt ? new Date(lobby.practiceEndsAt).getTime() : 0) - clockNow) / 1000),
  );
  const liveTimeLeft = Math.max(
    0,
    Math.ceil(((lobby?.liveEndsAt ? new Date(lobby.liveEndsAt).getTime() : 0) - clockNow) / 1000),
  );
  const intermissionTimeLeft = Math.max(
    0,
    Math.ceil(((resultsSourceLobby?.intermissionEndsAt ? new Date(resultsSourceLobby.intermissionEndsAt).getTime() : 0) - clockNow) / 1000),
  );
  const standings = useMemo(() => rankPlayers(lobby?.players ?? [], rapidFire), [lobby?.players, rapidFire]);
  const resultsRapidFire = resultsSourceLobby?.selection ? isRapidFirePuzzleType(resultsSourceLobby.selection.puzzleType) : rapidFire;
  const resultsStandings = useMemo(
    () => rankPlayers(resultsSourceLobby?.players ?? [], resultsRapidFire),
    [resultsRapidFire, resultsSourceLobby?.players],
  );
  const leaderboard = resultsSourceLobby?.results?.standings ?? resultsStandings.map((player, index) => ({
    playerId: player.playerId,
    username: player.username,
    progress: player.progress,
    solvedAtMs: player.solvedAtMs,
    rank: index + 1,
    completions: player.completions,
    score: player.score,
    reward: player.reward ?? { xp: 0, coins: 0, elo: 0 },
    isBot: player.isBot,
  }));
  const selfStanding = leaderboard.find((entry) => entry.playerId === user?.id) ?? null;
  const resultsSelectionMeta = resultsSourceLobby?.selection?.meta ?? selectionMeta;
  const activeSeed = lobby?.status === "live"
    ? Number(selfPlayer?.currentSeed ?? lobby?.selection?.liveSeed ?? 0)
    : Number(lobby?.selection?.practiceSeed ?? 0);
  const helpText = lobby?.selection ? getPuzzleHelpText(lobby.selection.puzzleType) : "";
  const hintText = lobby?.selection ? getPuzzleHintText(lobby.selection.puzzleType) : "";

  function queueProgressSubmission(stage: "practice" | "live", submission: PuzzleSubmission, progress: number) {
    if (!lobby) return;
    lastSubmissionRef.current = submission;

    if (progressTimeoutRef.current !== null) {
      window.clearTimeout(progressTimeoutRef.current);
    }

    progressTimeoutRef.current = window.setTimeout(() => {
      void supabaseApi
        .submitProgress(lobby.id, stage, submission)
        .then((response) => setLobby(response.lobby))
        .catch((error) => {
          console.error("Failed to submit progress", error);
        });
    }, 160);
  }

  function handleLiveSolve() {
    if (!lobby || !lastSubmissionRef.current || solvePending) return;

    setSolvePending(true);
    void supabaseApi
      .submitSolve(lobby.id, "live", lastSubmissionRef.current)
      .then((response) => setLobby(response.lobby))
      .catch((error) => {
        console.error("Failed to submit solve", error);
      })
      .finally(() => {
        setSolvePending(false);
      });
  }

  async function handleHintUnlock() {
    if (!user || hintUnlocked || localHintBalance <= 0 || hintSaving) return;

    const nextBalance = Math.max(0, localHintBalance - 1);
    setHintUnlocked(true);
    setLocalHintBalance(nextBalance);
    setHintSaving(true);

    try {
      await saveProfile({ hintBalance: nextBalance });
    } catch (error) {
      console.error("Failed to save hint balance", error);
    } finally {
      setHintSaving(false);
    }
  }

  async function exitLobby() {
    if (!lobby || exitPending) return;
    setExitPending(true);

    try {
      await supabaseApi.voteNextRound(lobby.id, "exit");
    } catch (error) {
      console.error("Failed to exit lobby", error);
    } finally {
      navigate("/");
    }
  }

  function renderFullscreenArena(stage: "practice" | "live") {
    if (!lobby?.selection || !selfPlayer) {
      return null;
    }

    const isPractice = stage === "practice";
    const timeLeft = isPractice ? practiceTimeLeft : liveTimeLeft;
    const disabled = isPractice ? false : solvePending || (!rapidFire && selfPlayer.solvedAtMs !== null) || timeLeft <= 0;
    const liveScoreLine = rapidFire
      ? `Score ${selfPlayer.score} | Clears ${selfPlayer.completions} | New personal boards stop rolling at 0:05.`
      : selfPlayer.solvedAtMs !== null
        ? `Solve locked at ${formatSolveTime(selfPlayer.solvedAtMs)}.`
        : `First full solve wins tiebreaks.`;

    return (
      <div className="match-immersive-screen">
        <div className="match-immersive-shell">
          <div className="match-immersive-top">
            <div className="match-immersive-copy">
              <p className="font-hud text-[11px] uppercase tracking-[0.24em] text-primary">
                {isPractice ? "Practice Arena" : rapidFire ? "Live Arena - Rapid Fire" : "Live Arena"}
              </p>
              <h1 className="match-immersive-title">{selectionMeta?.label}</h1>
              <p className="match-immersive-help">{helpText}</p>
              <p className="match-immersive-rule">
                {isPractice
                  ? practiceSolved
                    ? "Practice clear recorded. Stay sharp for the live seed."
                    : "Use practice to learn the rule. The live match uses the same type with a fresh layout."
                  : liveScoreLine}
              </p>
            </div>
            <CountdownCard
              label={isPractice ? "Practice Timer" : "Match Timer"}
              value={formatTime(timeLeft)}
              urgent={isPractice ? timeLeft <= 3 : timeLeft <= 10}
            />
          </div>

          <div className="match-immersive-utility">
            {localHintBalance > 0 ? (
              <button
                type="button"
                onClick={() => void handleHintUnlock()}
                disabled={hintUnlocked || hintSaving}
                className={cn("match-hint-button", hintUnlocked && "match-hint-button-active")}
              >
                <Lightbulb size={18} />
                <span>
                  {hintUnlocked ? "Hint Unlocked" : `Use Hint (${localHintBalance})`}
                </span>
              </button>
            ) : null}
            {hintUnlocked ? <div className="match-hint-panel">{hintText}</div> : null}
          </div>

          <div className="match-immersive-board">
            <MatchPuzzleBoard
              key={`${stage}-${activeSeed}`}
              puzzleType={lobby.selection.puzzleType}
              seed={activeSeed}
              difficulty={lobby.selection.difficulty}
              isPractice={isPractice}
              disabled={disabled}
              onProgress={() => undefined}
              onStateChange={(submission, progress) => queueProgressSubmission(stage, submission, progress)}
              onSolve={isPractice ? () => setPracticeSolved(true) : handleLiveSolve}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page-screen">
        <div className="page-stack">
          <PageHeader
            eyebrow="Arena Uplink"
            title="Backend Required"
            subtitle="Local mock mode cannot host matchmaking sessions."
          />
          <section className="command-panel flex flex-col gap-4 p-5">
            <div className="command-panel-soft flex items-start gap-3 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-destructive/30 bg-destructive/10 text-destructive">
                <WifiOff size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black">Match service unavailable</p>
                <p className="mt-1 text-sm text-muted-foreground">{supabaseConfigErrorMessage}</p>
              </div>
            </div>
            <Button onClick={() => navigate("/play")} variant="outline" size="lg" className="w-full">
              <Home size={16} />
              Back to Play
            </Button>
          </section>
        </div>
      </div>
    );
  }

  if (!canSave) {
    return (
      <div className="page-screen">
        <div className="page-stack">
          <PageHeader
            eyebrow="Account Deck"
            title="Account Required"
            subtitle="Guest sessions can browse the arena, but ranked results only persist to a saved account."
          />
          <section className="command-panel grid gap-3 p-5 sm:grid-cols-3">
            <Button onClick={openSignUp} variant="play" size="lg" className="w-full">
              Create Account
            </Button>
            <Button onClick={openSignIn} variant="outline" size="lg" className="w-full">
              Sign In
            </Button>
            <Button onClick={() => navigate("/play")} variant="outline" size="lg" className="w-full">
              <UserRoundPlus size={16} />
              Back
            </Button>
          </section>
        </div>
      </div>
    );
  }

  if (!isReady || !user || !lobby) {
    return (
      <div className="page-screen">
        <div className="page-stack">
          <PageHeader
            eyebrow="Arena Sync"
            title="Preparing Session"
            subtitle="Linking account, queue, and round telemetry."
          />
          <section className="command-panel flex min-h-[320px] items-center justify-center p-5">
            {lobbyError ? (
              <div className="command-panel-soft flex max-w-xl flex-col gap-4 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
                  <WifiOff size={22} />
                </div>
                <div>
                  <p className="text-lg font-black">Arena sync failed</p>
                  <p className="mt-2 text-sm text-muted-foreground">{lobbyError}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button onClick={() => setRematchKey((current) => current + 1)} variant="play" size="lg" className="w-full">
                    Retry Matchmaking
                  </Button>
                  <Button onClick={() => navigate("/play")} variant="outline" size="lg" className="w-full">
                    <Home size={16} />
                    Back to Play
                  </Button>
                </div>
              </div>
            ) : (
              <div className="command-panel-soft flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                  <LoaderCircle size={24} className="animate-spin" />
                </div>
                <div>
                  <p className="text-lg font-black">Command deck booting</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Reserving your seat in the {formatMode(mode)} arena.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  if (lobby.status === "practice") {
    return renderFullscreenArena("practice");
  }

  if (lobby.status === "live") {
    return renderFullscreenArena("live");
  }

  if (activeResultsLobby) {
    return (
      <div className="match-results-screen">
        <div className="match-results-shell">
          <div className="match-results-top">
            <div>
              <p className="font-hud text-[11px] uppercase tracking-[0.24em] text-primary">Match Leaderboard</p>
              <h1 className="match-results-title">{resultsSelectionMeta?.label ?? "Round Complete"}</h1>
              <p className="match-results-subtitle">
                Next match loads in {intermissionTimeLeft}s. Exit returns you to the dashboard.
              </p>
            </div>
            <CountdownCard label="Next Match" value={`${intermissionTimeLeft}s`} urgent={intermissionTimeLeft <= 3} />
          </div>

          <div className="match-results-table">
            <div className="match-results-row match-results-head">
              <span>Place</span>
              <span>Player</span>
              <span>Solve Time</span>
              <span>Score</span>
              <span>Clears</span>
            </div>
            {leaderboard.slice(0, 4).map((entry) => (
              <div
                key={entry.playerId}
                className={cn("match-results-row", entry.playerId === user.id && "match-results-row-self")}
              >
                <span className="font-black text-primary">{formatPlacement(entry.rank)}</span>
                <span className="truncate">
                  {entry.username}
                  {entry.playerId === user.id ? " (You)" : entry.isBot ? " [Bot]" : ""}
                </span>
                <span>{formatSolveTime(entry.solvedAtMs)}</span>
                <span>{resultsRapidFire ? entry.score : entry.progress}</span>
                <span>{resultsRapidFire ? entry.completions : entry.solvedAtMs !== null ? 1 : 0}</span>
              </div>
            ))}
          </div>

          <div className="match-results-summary">
            <div className="command-panel-soft p-4">
              <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">Your Finish</p>
              <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
                {selfStanding ? formatPlacement(selfStanding.rank) : "Complete"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {resultsRapidFire
                  ? `Fastest clear ${formatSolveTime(selfStanding?.solvedAtMs ?? null)} | ${selfStanding?.completions ?? 0} clears logged.`
                  : `Solve time ${formatSolveTime(selfStanding?.solvedAtMs ?? null)}.`}
              </p>
            </div>
            <Button onClick={() => void exitLobby()} variant="outline" size="lg" className="w-full" disabled={exitPending}>
              <DoorOpen size={16} />
              Exit to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (lobby.status === "filling") {
    const slotCards = Array.from({ length: lobby.maxPlayers }, (_, index) => lobby.players[index] ?? null);

    return (
      <div className="page-screen">
        <div className="page-stack">
          <PageHeader
            eyebrow="Arena Queue"
            title="Filling Lobby"
            subtitle="The room launches into practice as soon as four seats are locked."
          />
          <section className="command-panel grid gap-3 p-5 sm:grid-cols-2">
            {slotCards.map((player, index) => (
              <LobbySeat
                key={player?.playerId ?? `slot-${index}`}
                player={player}
                seatLabel={`Seat ${index + 1}`}
                isSelf={player?.playerId === user.id}
              />
            ))}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Puzzle Lock"
          title={selectionMeta?.label ?? "Loading"}
          subtitle="The puzzle type is locked. Practice takes over the screen in a moment."
        />
        <section className="command-panel grid gap-3 p-5 sm:grid-cols-2">
          {lobby.players.map((player, index) => (
            <LobbySeat
              key={player.playerId}
              player={player}
              seatLabel={`Seat ${index + 1}`}
              isSelf={player.playerId === user.id}
            />
          ))}
        </section>
      </div>
    </div>
  );
}
