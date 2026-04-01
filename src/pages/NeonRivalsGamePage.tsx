import {
  Activity,
  ArrowLeft,
  BadgeHelp,
  RefreshCcw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import NeonRivalsGame from "@/components/game/NeonRivalsGame";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import { Button } from "@/components/ui/button";
import {
  createFreshArenaSeed,
  pickNextArenaMode,
} from "@/game/config/arenaRotation";
import {
  createInitialGameState,
  NEON_RIVALS_RUN_MODE_OPTIONS,
} from "@/game/config/runModes";
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
import { useAppPreferences } from "@/providers/AppPreferencesProvider";

const DEFAULT_MODE: NeonRivalsRunMode = "score_attack";
const RUN_MODE_IDS = new Set(
  NEON_RIVALS_RUN_MODE_OPTIONS.map((option) => option.id),
);
const MODE_FAMILY_FILTERS: Array<"all" | NeonRivalsBoardFamily> = [
  "all",
  ...new Set(NEON_RIVALS_RUN_MODE_OPTIONS.map((option) => option.boardFamily)),
];

const BOARD_CONTROL_HINTS: Record<NeonRivalsBoardFamily, string[]> = {
  match3: [
    "Swap adjacent tiles only. Clean matches and cascades do the real damage.",
    "The board state matters more than one flashy move. Preserve space for follow-up clears.",
    "Focus the active objective instead of chasing raw score every turn.",
  ],
  maze: [
    "Move one legal step at a time. Dead turns spark red and waste the route budget.",
    "Read the exit lane before you commit. The shortest route is usually the highest-value path.",
    "When the start and goal nodes pulse harder, you are close to the solve line.",
  ],
  pipe: [
    "Select one conduit tile at a time. Every click rotates that tile clockwise by one step.",
    "Switching to a different tile leaves the previous conduit exactly where you left it.",
    "Revisit any tile until the network lights cleanly from source to finish.",
  ],
  tile: [
    "Select the tile you want to move, then tap the adjacent blank slot.",
    "Slides happen one space at a time. The current tile and valid destination stay highlighted.",
    "Lock rows early so the last few moves do not turn into a scramble.",
  ],
  number: [
    "Pick an empty cell first, then fire the digit into place with intention.",
    "Solved rows and columns light up, so use the rail feedback to confirm structure quickly.",
    "The move budget is tight. Do not brute-force fills without reading the pattern.",
  ],
  spatial: [
    "Read the transform rule before you commit. Mirror and rotation rounds punish rushed taps.",
    "One correct silhouette locks instantly and pushes the next round live.",
    "Treat the ghost preview as the truth source, not the color noise around it.",
  ],
  strategy: [
    "Tap the active piece, then the winning target square. The board itself is the answer surface.",
    "Move hints follow real piece movement, so read checks, captures, and promotion threats normally.",
    "Wrong hits flash fast. Reset, reread the tactic, and execute the clean line.",
  ],
  quiz: [
    "Read the prompt card first. The glowing answer lanes are bait if you skip the question.",
    "Correct streaks matter more than one lucky guess, so play for clean chains.",
    "The whole board is the quiz surface now. Stay inside the Phaser lane and commit deliberately.",
  ],
  memory: [
    "Watch the reveal sweep before you touch anything. Input unlocks only after the live pulse ends.",
    "Correct cells lock in place. Wrong taps reset the pattern and cost a real attempt.",
    "Do not chase one tile at a time. Hold the full shape in memory before you replay it.",
  ],
};

type RunSyncState =
  | { status: "idle"; message: string; result: null }
  | { status: "guest"; message: string; result: null }
  | { status: "account-error"; message: string; result: null }
  | { status: "submitting"; message: string; result: null }
  | { status: "synced"; message: string; result: NeonRivalsRunSyncResult }
  | { status: "error"; message: string; result: null };

function resolveRequestedMode(
  rawMode: string | null,
  fallbackMode: NeonRivalsRunMode,
) {
  if (rawMode && RUN_MODE_IDS.has(rawMode as NeonRivalsRunMode)) {
    return rawMode as NeonRivalsRunMode;
  }
  return fallbackMode;
}

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
    reward.itemIds.length > 0
      ? `${reward.itemIds.length} item unlock${reward.itemIds.length === 1 ? "" : "s"}`
      : null,
  ].filter((entry): entry is string => Boolean(entry));
}

function getIdleSyncState(hasSession: boolean, hasUser: boolean): RunSyncState {
  if (!hasSession) {
    return {
      status: "guest",
      message:
        "Play freely, then sign up to bank Neon Rivals rewards and quest progress.",
      result: null,
    };
  }

  if (!hasUser) {
    return {
      status: "account-error",
      message:
        "Auth is live, but your profile did not sync. Fix that before banking rewards.",
      result: null,
    };
  }

  return {
    status: "idle",
    message:
      "Finish a run to bank live XP, coins, pass XP, shards, and season quest progress.",
    result: null,
  };
}

function getBoardMetricCard(state: NeonRivalsGameState) {
  switch (state.boardFamily) {
    case "maze":
      return { title: "Route Pressure", value: String(state.matchedTiles), detail: "Route Steps" };
    case "pipe":
      return { title: "Network Online", value: `${state.objectiveValue}%`, detail: `${state.resourceLabel} left ${state.movesLeft}` };
    case "tile":
      return { title: "Board Lock", value: String(state.matchedTiles), detail: `${state.resourceLabel} left ${state.movesLeft}` };
    case "number":
      return { title: "Grid Lock", value: String(state.matchedTiles), detail: `${state.resourceLabel} left ${state.movesLeft}` };
    case "spatial":
      return { title: "Shape Reads", value: String(state.matchedTiles), detail: `${state.resourceLabel} left ${state.movesLeft}` };
    case "strategy":
      return { title: "Tactical Hits", value: String(state.matchedTiles), detail: `${state.resourceLabel} left ${state.movesLeft}` };
    case "quiz":
      return { title: "Prompt Streak", value: String(state.matchedTiles), detail: `${state.resourceLabel} left ${state.movesLeft}` };
    case "memory":
      return { title: "Patterns Held", value: String(state.matchedTiles), detail: `${state.resourceLabel} left ${state.movesLeft}` };
    default:
      return { title: "Peak Combo", value: `x${state.maxCombo}`, detail: `${state.resourceLabel} left ${state.movesLeft}` };
  }
}

function getProgressDetail(state: NeonRivalsGameState) {
  if (state.boardFamily === "maze") return `${state.matchedTiles} route steps`;
  if (state.boardFamily === "pipe") return `${state.matchedTiles} cells connected`;
  if (state.boardFamily === "tile") return `${state.matchedTiles} tiles aligned`;
  if (state.boardFamily === "number") return `${state.matchedTiles} blanks solved`;
  if (state.boardFamily === "spatial") return `${state.matchedTiles} shapes solved`;
  if (state.boardFamily === "strategy") return `${state.matchedTiles} tactics solved`;
  if (state.boardFamily === "quiz") return `${state.matchedTiles} prompts solved`;
  if (state.boardFamily === "memory") return `${state.matchedTiles} patterns solved`;
  return `${state.matchedTiles} cleared`;
}

function boardFamilyLabel(family: "all" | NeonRivalsBoardFamily) {
  if (family === "all") return "All";
  if (family === "match3") return "Match";
  if (family === "maze") return "Maze";
  if (family === "pipe") return "Pipe";
  if (family === "tile") return "Tile";
  if (family === "number") return "Number";
  if (family === "spatial") return "Spatial";
  if (family === "strategy") return "Strategy";
  if (family === "quiz") return "Quiz";
  return "Memory";
}

export default function NeonRivalsGamePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSignUp } = useAuthDialog();
  const { user, hasSession, refreshUser } = useAuth();
  const {
    compactArenaLayout,
    dismissedArenaHints,
    dismissArenaHint,
    lastArenaMode,
    recentArenaHistory,
    recordArenaHistory,
    setLastArenaMode,
  } = useAppPreferences();
  const requestedMode = resolveRequestedMode(searchParams.get("mode"), lastArenaMode);
  const [selectedMode, setSelectedMode] = useState<NeonRivalsRunMode>(requestedMode);
  const [modeFamilyFilter, setModeFamilyFilter] = useState<"all" | NeonRivalsBoardFamily>("all");
  const [sessionSeed, setSessionSeed] = useState(() => Date.now());
  const [gameState, setGameState] = useState<NeonRivalsGameState>(() => createInitialGameState(requestedMode, 0));
  const [syncState, setSyncState] = useState<RunSyncState>(() => getIdleSyncState(hasSession, Boolean(user)));
  const submittedKeyRef = useRef<string | null>(null);
  const historyRecordedKeyRef = useRef<string | null>(null);
  const theme = getThemeVisual(user?.themeId);
  const activeMode = useMemo(
    () =>
      NEON_RIVALS_RUN_MODE_OPTIONS.find((option) => option.id === selectedMode) ??
      NEON_RIVALS_RUN_MODE_OPTIONS[0],
    [selectedMode],
  );
  const visibleModes = useMemo(
    () =>
      NEON_RIVALS_RUN_MODE_OPTIONS.filter(
        (option) => modeFamilyFilter === "all" || option.boardFamily === modeFamilyFilter,
      ),
    [modeFamilyFilter],
  );
  const accountNeedsSync = hasSession && !user;
  const boardMetric = getBoardMetricCard(gameState);
  const controlHints = BOARD_CONTROL_HINTS[gameState.boardFamily];
  const showArenaGuide = !dismissedArenaHints[gameState.boardFamily];

  useEffect(() => {
    if (requestedMode !== selectedMode) {
      setSelectedMode(requestedMode);
      setModeFamilyFilter("all");
      setSessionSeed(createFreshArenaSeed(recentArenaHistory, Date.now()));
    }
  }, [recentArenaHistory, requestedMode, selectedMode]);

  useEffect(() => {
    setLastArenaMode(selectedMode);
    if (searchParams.get("mode") === selectedMode) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set("mode", selectedMode);
    setSearchParams(next, { replace: true });
  }, [searchParams, selectedMode, setLastArenaMode, setSearchParams]);

  useEffect(() => {
    const historyKey = `${selectedMode}:${sessionSeed}`;
    if (historyRecordedKeyRef.current === historyKey) {
      return;
    }
    historyRecordedKeyRef.current = historyKey;
    recordArenaHistory(selectedMode, sessionSeed);
  }, [recordArenaHistory, selectedMode, sessionSeed]);

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

    void supabaseApi
      .submitNeonRivalsRun({
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
      })
      .then(async (result) => {
        await refreshUser();
        setSyncState({
          status: "synced",
          message: result.alreadySubmitted
            ? "This run was already banked. Showing the existing reward summary."
            : "Run synced. Rewards and season progress are live.",
          result,
        });
        toast.success(result.alreadySubmitted ? "Run already banked" : "Rewards banked", {
          description:
            formatRewardLines(result.totalReward).join(" | ") ||
            "Season progress updated.",
        });
      })
      .catch((error) => {
        submittedKeyRef.current = null;
        const message =
          error instanceof Error
            ? error.message
            : "Failed to bank Neon Rivals rewards.";
        setSyncState({
          status: "error",
          message,
          result: null,
        });
        toast.error("Reward sync failed", { description: message });
      });
  }, [gameState, hasSession, refreshUser, selectedMode, sessionSeed, user]);

  const progress = gameState.objectiveProgressPercent;
  const rewardLines =
    syncState.status === "synced"
      ? formatRewardLines(syncState.result.totalReward)
      : [];

  function launchBoard(nextMode: NeonRivalsRunMode, filter: "all" | NeonRivalsBoardFamily = modeFamilyFilter) {
    submittedKeyRef.current = null;
    setSelectedMode(nextMode);
    setModeFamilyFilter(filter);
    setSessionSeed(createFreshArenaSeed(recentArenaHistory, Date.now()));
  }

  function launchVariedBoard() {
    const nextMode = pickNextArenaMode({
      currentMode: selectedMode,
      history: recentArenaHistory,
      seedHint: Date.now(),
    });
    const nextFilter =
      NEON_RIVALS_RUN_MODE_OPTIONS.find((option) => option.id === nextMode)?.boardFamily ??
      activeMode.boardFamily;
    launchBoard(nextMode, nextFilter);
  }

  return (
    <div className="neon-rivals-route-screen">
      <div className={`neon-rivals-route-shell ${compactArenaLayout ? "neon-rivals-route-shell--compact" : "neon-rivals-route-shell--expanded"}`}>
        <header className="neon-rivals-route-top neon-rivals-route-top--dense">
          <div className="neon-rivals-route-copy neon-rivals-route-copy--dense">
            <p className="font-hud text-[11px] uppercase tracking-[0.28em] text-primary">
              Season 1 board route
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="neon-rivals-route-title">Arena</h1>
              <span className="neon-rivals-route-pill">{activeMode.label}</span>
              <span className="neon-rivals-route-pill">{boardFamilyLabel(activeMode.boardFamily)}</span>
              <span className="neon-rivals-route-pill">{statusLabel(gameState.status)}</span>
              <span className="neon-rivals-route-pill">{gameState.resourceLabel} left {gameState.movesLeft}</span>
            </div>
            <p className="neon-rivals-route-subtitle neon-rivals-route-subtitle--compact">
              {activeMode.description}
            </p>
          </div>
          <div className="neon-rivals-route-actions neon-rivals-route-actions--dense">
            <Button onClick={() => navigate("/play")} variant="outline" size="lg" className="w-full sm:w-auto">
              <ArrowLeft size={16} />
              Back to Play
            </Button>
            <Button onClick={launchVariedBoard} variant="play" size="lg" className="w-full sm:w-auto">
              <RefreshCcw size={16} />
              Next Variety
            </Button>
          </div>
        </header>

        <div className="neon-rivals-route-grid neon-rivals-route-grid--arena">
          <section className="neon-rivals-stage-column">
            <div className="neon-rivals-hud-row neon-rivals-hud-row--dense">
              <div className="neon-rivals-stat-card neon-rivals-stat-card--compact">
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
              </div>

              <div className="neon-rivals-stat-card neon-rivals-stat-card--compact">
                <p className="section-kicker">Score</p>
                <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{gameState.score.toLocaleString()}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-primary">Goal {gameState.targetScore.toLocaleString()}</p>
              </div>

              <div className="neon-rivals-stat-card neon-rivals-stat-card--compact">
                <p className="section-kicker">{boardMetric.title}</p>
                <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">{boardMetric.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-primary">{boardMetric.detail}</p>
              </div>

              <div className="neon-rivals-stat-card neon-rivals-stat-card--compact">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="section-kicker">Objective Progress</p>
                    <p className="mt-1 text-sm text-muted-foreground">{gameState.objectiveValue}/{gameState.objectiveTarget}</p>
                  </div>
                  <Trophy size={18} className="text-primary" />
                </div>
                <div className="neon-rivals-progress-track mt-4">
                  <div className="neon-rivals-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-primary">{progress}% | {getProgressDetail(gameState)}</p>
              </div>
            </div>

            <section className="neon-rivals-stage-panel neon-rivals-stage-panel--arena neon-rivals-stage-panel--priority">
              <div className="neon-rivals-stage-frame neon-rivals-stage-frame--arena neon-rivals-stage-frame--priority">
                <NeonRivalsGame
                  mode={selectedMode}
                  sessionSeed={sessionSeed}
                  playerName={user?.username ?? "Guest Rival"}
                  themeLabel="Neon Rivals"
                  onStateChange={setGameState}
                />
              </div>
            </section>
          </section>

          <aside className="neon-rivals-side-panel neon-rivals-side-panel--arena neon-rivals-side-panel--dense">
            {showArenaGuide ? (
              <div className="neon-rivals-stat-card neon-rivals-guide-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="section-kicker">Board Controls</p>
                    <p className="mt-2 text-lg font-black text-white">{activeMode.label}</p>
                  </div>
                  <div className="neon-rivals-stat-icon">
                    <BadgeHelp size={18} />
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {controlHints.map((hint) => (
                    <div key={hint} className="command-panel-soft px-4 py-3 text-sm leading-6 text-white/85">
                      {hint}
                    </div>
                  ))}
                </div>
                <Button onClick={() => dismissArenaHint(gameState.boardFamily)} variant="outline" size="sm" className="mt-4 w-full">
                  Dismiss For This Board Family
                </Button>
              </div>
            ) : null}

            <div className="neon-rivals-stat-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Run Modes</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Rotation memory is active. Recent mode and family cooldowns prevent obvious repeats.
                  </p>
                </div>
                <Zap size={18} className="text-primary" />
              </div>

              <div className="neon-rivals-family-filter-bar mt-4">
                {MODE_FAMILY_FILTERS.map((family) => (
                  <button
                    key={family}
                    type="button"
                    onClick={() => setModeFamilyFilter(family)}
                    className={`neon-rivals-family-chip ${modeFamilyFilter === family ? "neon-rivals-family-chip--active" : ""}`}
                  >
                    {boardFamilyLabel(family)}
                  </button>
                ))}
              </div>

              <div className="neon-rivals-mode-grid neon-rivals-mode-grid--compact mt-4">
                {visibleModes.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => launchBoard(option.id, modeFamilyFilter)}
                    className={`command-panel-soft neon-rivals-mode-button neon-rivals-mode-button--compact ${selectedMode === option.id ? "neon-rivals-mode-button--active" : ""}`}
                  >
                    <p className="font-hud text-[10px] uppercase tracking-[0.18em] text-primary">{option.kicker}</p>
                    <p className="mt-2 text-lg font-black text-white">{option.label}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
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
                <p className="mt-4 font-hud text-[11px] uppercase tracking-[0.16em] text-destructive">
                  Account profile needs repair before rewards can land.
                </p>
              ) : null}
            </div>

            <div className="neon-rivals-stat-card">
              <div className="flex items-center gap-3">
                <div className="neon-rivals-stat-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-base font-black text-white">Route Shell</p>
                  <p className="text-sm text-muted-foreground">
                    {theme.name} shell art frames the Phaser board while live objectives, solve logic, and reward sync stay inside the Arena.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-primary">
                {activeMode.kicker} | {Math.round(gameState.durationMs / 1000)}s runtime
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-primary">
                Recent rotation memory: {recentArenaHistory.slice(0, 4).map((entry) => boardFamilyLabel(entry.boardFamily)).join(" | ") || "fresh route"}
              </p>
              {gameState.targetColorLabel ? (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#ffe45d]">Target color: {gameState.targetColorLabel}</p>
              ) : null}
              {accountNeedsSync ? (
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-destructive">
                  Profile sync is required before reward banking can complete.
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
