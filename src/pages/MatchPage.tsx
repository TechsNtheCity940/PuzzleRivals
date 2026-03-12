import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Home, RotateCcw, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import MatchPuzzleBoard from "@/components/match/MatchPuzzleBoard";
import { subscribeToLobby, supabaseApi } from "@/lib/api-client";
import type { BackendLobby, BackendLobbyPlayer, MatchMode, PuzzleSubmission } from "@/lib/backend";
import { getRankColor } from "@/lib/seed-data";
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

function rankPlayers(players: BackendLobbyPlayer[]) {
  return [...players].sort((left, right) => {
    if (right.progress !== left.progress) return right.progress - left.progress;
    if (left.solvedAtMs === null && right.solvedAtMs === null) return 0;
    if (left.solvedAtMs === null) return 1;
    if (right.solvedAtMs === null) return -1;
    return left.solvedAtMs - right.solvedAtMs;
  });
}

export default function MatchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = (params.get("mode") || "ranked") as MatchMode;
  const { isReady, user, refreshUser } = useAuth();

  const [lobby, setLobby] = useState<BackendLobby | null>(null);
  const [practiceSolved, setPracticeSolved] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [optimisticProgress, setOptimisticProgress] = useState(0);
  const [rematchKey, setRematchKey] = useState(0);
  const [votePending, setVotePending] = useState<"continue" | "exit" | null>(null);

  const readyTimeoutRef = useRef<number | null>(null);
  const progressTimeoutRef = useRef<number | null>(null);
  const lastSubmissionRef = useRef<PuzzleSubmission | null>(null);
  const readySentLobbyIdRef = useRef<string | null>(null);
  const completedRoundRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isReady || !user) return;

    let cancelled = false;
    setLobby(null);
    setPracticeSolved(false);
    setOptimisticProgress(0);
    readySentLobbyIdRef.current = null;
    completedRoundRef.current = null;

    void supabaseApi
      .joinLobby(mode)
      .then((response) => {
        if (!cancelled) {
          setLobby(response.lobby);
        }
      })
      .catch((error) => {
        console.error("Failed to join lobby", error);
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, mode, rematchKey, user]);

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
    }, 2200);

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
    void refreshUser();
  }, [lobby, refreshUser]);

  useEffect(() => {
    if (lobby?.status !== "live") {
      setOptimisticProgress(0);
    }
  }, [lobby?.status]);

  useEffect(() => {
    if (lobby?.status !== "practice") {
      setPracticeSolved(false);
    }
  }, [lobby?.status]);

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

  const selfPlayer = lobby?.players.find((player) => player.playerId === user?.id) ?? null;
  const rivals = useMemo(
    () => lobby?.players.filter((player) => player.playerId !== user?.id) ?? [],
    [lobby?.players, user?.id],
  );
  const standings = useMemo(() => rankPlayers(lobby?.players ?? []), [lobby?.players]);
  const playerRank = standings.findIndex((player) => player.playerId === user?.id) + 1 || standings.length;
  const selectionMeta = lobby?.selection?.meta ?? null;
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
    Math.ceil(((lobby?.intermissionEndsAt ? new Date(lobby.intermissionEndsAt).getTime() : 0) - clockNow) / 1000),
  );

  function queueProgressSubmission(stage: "practice" | "live", submission: PuzzleSubmission, progress: number) {
    if (!lobby) return;
    lastSubmissionRef.current = submission;
    if (stage === "live") {
      setOptimisticProgress(progress);
    }

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
    }, 180);
  }

  function handleLiveSolve() {
    if (!lobby || !lastSubmissionRef.current) return;

    void supabaseApi
      .submitSolve(lobby.id, "live", lastSubmissionRef.current)
      .then((response) => setLobby(response.lobby))
      .catch((error) => {
        console.error("Failed to submit solve", error);
      });
  }

  async function submitNextRoundVote(vote: "continue" | "exit") {
    if (!lobby) return;
    setVotePending(vote);

    try {
      const response = await supabaseApi.voteNextRound(lobby.id, vote);
      setLobby(response.lobby);

      if (vote === "exit") {
        navigate("/play");
      }
    } finally {
      setVotePending(null);
    }
  }

  if (!isReady || !user || !lobby) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="panel w-full max-w-md text-center">
          <p className="hud-label text-primary">Connecting</p>
          <h1 className="mt-2 text-2xl font-black">Preparing your arena session</h1>
        </div>
      </div>
    );
  }

  if (lobby.status === "filling") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <div className="panel w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="hud-label text-primary">Matchmaking Lobby</p>
            <h1 className="mt-1 text-3xl font-black">Filling Lobby</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Standard matches wait for 4 total players, then the lobby gets one randomly generated puzzle type.
            </p>
          </div>

          <div className="rounded-[28px] bg-background/35 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-hud text-xs uppercase tracking-[0.18em] text-muted-foreground">Players Joined</span>
              <span className="text-lg font-black text-primary">{lobby.players.length}/4</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, index) => lobby.players[index] ?? null).map((player, index) => (
                <div
                  key={player?.playerId ?? `open-${index}`}
                  className={`rounded-3xl border p-4 transition-all ${
                    player
                      ? "border-primary/20 bg-primary/10"
                      : "border-dashed border-border bg-background/20 text-muted-foreground"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-lg font-black">
                    {player ? player.username[0] : "?"}
                  </div>
                  <p className="mt-3 text-sm font-bold">{player ? player.username : "Searching..."}</p>
                  <p className={`mt-1 text-[11px] font-hud uppercase tracking-[0.16em] ${
                    player ? getRankColor(player.rank) : "text-muted-foreground"
                  }`}>
                    {player ? `${player.rank} ${player.elo}` : "open slot"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] bg-card/70 p-4 text-center">
            <p className="font-hud text-xs uppercase tracking-[0.18em] text-muted-foreground">Queue Rule</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No player-selected puzzle type. The lobby decides together once the room is full.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (lobby.status === "ready" && selectionMeta) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="panel w-full max-w-md space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="hud-label text-primary">Lobby Full</p>
              <h1 className="mt-1 text-2xl font-black">Puzzle Selected</h1>
            </div>
            <div className="rounded-2xl bg-primary/10 px-3 py-2 text-right">
              <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">Lobby</p>
              <p className="text-sm font-black">{lobby.id.slice(0, 8)}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {lobby.players.map((player) => (
              <div key={player.playerId} className="rounded-2xl bg-background/35 p-3 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-card text-sm font-black">
                  {player.username[0]}
                </div>
                <p className="mt-2 truncate text-[11px] font-bold">{player.username}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[32px] border border-primary/20 bg-primary/10 p-6 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-play text-5xl text-primary-foreground">
              {selectionMeta.icon}
            </div>
            <p className="mt-4 text-2xl font-black">{selectionMeta.label}</p>
            <p className="mt-2 text-sm text-muted-foreground">{selectionMeta.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-background/35 p-3">
                <p className="hud-label">Practice</p>
                <p className="mt-1 text-sm font-black">12s warm-up</p>
              </div>
              <div className="rounded-2xl bg-background/35 p-3">
                <p className="hud-label">Live</p>
                <p className="mt-1 text-sm font-black">new generated version</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (lobby.status === "practice" && lobby.selection) {
    return (
      <div className="flex min-h-screen flex-col px-4 py-6">
        <div className="panel">
          <div className="flex items-center justify-between">
            <div>
              <p className="hud-label text-primary">Practice Round</p>
              <h1 className="mt-1 text-2xl font-black">{lobby.selection.meta.label}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{lobby.selection.meta.description}</p>
            </div>
            <div className="rounded-2xl bg-primary/10 px-4 py-3 text-center">
              <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">Time Left</p>
              <p className="text-3xl font-black text-primary">{practiceTimeLeft}</p>
            </div>
          </div>
          {practiceSolved && (
            <div className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
              Practice solve locked in. A different generated version loads when the timer ends.
            </div>
          )}
        </div>

        <div className="panel mt-4 flex-1">
          <MatchPuzzleBoard
            key={`practice-${lobby.selection.practiceSeed}`}
            puzzleType={lobby.selection.puzzleType}
            seed={lobby.selection.practiceSeed}
            difficulty={lobby.selection.difficulty}
            isPractice
            disabled={false}
            onProgress={() => {}}
            onStateChange={(submission, progress) => queueProgressSubmission("practice", submission, progress)}
            onSolve={() => setPracticeSolved(true)}
          />
        </div>
      </div>
    );
  }

  if (lobby.status === "intermission") {
    const results = lobby.results?.standings ?? standings.map((player, index) => ({
      playerId: player.playerId,
      username: player.username,
      progress: player.progress,
      solvedAtMs: player.solvedAtMs,
      rank: index + 1,
      reward: player.reward ?? { xp: 90, coins: 140, elo: -16 },
      isBot: player.isBot,
    }));
    const selfResult = results.find((entry) => entry.playerId === user.id);

    return (
      <div className="flex min-h-screen flex-col justify-center px-4 py-6">
        <div className="space-y-4">
          <div className="text-center">
            <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              (selfResult?.rank ?? playerRank) === 1 ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
            }`}>
              <Sparkles size={30} />
            </div>
            <p className="mt-4 text-3xl font-black">Rank #{selfResult?.rank ?? playerRank}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectionMeta?.label} live match finished with a fresh generated seed.
            </p>
            <div className="mt-4 inline-flex rounded-2xl bg-background/35 px-4 py-3 text-center">
              <div>
                <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Decision Timer</p>
                <p className="text-2xl font-black text-primary">{intermissionTimeLeft}s</p>
              </div>
            </div>
          </div>

          <div className="panel space-y-3">
            {results.map((entry) => (
              <div
                key={entry.playerId}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                  entry.playerId === user.id ? "bg-primary/10" : "bg-background/30"
                }`}
              >
                <div className="w-10 text-center font-hud text-sm font-semibold">#{entry.rank}</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card text-sm font-black">
                  {entry.username[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{entry.username}{entry.playerId === user.id ? " (You)" : ""}</p>
                  <p className="text-[11px] font-hud uppercase tracking-[0.16em] text-muted-foreground">
                    {entry.progress}% complete - {formatSolveTime(entry.solvedAtMs)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="panel space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">XP Earned</span>
              <span className="font-black">+{selfResult?.reward.xp ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Coins Earned</span>
              <span className="font-black">+{selfResult?.reward.coins ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ELO Change</span>
              <span className={(selfResult?.reward.elo ?? 0) >= 0 ? "font-black text-primary" : "font-black text-destructive"}>
                {(selfResult?.reward.elo ?? 0) >= 0 ? "+" : ""}{selfResult?.reward.elo ?? 0}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => void submitNextRoundVote("continue")}
              variant="play"
              size="lg"
              className="flex-1"
              disabled={votePending !== null}
            >
              <RotateCcw size={16} />
              Next Round
            </Button>
            <Button
              onClick={() => void submitNextRoundVote("exit")}
              variant="outline"
              size="lg"
              disabled={votePending !== null}
            >
              <Share2 size={16} />
              Exit Lobby
            </Button>
          </div>

          <Button onClick={() => setRematchKey((current) => current + 1)} variant="outline" size="lg" className="w-full">
            <Home size={16} />
            Find New Lobby
          </Button>
        </div>
      </div>
    );
  }

  if (!lobby.selection || !selfPlayer) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col px-4 py-4">
      <div className="panel space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{lobby.selection.meta.icon}</span>
            <div>
              <p className="hud-label">Live Match</p>
              <p className="text-sm font-bold">{lobby.selection.meta.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className={liveTimeLeft <= 10 ? "text-destructive" : "text-primary"} />
            <span className={`font-hud text-2xl font-bold ${liveTimeLeft <= 10 ? "text-destructive" : "text-primary"}`}>
              {formatTime(liveTimeLeft)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2">
            <span className="w-20 truncate text-xs font-hud uppercase tracking-[0.14em] text-muted-foreground">You</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${Math.max(selfPlayer.progress, optimisticProgress)}%` }} />
            </div>
            <span className="w-10 text-right text-xs font-hud text-primary">{Math.round(Math.max(selfPlayer.progress, optimisticProgress))}%</span>
          </div>

          {rivals.map((rival) => (
            <div key={rival.playerId} className="flex items-center gap-2 rounded-2xl bg-background/30 px-3 py-2">
              <span className="w-20 truncate text-xs font-hud uppercase tracking-[0.14em] text-muted-foreground">
                {rival.username}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${rival.progress}%` }} />
              </div>
              <span className="w-10 text-right text-xs font-hud text-muted-foreground">{Math.round(rival.progress)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel mt-4 flex-1">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="hud-label">New Live Variation</p>
            <p className="mt-1 text-lg font-black">Same puzzle type, new generated layout</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Practice and live always share the puzzle type but never the exact same seed.
            </p>
          </div>
          <div className="rounded-2xl bg-background/35 px-3 py-2 text-center">
            <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Players</p>
            <p className="text-lg font-black">{lobby.players.length}</p>
          </div>
        </div>

        <MatchPuzzleBoard
          key={`live-${lobby.selection.liveSeed}`}
          puzzleType={lobby.selection.puzzleType}
          seed={lobby.selection.liveSeed}
          difficulty={lobby.selection.difficulty}
          isPractice={false}
          disabled={selfPlayer.solvedAtMs !== null}
          onProgress={() => {}}
          onStateChange={(submission, progress) => queueProgressSubmission("live", submission, progress)}
          onSolve={handleLiveSolve}
        />
      </div>
    </div>
  );
}
