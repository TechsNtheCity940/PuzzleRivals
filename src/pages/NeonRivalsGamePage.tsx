import { Activity, ArrowLeft, RefreshCcw, Sparkles, Trophy, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import NeonRivalsGame from "@/components/game/NeonRivalsGame";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import { Button } from "@/components/ui/button";
import { createInitialGameState, NEON_RIVALS_RUN_MODE_OPTIONS } from "@/game/config/runModes";
import type {
  NeonRivalsBoardFamily,
  NeonRivalsGameState,
  NeonRivalsRewardSummary,
  NeonRivalsRunMode,
  NeonRivalsRunSyncResult,
} from "@/game/types";
import { supabaseApi } from "@/lib/api-client";
import { getThemeVisual } from "@/lib/cosmetics";
import { useAuth } from "@/providers/AuthProvider";

const DEFAULT_MODE: NeonRivalsRunMode = "score_attack";

type RunSyncState =
  | { status: "idle"; message: string; result: null }
  | { status: "guest"; message: string; result: null }
  | { status: "account-error"; message: string; result: null }
  | { status: "submitting"; message: string; result: null }
  | { status: "synced"; message: string; result: NeonRivalsRunSyncResult }
  | { status: "error"; message: string; result: null };

function statusLabel(status: NeonRivalsGameState["status"]) {
  if (status === "complete") return "Objective complete";
  if (status === "failed") return "Run over";
  if (status === "running") return "Board live";
  return "Booting";
}

function formatRewardLines(reward: NeonRivalsRewardSummary) {
  return [
    reward.xp ? `+${reward.xp} XP` : null,
    reward.coins ? `+${reward.coins} Coins` : null,
    reward.passXp ? `+${reward.passXp} Pass XP` : null,
    reward.shards ? `+${reward.shards} Shards` : null,
    reward.gems ? `+${reward.gems} Gems` : null,
    reward.itemIds.length > 0 ? `${reward.itemIds.length} item unlock${reward.itemIds.length === 1 ? "" : "s"}` : null,
  ].filter((entry): entry is string => Boolean(entry));
}

function getIdleSyncState(hasSession: boolean, hasUser: boolean): RunSyncState {
  if (!hasSession) {
    return {
      status: "guest",
      message: "Play freely, then sign up to bank Neon Rivals rewards and quest progress.",
      result: null,
    };
  }

  if (!hasUser) {
    return {
      status: "account-error",
      message: "Auth is live, but your profile did not sync. Fix that before banking rewards.",
      result: null,
    };
  }

  return {
    status: "idle",
    message: "Finish a run to bank live XP, coins, pass XP, shards, and season quest progress.",
    result: null,
  };
}

function getBoardMetricCard(state: NeonRivalsGameState) {
  switch (state.boardFamily) {
    case "maze":
      return {
        title: "Route Pressure",
        value: String(state.matchedTiles),
        detail: "Route Steps",
      };
    case "pipe":
      return {
        title: "Network Online",
        value: `${state.objectiveValue}%`,
        detail: `${state.resourceLabel} left ${state.movesLeft}`,
      };
    case "tile":
      return {
        title: "Board Lock",
        value: String(state.matchedTiles),
        detail: `${state.resourceLabel} left ${state.movesLeft}`,
      };
    case "number":
      return {
        title: "Grid Lock",
        value: String(state.matchedTiles),
        detail: `${state.resourceLabel} left ${state.movesLeft}`,
      };
    case "spatial":
      return {
        title: "Shape Reads",
        value: String(state.matchedTiles),
        detail: `${state.resourceLabel} left ${state.movesLeft}`,
      };
    case "strategy":
      return {
        title: "Tactical Hits",
        value: String(state.matchedTiles),
        detail: `${state.resourceLabel} left ${state.movesLeft}`,
      };
    default:
      return {
        title: "Peak Combo",
        value: `x${state.maxCombo}`,
        detail: `${state.resourceLabel} left ${state.movesLeft}`,
      };
  }
}

function getProgressDetail(state: NeonRivalsGameState) {
  if (state.boardFamily === "maze") {
    return `${state.matchedTiles} route steps`;
  }

  if (state.boardFamily === "pipe") {
    return `${state.matchedTiles} cells connected`;
  }

  if (state.boardFamily === "tile") {
    return `${state.matchedTiles} tiles aligned`;
  }

  if (state.boardFamily === "number") {
    return `${state.matchedTiles} blanks solved`;
  }

  if (state.boardFamily === "spatial") {
    return `${state.matchedTiles} shapes solved`;
  }

  if (state.boardFamily === "strategy") {
    return `${state.matchedTiles} tactics solved`;
  }

  return `${state.matchedTiles} cleared`;
}

export default function NeonRivalsGamePage() {
  const navigate = useNavigate();
  const { openSignUp } = useAuthDialog();
  const { user, hasSession, refreshUser } = useAuth();
  const [selectedMode, setSelectedMode] = useState<NeonRivalsRunMode>(DEFAULT_MODE);
  const [sessionSeed, setSessionSeed] = useState(() => Date.now());
  const [gameState, setGameState] = useState<NeonRivalsGameState>(() => createInitialGameState(DEFAULT_MODE, 0));
  const [syncState, setSyncState] = useState<RunSyncState>(() => getIdleSyncState(hasSession, Boolean(user)));
  const submittedKeyRef = useRef<string | null>(null);
  const theme = getThemeVisual(user?.themeId);
  const activeMode = useMemo(
    () => NEON_RIVALS_RUN_MODE_OPTIONS.find((option) => option.id === selectedMode) ?? NEON_RIVALS_RUN_MODE_OPTIONS[0],
    [selectedMode],
  );
  const accountNeedsSync = hasSession && !user;
  const boardMetric = getBoardMetricCard(gameState);

  useEffect(() => {
    setGameState(createInitialGameState(selectedMode, sessionSeed));
    setSyncState(getIdleSyncState(hasSession, Boolean(user)));
    submittedKeyRef.current = null;
  }, [hasSession, selectedMode, sessionSeed, user]);

  useEffect(() => {
    if (gameState.status !== "complete" && gameState.status !== "failed") {
      return;
    }

    const submissionKey = `${selectedMode}:${sessionSeed}:${gameState.status}`;
    if (submittedKeyRef.current === submissionKey) {
      return;
    }

    if (!hasSession) {
      setSyncState(getIdleSyncState(false, false));
      submittedKeyRef.current = submissionKey;
      return;
    }

    if (!user) {
      setSyncState(getIdleSyncState(true, false));
      submittedKeyRef.current = submissionKey;
      return;
    }

    submittedKeyRef.current = submissionKey;
    setSyncState({
      status: "submitting",
      message: "Banking rewards, season progress, and activity feed updates.",
      result: null,
    });

    void supabaseApi.submitNeonRivalsRun({
      sessionSeed,
      mode: selectedMode,
      status: gameState.status,
      score: gameState.score,
      combo: gameState.combo,
      maxCombo: gameState.maxCombo,
      matchedTiles: gameState.matchedTiles,
      movesLeft: gameState.movesLeft,
      targetScore: gameState.targetScore,
      objectiveTitle: gameState.objectiveTitle,
      objectiveLabel: gameState.objectiveLabel,
      objectiveValue: gameState.objectiveValue,
      objectiveTarget: gameState.objectiveTarget,
      targetColor: gameState.targetColor,
      targetColorLabel: gameState.targetColorLabel,
      durationMs: gameState.durationMs,
    }).then(async (result) => {
      await refreshUser();
      setSyncState({
        status: "synced",
        message: result.alreadySubmitted ? "This run was already banked. Showing the existing reward summary." : "Run synced. Rewards and season progress are live.",
        result,
      });
      toast.success(result.alreadySubmitted ? "Run already banked" : "Rewards banked", {
        description: formatRewardLines(result.totalReward).join(" | ") || "Season progress updated.",
      });
    }).catch((error) => {
      submittedKeyRef.current = null;
      const message = error instanceof Error ? error.message : "Failed to bank Neon Rivals rewards.";
      setSyncState({
        status: "error",
        message,
        result: null,
      });
      toast.error("Reward sync failed", { description: message });
    });
  }, [gameState, hasSession, refreshUser, selectedMode, sessionSeed, user]);

  const progress = gameState.objectiveProgressPercent;
  const rewardLines = syncState.status === "synced" ? formatRewardLines(syncState.result.totalReward) : [];

  function remixBoard(nextMode = selectedMode) {
    submittedKeyRef.current = null;
    setSelectedMode(nextMode);
    setSessionSeed(Date.now());
  }

  return (
    <div className="neon-rivals-route-screen">
      <div className="neon-rivals-route-shell">
        <header className="neon-rivals-route-top">
          <div className="neon-rivals-route-copy">
            <p className="font-hud text-[11px] uppercase tracking-[0.28em] text-primary">Season 1 board route</p>
            <h1 className="neon-rivals-route-title">Neon Rivals Arena</h1>
            <p className="neon-rivals-route-subtitle">
              The Arena owns the live board families, move effects, and objective logic here. React keeps the route shell,
              account context, and reward sync around it.
            </p>
          </div>
          <div className="neon-rivals-route-actions">
            <Button onClick={() => navigate("/play")} variant="outline" size="lg" className="w-full sm:w-auto">
              <ArrowLeft size={16} />
              Back to Play
            </Button>
            <Button onClick={() => remixBoard()} variant="play" size="lg" className="w-full sm:w-auto">
              <RefreshCcw size={16} />
              Remix Board
            </Button>
          </div>
        </header>

        <div className="neon-rivals-route-grid">
          <section className="neon-rivals-stage-panel">
            <div className="neon-rivals-stage-frame">
              <NeonRivalsGame
                mode={selectedMode}
                sessionSeed={sessionSeed}
                playerName={user?.username ?? "Guest Rival"}
                themeLabel="Neon Rivals"
                onStateChange={setGameState}
              />
            </div>
          </section>

          <aside className="neon-rivals-side-panel">
            <div className="neon-rivals-stat-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Run Modes</p>
                  <p className="mt-1 text-sm text-muted-foreground">Switch the live objective without leaving the route.</p>
                </div>
                <Zap size={18} className="text-primary" />
              </div>
              <div className="mt-4 grid gap-3">
                {NEON_RIVALS_RUN_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => remixBoard(option.id)}
                    className={`command-panel-soft w-full rounded-[22px] border px-4 py-4 text-left transition ${
                      selectedMode === option.id
                        ? "border-primary/40 bg-primary/10 shadow-[0_16px_36px_rgba(95,226,255,0.14)]"
                        : "border-white/8 hover:border-primary/20"
                    }`}
                  >
                    <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-primary">{option.kicker}</p>
                    <p className="mt-2 text-lg font-black text-white">{option.label}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="neon-rivals-stat-card">
              <p className="section-kicker">Run State</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="neon-rivals-stat-icon">
                  <Activity size={18} />
                </div>
                <div>
                  <p className="text-lg font-black text-white">{statusLabel(gameState.status)}</p>
                  <p className="text-sm text-muted-foreground">{gameState.objectiveTitle}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{gameState.objectiveDescription}</p>
              <p className="mt-3 font-hud text-[11px] uppercase tracking-[0.18em] text-primary">{gameState.objectiveLabel}</p>
              {gameState.targetColorLabel ? (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#ffe45d]">Target color: {gameState.targetColorLabel}</p>
              ) : null}
            </div>

            <div className="neon-rivals-score-grid">
              <div className="neon-rivals-stat-card">
                <p className="section-kicker">Score</p>
                <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{gameState.score.toLocaleString()}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-primary">Score line {gameState.targetScore.toLocaleString()}</p>
              </div>
              <div className="neon-rivals-stat-card">
                <p className="section-kicker">{boardMetric.title}</p>
                <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{boardMetric.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-primary">{boardMetric.detail}</p>
              </div>
            </div>

            <div className="neon-rivals-stat-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Objective Progress</p>
                  <p className="mt-1 text-sm text-muted-foreground">{gameState.objectiveValue}/{gameState.objectiveTarget} target value</p>
                </div>
                <Trophy size={18} className="text-primary" />
              </div>
              <div className="neon-rivals-progress-track mt-4">
                <div className="neon-rivals-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-primary">{progress}% to goal | {getProgressDetail(gameState)}</p>
            </div>

            <div className="neon-rivals-stat-card">
              <div className="flex items-center gap-3">
                <div className="neon-rivals-stat-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-base font-black text-white">Reward Sync</p>
                  <p className="text-sm text-muted-foreground">{syncState.message}</p>
                </div>
              </div>
              {syncState.status === "guest" ? (
                <Button onClick={openSignUp} variant="play" size="sm" className="mt-4 w-full">
                  Sign Up To Bank Rewards
                </Button>
              ) : null}
              {syncState.status === "synced" && rewardLines.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  {rewardLines.map((line) => (
                    <div key={line} className="command-panel-soft px-3 py-2 text-sm text-white/90">
                      {line}
                    </div>
                  ))}
                </div>
              ) : null}
              {syncState.status === "submitting" ? (
                <p className="mt-4 font-hud text-[11px] uppercase tracking-[0.16em] text-primary">Sync in progress...</p>
              ) : null}
              {syncState.status === "account-error" ? (
                <p className="mt-4 font-hud text-[11px] uppercase tracking-[0.16em] text-destructive">Account profile needs repair before rewards can land.</p>
              ) : null}
            </div>

            <div className="neon-rivals-stat-card">
              <div className="flex items-center gap-3">
                <div className="neon-rivals-stat-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-base font-black text-white">Theme Sync</p>
                  <p className="text-sm text-muted-foreground">{theme.name} shell art stays outside Phaser while the Arena board families and rewards run live inside the route.</p>
                </div>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-primary">{activeMode.label} | {Math.round(gameState.durationMs / 1000)}s runtime</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


