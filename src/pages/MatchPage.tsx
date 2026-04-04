import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import NeonRivalsGame from "@/components/game/NeonRivalsGame";
import IdentityLoadoutCard from "@/components/cosmetics/IdentityLoadoutCard";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { subscribeToLobby, supabaseApi } from "@/lib/api-client";
import type { NeonRivalsGameState } from "@/game/types";
import type {
  BackendLobby,
  BackendLobbyPlayer,
  MatchMode,
  PuzzleSubmission,
} from "@/lib/backend";
import {
  getPuzzleHintText,
  isRapidFirePuzzleType,
} from "@/lib/match-rules";
import { DEFAULT_AVATAR_ID } from "@/lib/profile-customization";
import { getRankColor } from "@/lib/seed-data";
import {
  isSupabaseConfigured,
  supabaseConfigErrorMessage,
} from "@/lib/supabase-client";
import { cn } from "@/lib/utils";
import { getRankedArenaModeForPuzzleType } from "../../shared/ranked-arena";
import {
  getHeadToHeadArenaModeForPuzzleType,
  HEAD_TO_HEAD_LIVE_TARGET_SCORE,
} from "../../shared/head-to-head-arena";
import { getEffectiveMatchScore, getMatchHintPenalty } from "../../shared/match-hints";
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
  return mode
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatPlacement(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

function rankPlayers(players: BackendLobbyPlayer[], scoreRace: boolean) {
  return [...players].sort((left, right) => {
    const leftSolved =
      left.solvedAtMs !== null || left.progress >= 100 || left.completions > 0;
    const rightSolved =
      right.solvedAtMs !== null ||
      right.progress >= 100 ||
      right.completions > 0;

    if (!scoreRace && leftSolved !== rightSolved) {
      return leftSolved ? -1 : 1;
    }

    if (right.score !== left.score) return right.score - left.score;
    if (scoreRace && right.completions !== left.completions) {
      return right.completions - left.completions;
    }
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
  const emblemName =
    player?.emblemName ?? (player?.isBot ? "Practice Emblem" : "Rank Emblem");

  return (
    <div
      className={cn(
        "match-seat-card",
        player && "match-seat-card-active",
        isSelf && "match-seat-card-self",
      )}
    >
      <div className="match-seat-banner">
        <span className="match-seat-banner-label">{seatLabel}</span>
        <span className="match-seat-banner-status">
          {player ? (player.ready ? "Ready" : "Locking") : "Scanning"}
        </span>
      </div>

      <div className="match-seat-main">
        {player ? (
          <IdentityLoadoutCard
            username={`${player.username}${isSelf ? " (You)" : ""}`}
            subtitle={player.isBot ? "Training rival" : "Live rival"}
            avatarId={player.avatarId ?? DEFAULT_AVATAR_ID}
            frameId={player.frameId}
            playerCardId={player.playerCardId}
            bannerId={player.bannerId}
            emblemId={player.emblemId}
            titleId={player.titleId}
            emblemLabel={emblemName}
            rankLabel={player.isBot ? "Easy Bot" : player.rank}
            variant="match-seat"
            className="match-seat-loadout"
          />
        ) : (
          <div className="match-seat-search-state">
            <div className="match-seat-avatar-search">
              <ScanSearch size={24} />
            </div>
            <div>
              <p className="match-seat-name">Searching...</p>
              <p className="match-seat-subtitle">
                {seatLabel} - waiting for challenger
              </p>
              <div className="match-seat-meta">
                <span className="match-seat-chip">Neon Circuit card queued</span>
                <span className="match-seat-chip">Random rival incoming</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CountdownCard({
  label,
  value,
  urgent = false,
  category,
}: {
  label: string;
  value: string;
  urgent?: boolean;
  category?: string;
}) {
  return (
    <div
      className={cn(
        "match-countdown-card",
        category && `match-countdown-card--${category}`,
        urgent && "match-countdown-card-urgent",
      )}
    >
      <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-white/55">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <Clock3
          size={16}
          className={urgent ? "text-destructive" : "text-primary"}
        />
        <span
          className={cn(
            "text-3xl font-black tracking-[-0.04em]",
            urgent ? "text-destructive" : "text-white",
          )}
        >
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
  const {
    isReady,
    user,
    refreshUser,
    canSave,
    hasSession,
    signOut,
  } = useAuth();
  const accountNeedsSync = hasSession && !user;

  const [lobby, setLobby] = useState<BackendLobby | null>(null);
  const [practiceSolved, setPracticeSolved] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [rematchKey, setRematchKey] = useState(0);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [localHintBalance, setLocalHintBalance] = useState(0);
  const [hintSaving, setHintSaving] = useState(false);
  const [hintPenaltyTotal, setHintPenaltyTotal] = useState(0);
  const [hintUsesThisRound, setHintUsesThisRound] = useState(0);
  const [hintCooldownUntil, setHintCooldownUntil] = useState<number | null>(null);
  const [activeHint, setActiveHint] = useState<{ text: string; expiresAt: number } | null>(null);
  const [solvePending, setSolvePending] = useState(false);
  const [exitPending, setExitPending] = useState(false);
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
  const [resultsSnapshot, setResultsSnapshot] = useState<BackendLobby | null>(
    null,
  );
  const [arenaState, setArenaState] = useState<NeonRivalsGameState | null>(null);

  const readyTimeoutRef = useRef<number | null>(null);
  const progressTimeoutRef = useRef<number | null>(null);
  const lastSubmissionRef = useRef<PuzzleSubmission | null>(null);
  const readySentLobbyIdRef = useRef<string | null>(null);
  const completedRoundRef = useRef<string | null>(null);
  const liveSolveStageKeyRef = useRef<string | null>(null);
  const progressSubmissionKeyRef = useRef<string | null>(null);
  const rejectedStageRef = useRef<"practice" | "live" | null>(null);
  const syncInFlightRef = useRef(false);
  const syncFailureCountRef = useRef(0);
  const syncPausedUntilRef = useRef(0);
  const lobbyRef = useRef<BackendLobby | null>(null);
  const practiceTimeLeftRef = useRef(0);
  const liveTimeLeftRef = useRef(0);
  const solvePendingRef = useRef(false);
  const arenaStateRef = useRef<NeonRivalsGameState | null>(null);

  useEffect(() => {
    setLocalHintBalance(user?.hintBalance ?? 0);
  }, [user?.hintBalance, user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !canSave || !isReady || !user) return;

    let cancelled = false;
    setLobby(null);
    setLobbyError(null);
    setPracticeSolved(false);
    setHintPenaltyTotal(0);
    setHintUsesThisRound(0);
    setHintCooldownUntil(null);
    setActiveHint(null);
    setSolvePending(false);
    setResultsSnapshot(null);
    readySentLobbyIdRef.current = null;
    completedRoundRef.current = null;
    progressSubmissionKeyRef.current = null;
    rejectedStageRef.current = null;
    syncFailureCountRef.current = 0;
    syncPausedUntilRef.current = 0;

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
          setLobbyError(
            error instanceof Error
              ? error.message
              : "Could not join matchmaking.",
          );
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
      if (syncInFlightRef.current) return;
      if (Date.now() < syncPausedUntilRef.current) return;

      syncInFlightRef.current = true;
      void supabaseApi
        .syncLobby(lobby.id)
        .then((response) => {
          syncFailureCountRef.current = 0;
          syncPausedUntilRef.current = 0;
          setLobby(response.lobby);
        })
        .catch((error) => {
          syncFailureCountRef.current += 1;
          const backoffMs = Math.min(
            intervalMs * 2 ** Math.min(syncFailureCountRef.current, 3),
            8000,
          );
          syncPausedUntilRef.current = Date.now() + backoffMs;

          if (
            syncFailureCountRef.current <= 2 ||
            syncFailureCountRef.current % 5 === 0
          ) {
            console.error("Failed to sync lobby", error);
          }
        })
        .finally(() => {
          syncInFlightRef.current = false;
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
    if (
      lobby?.status !== "practice" &&
      lobby?.status !== "live" &&
      lobby?.status !== "intermission"
    )
      return;

    const interval = window.setInterval(() => {
      setClockNow(Date.now());
    }, 250);

    return () => window.clearInterval(interval);
  }, [lobby?.status]);

  useEffect(() => {
    const completedAt = lobby?.results?.completedAt ?? null;
    if (!completedAt || completedRoundRef.current === completedAt) return;
    completedRoundRef.current = completedAt;
    setHintPenaltyTotal(0);
    setHintUsesThisRound(0);
    setHintCooldownUntil(null);
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
    if (
      (lobby.status === "intermission" || lobby.status === "complete") &&
      lobby.results?.standings?.length
    ) {
      setResultsSnapshot(lobby);
    }
  }, [lobby]);

  useEffect(() => {
    setHintPenaltyTotal(0);
    setHintUsesThisRound(0);
    setHintCooldownUntil(null);
    setArenaState(null);
    liveSolveStageKeyRef.current = null;
    progressSubmissionKeyRef.current = null;
    rejectedStageRef.current = null;
  }, [lobby?.selection?.selectedAt]);

  useEffect(() => {
    setArenaState(null);
    liveSolveStageKeyRef.current = null;
    progressSubmissionKeyRef.current = null;
    rejectedStageRef.current = null;
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

  const activeResultsLobby = useMemo(() => {
    if (
      lobby &&
      (lobby.status === "intermission" || lobby.status === "complete")
    ) {
      return lobby;
    }

    if (!resultsSnapshot?.intermissionEndsAt) {
      return null;
    }

    const endsAt = new Date(resultsSnapshot.intermissionEndsAt).getTime();
    return clockNow <= endsAt + 750 ? resultsSnapshot : null;
  }, [clockNow, lobby, resultsSnapshot]);

  const resultsSourceLobby = activeResultsLobby ?? lobby;
  const selfPlayer =
    lobby?.players.find((player) => player.playerId === user?.id) ?? null;
  const selectionMeta = lobby?.selection?.meta ?? null;
  const isHeadToHead = mode === "head_to_head";
  const rapidFire = lobby?.selection
    ? isRapidFirePuzzleType(lobby.selection.puzzleType)
    : false;
  const scoreRace = rapidFire || isHeadToHead;
  const practiceTimeLeft = Math.max(
    0,
    Math.ceil(
      ((lobby?.practiceEndsAt ? new Date(lobby.practiceEndsAt).getTime() : 0) -
        clockNow) /
        1000,
    ),
  );
  const liveTimeLeft = Math.max(
    0,
    Math.ceil(
      ((lobby?.liveEndsAt ? new Date(lobby.liveEndsAt).getTime() : 0) -
        clockNow) /
        1000,
    ),
  );
  const intermissionTimeLeft = Math.max(
    0,
    Math.ceil(
      ((resultsSourceLobby?.intermissionEndsAt
        ? new Date(resultsSourceLobby.intermissionEndsAt).getTime()
        : 0) -
        clockNow) /
        1000,
    ),
  );
  const standings = useMemo(
    () => rankPlayers(lobby?.players ?? [], scoreRace),
    [lobby?.players, scoreRace],
  );
  const resultsRapidFire = resultsSourceLobby?.selection
    ? isRapidFirePuzzleType(resultsSourceLobby.selection.puzzleType) ||
      resultsSourceLobby.mode === "head_to_head"
    : scoreRace;
  const resultsStandings = useMemo(
    () => rankPlayers(resultsSourceLobby?.players ?? [], resultsRapidFire),
    [resultsRapidFire, resultsSourceLobby?.players],
  );
  const leaderboard =
    resultsSourceLobby?.results?.standings ??
    resultsStandings.map((player, index) => ({
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
  const selfStanding =
    leaderboard.find((entry) => entry.playerId === user?.id) ?? null;
  const resultsSelectionMeta =
    resultsSourceLobby?.selection?.meta ?? selectionMeta;
  const activeSeed =
    lobby?.status === "live"
      ? Number(selfPlayer?.currentSeed ?? lobby?.selection?.liveSeed ?? 0)
      : Number(lobby?.selection?.practiceSeed ?? 0);
  const liveArenaMode = lobby?.selection
    ? isHeadToHead
      ? getHeadToHeadArenaModeForPuzzleType(lobby.selection.puzzleType)
      : getRankedArenaModeForPuzzleType(lobby.selection.puzzleType)
    : null;
  useEffect(() => {
    const nextPenaltyTotal = selfPlayer?.hintPenaltyTotal ?? 0;
    const nextHintUses = selfPlayer?.hintUses ?? 0;
    const nextCooldown = selfPlayer?.nextHintAvailableAt
      ? new Date(selfPlayer.nextHintAvailableAt).getTime()
      : null;

    setHintPenaltyTotal(nextPenaltyTotal);
    setHintUsesThisRound(nextHintUses);
    setHintCooldownUntil(
      nextCooldown && nextCooldown > Date.now() ? nextCooldown : null,
    );
  }, [
    selfPlayer?.hintPenaltyTotal,
    selfPlayer?.hintUses,
    selfPlayer?.nextHintAvailableAt,
  ]);

  useEffect(() => {
    lobbyRef.current = lobby;
  }, [lobby]);

  useEffect(() => {
    practiceTimeLeftRef.current = practiceTimeLeft;
    liveTimeLeftRef.current = liveTimeLeft;
  }, [liveTimeLeft, practiceTimeLeft]);

  useEffect(() => {
    solvePendingRef.current = solvePending;
  }, [solvePending]);

  useEffect(() => {
    arenaStateRef.current = arenaState;
  }, [arenaState]);


  const queueProgressSubmission = useCallback(
    (
      stage: "practice" | "live",
      submission: PuzzleSubmission,
      progress: number,
      score?: number,
    ) => {
      const currentLobby = lobbyRef.current;
      if (!currentLobby) return;

      const stageTimeLeft =
        stage === "practice"
          ? practiceTimeLeftRef.current
          : liveTimeLeftRef.current;
      if (
        currentLobby.status !== stage ||
        stageTimeLeft <= 0 ||
        rejectedStageRef.current === stage
      ) {
        return;
      }

      const normalizedScore =
        typeof score === "number" ? Math.max(0, Math.floor(score)) : 0;
      const submissionKey = `${currentLobby.id}:${stage}:${progress}:${typeof score === "number" ? normalizedScore : "na"}:${JSON.stringify(submission)}`;
      if (progressSubmissionKeyRef.current === submissionKey) {
        return;
      }

      progressSubmissionKeyRef.current = submissionKey;
      lastSubmissionRef.current = submission;

      if (progressTimeoutRef.current !== null) {
        window.clearTimeout(progressTimeoutRef.current);
      }

      progressTimeoutRef.current = window.setTimeout(() => {
        const latestLobby = lobbyRef.current;
        const latestTimeLeft =
          stage === "practice"
            ? practiceTimeLeftRef.current
            : liveTimeLeftRef.current;
        if (!latestLobby || latestLobby.id !== currentLobby.id) return;
        if (
          latestLobby.status !== stage ||
          latestTimeLeft <= 0 ||
          rejectedStageRef.current === stage
        )
          return;

        void supabaseApi
          .submitProgress(
            latestLobby.id,
            stage,
            submission,
            stage === "live" && typeof score === "number"
              ? normalizedScore
              : undefined,
          )
          .then((response) => {
            syncFailureCountRef.current = 0;
            syncPausedUntilRef.current = 0;
            setLobby(response.lobby);
          })
          .catch((error) => {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to submit progress.";

            if (message.includes("not accepted right now")) {
              rejectedStageRef.current = stage;
              return;
            }

            if (message.includes("not having enough compute resources")) {
              syncPausedUntilRef.current = Date.now() + 4000;
            }

            console.error("Failed to submit progress", error);
          });
      }, 220);
    },
    [],
  );

  const handleLiveSolve = useCallback(() => {
    const currentLobby = lobbyRef.current;
    const currentSubmission = lastSubmissionRef.current;
    if (!currentLobby || !currentSubmission || solvePendingRef.current) return;
    if (currentLobby.status !== "live" || liveTimeLeftRef.current <= 0) return;

    setSolvePending(true);
    solvePendingRef.current = true;

    void supabaseApi
      .submitSolve(
        currentLobby.id,
        "live",
        currentSubmission,
        mode === "head_to_head" ? undefined : arenaStateRef.current?.score ?? 0,
      )
      .then((response) => setLobby(response.lobby))
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Failed to submit solve.";
        if (!message.includes("not accepted right now")) {
          console.error("Failed to submit solve", error);
        }
      })
      .finally(() => {
        setSolvePending(false);
        solvePendingRef.current = false;
      });
  }, [mode]);

  async function handleUseHint() {

    const currentLobby = lobbyRef.current;
    if (!currentLobby || !currentLobby.selection || !user || hintSaving) {
      return;
    }
    if (currentLobby.status !== "live" || liveTimeLeftRef.current <= 0) {
      return;
    }

    const currentPlayer = currentLobby.players.find((player) => player.playerId === user.id);
    if (currentPlayer?.solvedAtMs !== null) {
      return;
    }

    if (localHintBalance <= 0) {
      toast.error("No hints are available on this account.");
      return;
    }

    if (hintCooldownUntil && hintCooldownUntil > Date.now()) {
      const seconds = Math.max(1, Math.ceil((hintCooldownUntil - Date.now()) / 1000));
      toast.error(`Hint cooling down for ${seconds}s.`);
      return;
    }

    setHintSaving(true);

    try {
      const response = await supabaseApi.useMatchHint(currentLobby.id);
      const cooldownAt = response.nextHintAvailableAt
        ? new Date(response.nextHintAvailableAt).getTime()
        : null;
      const message = getPuzzleHintText(currentLobby.selection.puzzleType);

      syncFailureCountRef.current = 0;
      syncPausedUntilRef.current = 0;
      setLobby(response.lobby);
      setLocalHintBalance(response.remainingHints);
      setHintPenaltyTotal(response.hintPenaltyTotal);
      setHintUsesThisRound(response.hintUses);
      setHintCooldownUntil(cooldownAt);
      setActiveHint({ text: message, expiresAt: Date.now() + 6500 });
      void refreshUser();
      toast.message(`Hint used. -${response.penalty} score`, {
        description: message,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to use a match hint.",
      );
    } finally {
      setHintSaving(false);
    }
  }

  useEffect(() => {
    if (lobby?.status !== "live" || !lobby.selection) {
      setActiveHint(null);
      return;
    }
  }, [lobby?.status, lobby?.selection?.selectedAt]);

  async function leaveMatch() {
    if (!lobby || exitPending) return;
    setExitPending(true);

    try {
      await supabaseApi.leaveLobby(lobby.id);
    } catch (error) {
      console.error("Failed to leave match", error);
    } finally {
      setQuitConfirmOpen(false);
      setExitPending(false);
      navigate("/");
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
      setExitPending(false);
      navigate("/");
    }
  }

  function renderFullscreenArena(stage: "practice" | "live") {
    if (!lobby?.selection || !selfPlayer) {
      return null;
    }

    const isPractice = stage === "practice";
    const timeLeft = isPractice ? practiceTimeLeft : liveTimeLeft;
    const lowTime = isPractice ? timeLeft <= 3 : timeLeft <= 10;
    const disabled =
      timeLeft <= 0 ||
      (isPractice
        ? practiceSolved
        : solvePending || (!scoreRace && selfPlayer.solvedAtMs !== null));

    if (!liveArenaMode) {
      return (
        <div className="match-ranked-screen">
          <div className="match-ranked-shell">
            <div className="command-panel-soft flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="font-hud text-[11px] uppercase tracking-[0.18em] text-destructive">
                Arena board unavailable
              </p>
              <p className="max-w-xl text-sm text-muted-foreground">
                {selectionMeta?.label ?? "This puzzle"} is not wired into the live Phaser arena yet.
              </p>
              <Button onClick={() => navigate("/play")} variant="outline" size="lg">
                <Home size={16} />
                Back to Play
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const currentHintPenaltyTotal = selfPlayer.hintPenaltyTotal ?? hintPenaltyTotal;
    const displayedScore = isPractice
      ? Math.max(0, Math.floor(selfPlayer.score ?? 0))
      : isHeadToHead
        ? Math.max(0, Math.floor(selfPlayer.score ?? 0))
        : getEffectiveMatchScore(
            Math.max(
              Number(selfPlayer.liveScoreRaw ?? selfPlayer.score ?? 0),
              Math.floor(arenaState?.score ?? 0),
            ),
            currentHintPenaltyTotal,
          );
    const hintCooldownSeconds =

      !isPractice && hintCooldownUntil && hintCooldownUntil > clockNow
        ? Math.max(1, Math.ceil((hintCooldownUntil - clockNow) / 1000))
        : 0;
    const nextHintPenalty = getMatchHintPenalty(
      (selfPlayer.hintUses ?? hintUsesThisRound) + 1,
    );
    const hintButtonLabel = hintSaving
      ? "Using..."
      : hintCooldownSeconds > 0
        ? `${hintCooldownSeconds}s`
        : localHintBalance <= 0
          ? "No Hints"
          : `Hint -${nextHintPenalty}`;
    const visibleHint =
      !isPractice && activeHint && activeHint.expiresAt > clockNow
        ? activeHint.text
        : null;

    return (
      <>
        <AlertDialog open={quitConfirmOpen} onOpenChange={setQuitConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Quit this match?</AlertDialogTitle>
              <AlertDialogDescription>
                Leaving now removes you from the current round immediately. The match continues for the remaining players unless only one rival is left, in which case the room reloads with a fresh lobby and a new puzzle.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={exitPending}>No</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void leaveMatch();
                }}
                disabled={exitPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {exitPending ? "Leaving..." : "Yes, quit"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="match-ranked-screen">
          <div className="match-ranked-shell">
            <div className="match-ranked-topbar">
              <Button
                onClick={() => setQuitConfirmOpen(true)}
                variant="outline"
                size="sm"
                className="match-ranked-home-button"
                disabled={exitPending}
              >
                <Home size={14} />
                {exitPending ? "Leaving..." : "Home"}
              </Button>

              <div className="match-ranked-stage">
                <span className="match-ranked-stage-chip">
                  {isPractice ? "Practice" : isHeadToHead ? "Duel" : "Live"}
                </span>
                <div className="match-ranked-stage-copy">
                  <p className="match-ranked-stage-title">
                    {selectionMeta?.label ?? "Random Puzzle"}
                  </p>
                  <p className="match-ranked-stage-subtitle">
                    {isPractice
                      ? "Warm-up round before the scored battle."
                      : isHeadToHead
                        ? `First to ${HEAD_TO_HEAD_LIVE_TARGET_SCORE} wins.`
                        : "Ranked battle in progress."}
                  </p>
                </div>
              </div>

              <div className="match-ranked-hudrail">
                {!isPractice ? (
                  <Button
                    onClick={() => void handleUseHint()}
                    variant="outline"
                    size="sm"
                    disabled={
                      hintSaving ||
                      localHintBalance <= 0 ||
                      hintCooldownSeconds > 0 ||
                      disabled
                    }
                    className="match-ranked-hint-button"
                  >
                    <Lightbulb size={14} />
                    {hintButtonLabel}
                  </Button>
                ) : null}

                <div className="match-ranked-scorebox">
                  <span className="match-ranked-scorebox-label">{isHeadToHead ? "Duel Score" : "Live Score"}</span>
                  <span className="match-ranked-scorebox-value">
                    {Math.round(displayedScore).toLocaleString()}
                  </span>
                </div>

                <div
                  className={cn(
                    "match-ranked-timer",
                    lowTime && "match-ranked-timer--urgent",
                  )}
                >
                  <span className="match-ranked-timer-label">
                    {isPractice ? "Practice" : "Match"} Timer
                  </span>
                  <span className="match-ranked-timer-value">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>

            {visibleHint ? (
              <div className="match-ranked-hint-panel">
                <div className="match-ranked-hint-panel-copy">
                  <span className="match-ranked-hint-panel-label">Live Hint</span>
                  <p>{visibleHint}</p>
                </div>
                <span className="match-ranked-hint-panel-penalty">
                  Score pressure active
                </span>
              </div>
            ) : null}

            <div className="match-ranked-board-wrap">
              <div className="match-ranked-board-shell">
                <NeonRivalsGame
                  key={`${lobby.id}:${stage}:${activeSeed}`}
                  className="match-ranked-game"
                  mode={liveArenaMode}
                  sessionSeed={activeSeed}
                  playerName={selfPlayer.username}
                  themeLabel="Neon Rivals Arena"
                  hudVariant="match"
                  matchContext={{
                    puzzleType: lobby.selection.puzzleType,
                    difficulty: lobby.selection.difficulty,
                    stage,
                  }}
                  onSubmissionChange={(submission, state) => {
                    lastSubmissionRef.current = submission;
                    setArenaState(state);
                    queueProgressSubmission(
                      stage,
                      submission,
                      state.objectiveProgressPercent,
                      isHeadToHead ? undefined : state.score,
                    );
                  }}
                  onStateChange={(state) => {
                    setArenaState(state);

                    if (isPractice && state.status === "complete") {
                      setPracticeSolved(true);
                      return;
                    }

                    if (!isPractice && state.status === "complete") {
                      const solveStageKey = `${lobby.id}:${stage}:${lobby.selection?.selectedAt}:${activeSeed}`;
                      if (liveSolveStageKeyRef.current !== solveStageKey) {
                        liveSolveStageKeyRef.current = solveStageKey;
                        handleLiveSolve();
                      }
                    }
                  }}
                />
                {disabled ? <div className="match-ranked-board-blocker" /> : null}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="page-screen">
        <div className="page-stack">
          <PageHeader
            eyebrow="Arena Uplink"
            title="Match Service Offline"
            subtitle="Ranked matching is temporarily unavailable."
          />
          <section className="command-panel flex flex-col gap-4 p-5">
            <div className="command-panel-soft flex items-start gap-3 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-destructive/30 bg-destructive/10 text-destructive">
                <WifiOff size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black">Match service unavailable</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {supabaseConfigErrorMessage}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/play")}
              variant="outline"
              size="lg"
              className="w-full"
            >
              <Home size={16} />
              Back to Play
            </Button>
          </section>
        </div>
      </div>
    );
  }

  if (!canSave) {
    if (accountNeedsSync) {
      return (
        <div className="page-screen">
          <div className="page-stack">
            <PageHeader
              eyebrow="Account Deck"
              title="Profile Sync Required"
              subtitle="Your auth session is live, but the profile payload is unavailable. Sign out and retry before entering matchmaking."
            />
            <section className="command-panel grid gap-3 p-5 sm:grid-cols-2">
              <Button
                onClick={() => void signOut()}
                variant="play"
                size="lg"
                className="w-full"
              >
                Sign Out To Retry
              </Button>
              <Button
                onClick={() => navigate("/play")}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <UserRoundPlus size={16} />
                Back
              </Button>
            </section>
          </div>
        </div>
      );
    }

    return (
      <div className="page-screen">
        <div className="page-stack">
          <PageHeader
            eyebrow="Account Deck"
            title="Account Required"
            subtitle="Guest sessions can browse the arena, but ranked results only persist to a saved account."
          />
          <section className="command-panel grid gap-3 p-5 sm:grid-cols-3">
            <Button
              onClick={openSignUp}
              variant="play"
              size="lg"
              className="w-full"
            >
              Create Account
            </Button>
            <Button
              onClick={openSignIn}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/play")}
              variant="outline"
              size="lg"
              className="w-full"
            >
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
                  <p className="mt-2 text-sm text-muted-foreground">
                    {lobbyError}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => setRematchKey((current) => current + 1)}
                    variant="play"
                    size="lg"
                    className="w-full"
                  >
                    Retry Matchmaking
                  </Button>
                  <Button
                    onClick={() => navigate("/play")}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
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

  if (activeResultsLobby) {
    return (
      <div className="match-results-screen">
        <div className="match-results-shell">
          <div className="match-results-top">
            <div>
              <p className="font-hud text-[11px] uppercase tracking-[0.24em] text-primary">
                Match Leaderboard
              </p>
              <h1 className="match-results-title">
                {resultsSelectionMeta?.label ?? "Round Complete"}
              </h1>
              <p className="match-results-subtitle">
                Next match loads in {intermissionTimeLeft}s. Exit returns you to
                the dashboard.
              </p>
            </div>
            <CountdownCard
              label="Next Match"
              value={`${intermissionTimeLeft}s`}
              urgent={intermissionTimeLeft <= 3}
            />
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
                className={cn(
                  "match-results-row",
                  entry.playerId === user.id && "match-results-row-self",
                )}
              >
                <span className="font-black text-primary">
                  {formatPlacement(entry.rank)}
                </span>
                <span className="truncate">
                  {entry.username}
                  {entry.playerId === user.id
                    ? " (You)"
                    : entry.isBot
                      ? " [Bot]"
                      : ""}
                </span>
                <span>{formatSolveTime(entry.solvedAtMs)}</span>
                <span>{entry.score}</span>
                <span>
                  {resultsRapidFire
                    ? entry.completions
                    : entry.solvedAtMs !== null
                      ? 1
                      : 0}
                </span>
              </div>
            ))}
          </div>

          <div className="match-results-summary">
            <div className="command-panel-soft p-4">
              <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">
                Your Finish
              </p>
              <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
                {selfStanding ? formatPlacement(selfStanding.rank) : "Complete"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {resultsRapidFire
                  ? `Fastest clear ${formatSolveTime(selfStanding?.solvedAtMs ?? null)} | ${selfStanding?.completions ?? 0} clears logged.`
                  : `Solve time ${formatSolveTime(selfStanding?.solvedAtMs ?? null)}.`}
              </p>
            </div>
            <Button
              onClick={() => void exitLobby()}
              variant="outline"
              size="lg"
              className="w-full"
              disabled={exitPending}
            >
              <DoorOpen size={16} />
              Exit to Dashboard
            </Button>
          </div>
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

  if (lobby.status === "filling") {
    const slotCards = Array.from(
      { length: lobby.maxPlayers },
      (_, index) => lobby.players[index] ?? null,
    );

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


















