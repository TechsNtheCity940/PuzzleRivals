import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Clock3,
  Home,
  LoaderCircle,
  RotateCcw,
  ScanSearch,
  Share2,
  Sparkles,
  Trophy,
  UserRoundPlus,
  Users,
  WifiOff,
} from "lucide-react";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import MatchPuzzleBoard from "@/components/match/MatchPuzzleBoard";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { Button } from "@/components/ui/button";
import { subscribeToLobby, supabaseApi } from "@/lib/api-client";
import type { BackendLobby, BackendLobbyPlayer, MatchMode, PuzzleSubmission } from "@/lib/backend";
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

function rankPlayers(players: BackendLobbyPlayer[]) {
  return [...players].sort((left, right) => {
    if (right.progress !== left.progress) return right.progress - left.progress;
    if (left.solvedAtMs === null && right.solvedAtMs === null) return 0;
    if (left.solvedAtMs === null) return 1;
    if (right.solvedAtMs === null) return -1;
    return left.solvedAtMs - right.solvedAtMs;
  });
}

type StageTone = "queue" | "warning" | "practice" | "live" | "intermission";
type ProgressTone = "self" | "rival" | "practice";

function StageChip({ label, tone }: { label: string; tone: StageTone }) {
  return <span className={cn("match-stage-chip", `match-stage-chip-${tone}`)}>{label}</span>;
}

function TimerCluster({
  label,
  value,
  tone,
  urgent = false,
}: {
  label: string;
  value: string;
  tone: StageTone;
  urgent?: boolean;
}) {
  return (
    <div className={cn("match-timer-cluster", `match-timer-cluster-${tone}`, urgent && "glow-threat")}>
      <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        <Clock3 size={16} className={urgent ? "text-destructive" : "text-primary"} />
        <span className={cn("text-2xl font-black tracking-tight", urgent ? "text-destructive" : "text-white")}>{value}</span>
      </div>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  accent = false,
  className,
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("compact-metric min-h-[66px]", className)}>
      <span className="hud-label">{label}</span>
      <span className={cn("text-sm font-black leading-tight", accent && "text-primary")}>{value}</span>
    </div>
  );
}

function ProgressLane({
  label,
  detail,
  progress,
  tone,
  highlight = false,
}: {
  label: string;
  detail: string;
  progress: number;
  tone: ProgressTone;
  highlight?: boolean;
}) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className={cn("rounded-[24px] border px-3 py-3", highlight ? "border-primary/18 bg-primary/10" : "border-white/10 bg-black/10")}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{label}</p>
          <p className="truncate font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{detail}</p>
        </div>
        <span className={cn("text-xs font-hud font-semibold uppercase tracking-[0.16em]", highlight ? "text-primary" : "text-muted-foreground")}>
          {clampedProgress}%
        </span>
      </div>
      <div className="match-progress-track">
        <motion.div
          className={cn("match-progress-fill", `match-progress-fill-${tone}`)}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function QueuePlayerTile({
  player,
  slotLabel,
  isSelf,
}: {
  player: BackendLobbyPlayer | null;
  slotLabel: string;
  isSelf: boolean;
}) {
  return (
    <PuzzleTileButton
      icon={player ? Users : ScanSearch}
      title={player ? `${player.username}${isSelf ? " (You)" : ""}` : "Searching..."}
      description={player ? `${player.rank.toUpperCase()} • ${player.elo} ELO` : "Open slot waiting for a rival"}
      active={Boolean(player)}
      disabled
      right={
        <div className="text-right">
          <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{slotLabel}</p>
          <p className={cn("text-xs font-black", player ? getRankColor(player.rank) : "text-muted-foreground")}>
            {player ? "Locked" : "Standby"}
          </p>
        </div>
      }
      className={cn("min-h-[94px]", !player && "opacity-90")}
    />
  );
}

export default function MatchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { openSignIn, openSignUp } = useAuthDialog();
  const mode = (params.get("mode") || "ranked") as MatchMode;
  const { isReady, user, refreshUser, canSave } = useAuth();

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
    if (!isSupabaseConfigured || !canSave || !isReady || !user) return;

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

  const screenShellClassName = "page-screen";
  const screenStackClassName = "page-stack";

  if (!isSupabaseConfigured) {
    return (
      <div className={screenShellClassName}>
        <div className={screenStackClassName}>
          <PageHeader
            eyebrow="Arena Uplink"
            title="Backend Required"
            subtitle="Local mock mode cannot host matchmaking sessions."
            right={<StageChip label="Offline" tone="warning" />}
          />

          <section className="command-panel flex min-h-0 flex-1 flex-col justify-between gap-3 p-3">
            <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
              <div className="command-panel-soft flex items-start gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-destructive/30 bg-destructive/10 text-destructive">
                  <WifiOff size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black">Match service unavailable</p>
                  <p className="mt-1 text-sm text-muted-foreground">{supabaseConfigErrorMessage}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CompactMetric label="Queue" value="Disabled" />
                <CompactMetric label="Mode" value={formatMode(mode)} accent />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => navigate("/play")} variant="play" size="lg" className="w-full">
                <Home size={16} />
                Back to Play
              </Button>
              <div className="command-panel-soft flex items-center justify-center px-4 py-3 text-center text-sm text-muted-foreground">
                Restore the Supabase keys to bring ranked matchmaking back online.
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!canSave) {
    return (
      <div className={screenShellClassName}>
        <div className={screenStackClassName}>
          <PageHeader
            eyebrow="Account Deck"
            title="Account Required"
            subtitle="Guest sessions can browse the arena, but ranked match results only persist to a saved account."
            right={<StageChip label="Locked" tone="warning" />}
          />

          <section className="command-panel flex min-h-0 flex-1 flex-col justify-between gap-3 p-3">
            <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
              <div className="command-panel-soft flex items-start gap-3 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-primary/20 bg-primary/10 text-primary">
                  <UserRoundPlus size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black">Ranked command deck is account-only</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sign in or create an account, then return here to queue live matches, save ELO changes, and track puzzle performance.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CompactMetric label="Queue" value={formatMode(mode)} accent />
                <CompactMetric label="Rewards" value="Saved" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Button onClick={openSignUp} variant="play" size="lg" className="w-full">
                Create Account
              </Button>
              <Button onClick={openSignIn} variant="outline" size="lg" className="w-full">
                Sign In
              </Button>
              <Button onClick={() => navigate("/play")} variant="outline" size="lg" className="w-full">
                <Home size={16} />
                Back
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!isReady || !user || !lobby) {
    return (
      <div className={screenShellClassName}>
        <div className={screenStackClassName}>
          <PageHeader
            eyebrow="Arena Sync"
            title="Preparing Session"
            subtitle="Linking account, queue, and match telemetry before the deck comes online."
            right={<StageChip label="Connecting" tone="queue" />}
          />

          <section className="command-panel flex min-h-0 flex-1 flex-col justify-center gap-3 p-3">
            <div className="command-panel-soft flex flex-col items-center gap-3 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary glow-primary">
                <LoaderCircle size={24} className="animate-spin" />
              </div>
              <div>
                <p className="text-lg font-black">Command deck booting</p>
                <p className="mt-1 text-sm text-muted-foreground">Reserving your seat in the {formatMode(mode)} arena.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (lobby.status === "filling") {
    const slotCards = Array.from({ length: lobby.maxPlayers }, (_, index) => lobby.players[index] ?? null);

    return (
      <div className={screenShellClassName}>
        <div className={screenStackClassName}>
          <PageHeader
            eyebrow="Arena Queue"
            title="Filling Lobby"
            subtitle="Four-player rooms auto-lock a single puzzle type once the deck is full."
            right={<StageChip label={`${lobby.players.length}/${lobby.maxPlayers} Ready`} tone="queue" />}
          />

          <section className="command-panel grid min-h-0 flex-1 grid-rows-[auto_auto_1fr] gap-3 overflow-hidden p-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <CompactMetric label="Mode" value={formatMode(mode)} accent />
              <CompactMetric label="Seats" value={`${lobby.players.length}/${lobby.maxPlayers}`} />
              <CompactMetric label="Puzzle Pick" value="Randomized" />
              <CompactMetric label="Lobby" value={lobby.id.slice(0, 8).toUpperCase()} />
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
              <div className="command-panel-soft p-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/brand/puzzle-rivals-logo.png"
                    alt="Puzzle Rivals"
                    className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
                    draggable={false}
                  />
                  <div className="min-w-0">
                    <p className="hud-label text-primary">Queue Rule</p>
                    <p className="text-sm font-black">No manual puzzle vetoes</p>
                    <p className="mt-1 text-xs text-muted-foreground">The arena assigns one type for everyone the moment the final seat locks.</p>
                  </div>
                </div>
              </div>
              <div className="command-panel-soft flex items-center justify-center px-4 py-3 text-center text-sm text-muted-foreground">
                Keep this screen open. Practice auto-arms as soon as the roster is complete.
              </div>
            </div>

            <div className="grid min-h-0 gap-3 overflow-hidden sm:grid-cols-2">
              {slotCards.map((player, index) => (
                <QueuePlayerTile
                  key={player?.playerId ?? `slot-${index}`}
                  player={player}
                  slotLabel={`Seat ${index + 1}`}
                  isSelf={player?.playerId === user.id}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (lobby.status === "ready" && selectionMeta) {
    return (
      <div className={screenShellClassName}>
        <div className={screenStackClassName}>
          <PageHeader
            eyebrow="Command Deck Armed"
            title="Puzzle Locked"
            subtitle="The lobby has its shared puzzle type. Practice begins automatically in a moment."
            right={<StageChip label="Arming Practice" tone="queue" />}
          />

          <section className="command-panel grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 overflow-hidden p-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="command-panel-soft grid gap-3 p-4 sm:grid-cols-[1.05fr_0.95fr]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] border border-primary/20 bg-gradient-play text-3xl text-primary-foreground glow-primary">
                  {selectionMeta.icon}
                </div>
                <div className="min-w-0">
                  <p className="hud-label text-primary">Selected Type</p>
                  <p className="text-xl font-black">{selectionMeta.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectionMeta.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CompactMetric label="Practice" value="12s warm-up" accent />
                <CompactMetric label="Live Seed" value="Fresh roll" />
                <CompactMetric label="Difficulty" value={`Tier ${lobby.selection.difficulty}`} />
                <CompactMetric label="Lobby" value={lobby.id.slice(0, 8).toUpperCase()} />
              </div>
            </motion.div>

            <div className="grid min-h-0 gap-3 overflow-hidden sm:grid-cols-2">
              {lobby.players.map((player, index) => (
                <QueuePlayerTile key={player.playerId} player={player} slotLabel={`Seat ${index + 1}`} isSelf={player.playerId === user.id} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderArenaStage(stage: "practice" | "live") {
    if (!lobby?.selection || !selfPlayer) {
      return null;
    }

    const isPractice = stage === "practice";
    const timeLeft = isPractice ? practiceTimeLeft : liveTimeLeft;
    const selfProgress = isPractice ? selfPlayer.practiceProgress : Math.max(selfPlayer.progress, optimisticProgress);
    const progressRows = [
      {
        key: selfPlayer.playerId,
        label: "You",
        detail:
          stage === "practice"
            ? practiceSolved
              ? "Warm-up locked"
              : "Practice telemetry"
            : selfPlayer.solvedAtMs !== null
              ? `Solved • ${formatSolveTime(selfPlayer.solvedAtMs)}`
              : "Live telemetry",
        progress: selfProgress,
        tone: isPractice ? ("practice" as const) : ("self" as const),
        highlight: true,
      },
      ...rivals.map((rival) => ({
        key: rival.playerId,
        label: rival.username,
        detail:
          stage === "practice"
            ? `${rival.rank.toUpperCase()} warm-up`
            : rival.solvedAtMs !== null
              ? `Solved • ${formatSolveTime(rival.solvedAtMs)}`
              : `${rival.rank.toUpperCase()} live`,
        progress: isPractice ? rival.practiceProgress : rival.progress,
        tone: isPractice ? ("practice" as const) : ("rival" as const),
        highlight: false,
      })),
    ];

    return (
      <div className={screenShellClassName}>
        <div className={screenStackClassName}>
          <PageHeader
            eyebrow={isPractice ? "Practice Sim" : "Live Arena"}
            title={lobby.selection.meta.label}
            subtitle={isPractice ? "Warm up on the shared type before the live seed drops." : "Same puzzle type, fresh generated layout, live scoring enabled."}
            compact
            right={
              <TimerCluster
                label={isPractice ? "Practice Timer" : "Live Timer"}
                value={formatTime(timeLeft)}
                tone={isPractice ? "practice" : "live"}
                urgent={isPractice ? timeLeft <= 4 : timeLeft <= 10}
              />
            }
          />

          <section className="command-panel grid min-h-0 flex-1 grid-rows-[auto_1fr_auto] gap-3 overflow-hidden p-3">
            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="command-panel-soft p-3">
                <div className="mb-3 flex flex-wrap gap-2">
                  <StageChip label={isPractice ? "Practice" : "Live"} tone={isPractice ? "practice" : "live"} />
                  <StageChip label={formatMode(mode)} tone="queue" />
                  <StageChip label={`Tier ${lobby.selection.difficulty}`} tone="queue" />
                  <StageChip label={`Lobby ${lobby.id.slice(0, 4).toUpperCase()}`} tone="queue" />
                </div>
                <div className="grid gap-2">
                  {progressRows.map((row) => (
                    <ProgressLane key={row.key} label={row.label} detail={row.detail} progress={row.progress} tone={row.tone} highlight={row.highlight} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CompactMetric label="Players" value={`${lobby.players.length}`} accent />
                <CompactMetric label="Current Rank" value={`#${playerRank || 1}`} />
                <CompactMetric label={isPractice ? "Practice Seed" : "Live Seed"} value={isPractice ? "Scout" : "Active"} />
                <CompactMetric label="Puzzle Type" value={lobby.selection.meta.label} className="col-span-2" />
              </div>
            </div>

            <div className="match-board-frame">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="hud-label text-primary">{isPractice ? "Training Surface" : "Combat Surface"}</p>
                  <p className="truncate text-sm font-black">{isPractice ? "Practice seed loaded" : "Live seed loaded"}</p>
                </div>
                <StageChip label={isPractice ? "Warm-Up" : "Scored"} tone={isPractice ? "practice" : "live"} />
              </div>

              <div className="match-board-scroll">
                <MatchPuzzleBoard
                  key={`${stage}-${isPractice ? lobby.selection.practiceSeed : lobby.selection.liveSeed}`}
                  puzzleType={lobby.selection.puzzleType}
                  seed={isPractice ? lobby.selection.practiceSeed : lobby.selection.liveSeed}
                  difficulty={lobby.selection.difficulty}
                  isPractice={isPractice}
                  disabled={isPractice ? false : selfPlayer.solvedAtMs !== null}
                  onProgress={() => {}}
                  onStateChange={(submission, progress) => queueProgressSubmission(stage, submission, progress)}
                  onSolve={isPractice ? () => setPracticeSolved(true) : handleLiveSolve}
                />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="command-panel-soft flex items-center gap-3 p-3">
                <img
                  src="/brand/puzzle-rivals-logo.png"
                  alt="Puzzle Rivals"
                  className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
                  draggable={false}
                />
                <div className="min-w-0">
                  <p className="hud-label text-primary">{isPractice ? "Briefing" : "Context"}</p>
                  <p className="text-sm font-black">{lobby.selection.meta.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isPractice
                      ? "A different generated version goes live when the timer expires."
                      : "Practice and live always share the type, never the exact same seed."}
                  </p>
                </div>
              </div>

              <div className={cn("command-panel-soft p-3", practiceSolved ? "border-primary/20 bg-primary/10" : "")}>
                <p className="hud-label">{isPractice ? "Status" : "Match Rule"}</p>
                <p className={cn("text-sm font-black", practiceSolved && "text-primary")}>
                  {isPractice
                    ? practiceSolved
                      ? "Practice solve locked in"
                      : "Warm-up still open"
                    : selfPlayer.solvedAtMs !== null
                      ? "Solve submitted"
                      : "Score updates live"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isPractice
                    ? "Use the short window to learn the pattern and pacing."
                    : "First full solve and total progress decide the finishing order."}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (lobby.status === "practice" && lobby.selection) {
    return renderArenaStage("practice");
  }

  if (lobby.status === "intermission" || lobby.status === "complete") {
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
    const continueVotes = lobby.players.filter((player) => player.nextRoundVote === "continue").length;

    return (
      <div className={screenShellClassName}>
        <div className={screenStackClassName}>
          <PageHeader
            eyebrow="Results Relay"
            title={`Rank #${selfResult?.rank ?? playerRank}`}
            subtitle={`${selectionMeta?.label ?? "Puzzle"} concluded. Rewards, standings, and the next-round vote are live.`}
            compact
            right={<TimerCluster label="Decision Timer" value={`${intermissionTimeLeft}s`} tone="intermission" urgent={intermissionTimeLeft <= 5} />}
          />

          <section className="command-panel grid min-h-0 flex-1 grid-rows-[auto_1fr_auto] gap-3 overflow-hidden p-3">
            <div className="grid gap-3 sm:grid-cols-4">
              <CompactMetric label="XP" value={`+${selfResult?.reward.xp ?? 0}`} accent />
              <CompactMetric label="Coins" value={`+${selfResult?.reward.coins ?? 0}`} />
              <CompactMetric label="ELO" value={`${(selfResult?.reward.elo ?? 0) >= 0 ? "+" : ""}${selfResult?.reward.elo ?? 0}`} className={(selfResult?.reward.elo ?? 0) >= 0 ? "text-primary" : "text-destructive"} />
              <CompactMetric label="Votes" value={`${continueVotes}/${lobby.players.length} Continue`} />
            </div>

            <div className="grid min-h-0 gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid min-h-0 gap-3 overflow-hidden">
                {results.map((entry) => (
                  <PuzzleTileButton
                    key={entry.playerId}
                    icon={entry.rank === 1 ? Trophy : Sparkles}
                    title={`${entry.username}${entry.playerId === user.id ? " (You)" : ""}`}
                    description={`${entry.progress}% complete • ${formatSolveTime(entry.solvedAtMs)}`}
                    active={entry.playerId === user.id}
                    disabled
                    right={<span className="text-sm font-black text-primary">#{entry.rank}</span>}
                    className="min-h-[82px]"
                  />
                ))}
              </div>

              <div className="grid gap-3">
                <div className="command-panel-soft p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border text-xl",
                        (selfResult?.rank ?? playerRank) === 1 ? "border-primary/30 bg-primary/12 text-primary glow-primary" : "border-accent/30 bg-accent/12 text-accent glow-prestige",
                      )}
                    >
                      <Sparkles size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="hud-label text-primary">Round Summary</p>
                      <p className="text-base font-black">{selectionMeta?.label ?? "Puzzle"} cleared</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(selfResult?.rank ?? playerRank) === 1 ? "First place secured." : "Standings locked for this round."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="command-panel-soft p-4">
                  <p className="hud-label">Next Round Vote</p>
                  <p className="text-sm font-black">{votePending ? "Submitting vote..." : "Stay with this lobby or exit to Play."}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Continue votes: {continueVotes}. Exit immediately returns you to the play deck.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => void submitNextRoundVote("continue")}
                variant="play"
                size="lg"
                className="w-full"
                disabled={votePending !== null}
              >
                <RotateCcw size={16} />
                Next Round
              </Button>
              <Button
                onClick={() => void submitNextRoundVote("exit")}
                variant="outline"
                size="lg"
                className="w-full"
                disabled={votePending !== null}
              >
                <Share2 size={16} />
                Exit Lobby
              </Button>
              <Button onClick={() => setRematchKey((current) => current + 1)} variant="outline" size="lg" className="w-full sm:col-span-2">
                <Home size={16} />
                Find New Lobby
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!lobby.selection || !selfPlayer) {
    return null;
  }

  return renderArenaStage("live");
}
