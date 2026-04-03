import {
  ArrowLeft,
  Gauge,
  Shield,
  Sparkles,
  Swords,
  TimerReset,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NeonRivalsGame, { primeNeonRivalsExperience } from "@/components/game/NeonRivalsGame";
import { Button } from "@/components/ui/button";
import { HEAD_TO_HEAD_PRESETS } from "@/game/head-to-head/config";
import HeadToHeadMatchController from "@/game/head-to-head/controller";
import type {
  HeadToHeadPresetId,
  HeadToHeadSnapshot,
} from "@/game/head-to-head/types";
import type { NeonRivalsBoardFamily } from "@/game/types";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useAppPreferences } from "@/providers/AppPreferencesProvider";

const PRESET_ORDER: HeadToHeadPresetId[] = ["quick_match", "ranked", "extended"];

function resolvePreset(rawPreset: string | null): HeadToHeadPresetId {
  if (rawPreset === "quick_match" || rawPreset === "ranked" || rawPreset === "extended") {
    return rawPreset;
  }
  return "ranked";
}

function formatClock(totalMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(totalMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function boardFamilyLabel(boardFamily: NeonRivalsBoardFamily) {
  switch (boardFamily) {
    case "match3":
      return "Match";
    case "maze":
      return "Maze";
    case "pipe":
      return "Pipe";
    case "tile":
      return "Tile";
    case "number":
      return "Number";
    case "spatial":
      return "Spatial";
    case "memory":
      return "Memory";
    case "strategy":
      return "Strategy";
    case "quiz":
      return "Quiz";
  }
}

function chargePercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusTone(snapshot: HeadToHeadSnapshot) {
  if (snapshot.status === "finished") {
    return snapshot.winnerId === "player" ? "Victory" : "Defeat";
  }
  if (snapshot.status === "countdown") {
    return "Round booting";
  }
  return "Board live";
}

export default function HeadToHeadPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { recentArenaHistory, recordArenaHistory, setLastArenaMode } = useAppPreferences();
  const preset = resolvePreset(searchParams.get("preset"));
  const [matchSeed, setMatchSeed] = useState(() => Date.now());
  const [snapshot, setSnapshot] = useState<HeadToHeadSnapshot | null>(null);
  const controllerRef = useRef<HeadToHeadMatchController | null>(null);
  const recordedHistoryKeyRef = useRef<string | null>(null);
  const playerName = user?.username ?? "Guest Rival";

  useEffect(() => {
    void primeNeonRivalsExperience();
  }, []);

  useEffect(() => {
    if (searchParams.get("preset") === preset) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("preset", preset);
    setSearchParams(next, { replace: true });
  }, [preset, searchParams, setSearchParams]);

  useEffect(() => {
    const controller = new HeadToHeadMatchController({
      presetId: preset,
      playerName,
      seedHint: matchSeed,
      history: Array.isArray(recentArenaHistory) ? recentArenaHistory : [],
      currentMode: null,
      onSnapshot: setSnapshot,
    });

    controllerRef.current = controller;
    controller.start();

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [matchSeed, playerName, preset]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    const key = `${matchSeed}:${snapshot.mode.mode}`;
    if (recordedHistoryKeyRef.current === key) {
      return;
    }

    recordedHistoryKeyRef.current = key;
    recordArenaHistory(snapshot.mode.mode, snapshot.playerBoard.sessionSeed);
    setLastArenaMode(snapshot.mode.mode);
  }, [matchSeed, recordArenaHistory, setLastArenaMode, snapshot]);

  const activePreset = HEAD_TO_HEAD_PRESETS[preset];
  const timerLabel = snapshot?.status === "countdown"
    ? formatClock(snapshot.countdownMs)
    : formatClock(snapshot?.elapsedMs ?? 0);
  const playerEffects = snapshot?.player.activeStatuses ?? [];
  const opponentEffects = snapshot?.opponent.activeStatuses ?? [];
  const boardKey = snapshot
    ? `${snapshot.playerBoard.roundKey}:${snapshot.playerBoardModifiers.scrambleVersion}`
    : "booting";

  const recentLog = useMemo(() => (snapshot?.recentLog ?? []).slice(0, 4), [snapshot]);

  function restartMatch(nextPreset = preset) {
    recordedHistoryKeyRef.current = null;
    if (nextPreset !== preset) {
      const next = new URLSearchParams(searchParams);
      next.set("preset", nextPreset);
      setSearchParams(next, { replace: true });
    }
    setMatchSeed(Date.now());
  }

  if (!snapshot) {
    return (
      <div className="h2h-screen">
        <div className="h2h-shell h2h-shell--loading">
          <div className="h2h-loading-card">
            <p className="section-kicker">Head 2 Head</p>
            <h1 className="h2h-loading-title">Booting duel board</h1>
            <p className="h2h-loading-copy">Pulling the next live puzzle race.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h2h-screen">
      <div className="h2h-shell">
        <header className="h2h-topbar">
          <div className="h2h-titleblock">
            <p className="section-kicker">Head 2 Head</p>
            <div className="h2h-title-row">
              <h1 className="h2h-title">{snapshot.mode.label}</h1>
              <span className="h2h-pill">{boardFamilyLabel(snapshot.mode.boardFamily)}</span>
              <span className="h2h-pill">{activePreset.label}</span>
              <span className="h2h-pill">{statusTone(snapshot)}</span>
            </div>
            <p className="h2h-subtitle">{snapshot.mode.description}</p>
          </div>

          <div className="h2h-top-actions">
            <Button onClick={() => navigate("/play")} variant="outline" size="lg">
              <ArrowLeft size={16} />
              Back to Play
            </Button>
            {PRESET_ORDER.map((presetId) => (
              <button
                key={presetId}
                type="button"
                onClick={() => restartMatch(presetId)}
                className={cn("h2h-preset-chip", presetId === preset && "h2h-preset-chip--active")}
              >
                {HEAD_TO_HEAD_PRESETS[presetId].label}
              </button>
            ))}
          </div>
        </header>

        <div className="h2h-scorebar">
          <div className="h2h-scorecard h2h-scorecard--player">
            <div>
              <p className="section-kicker">You</p>
              <p className="h2h-score-name">{snapshot.player.displayName}</p>
            </div>
            <p className="h2h-score-value">{snapshot.player.score}</p>
            <div className="h2h-progress-track">
              <div className="h2h-progress-fill" style={{ width: `${Math.min(100, (snapshot.player.score / snapshot.targetScore) * 100)}%` }} />
            </div>
          </div>

          <div className="h2h-timer-card">
            <p className="section-kicker">Timer</p>
            <p className="h2h-timer-value">{timerLabel}</p>
            <p className="h2h-timer-copy">Target {snapshot.targetScore}</p>
          </div>

          <div className="h2h-scorecard h2h-scorecard--opponent">
            <div>
              <p className="section-kicker">Opponent</p>
              <p className="h2h-score-name">{snapshot.opponent.displayName}</p>
            </div>
            <p className="h2h-score-value">{snapshot.opponent.score}</p>
            <div className="h2h-progress-track">
              <div className="h2h-progress-fill h2h-progress-fill--opponent" style={{ width: `${Math.min(100, (snapshot.opponent.score / snapshot.targetScore) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="h2h-layout">
          <section className="h2h-board-panel">
            <div
              className={cn(
                "h2h-board-shell",
                snapshot.playerBoardModifiers.reversed && "h2h-board-shell--reversed",
              )}
            >
              <div className="h2h-board-stage">
                <NeonRivalsGame
                key={boardKey}
                className="h2h-board-game"
                mode={snapshot.playerBoard.mode}
                sessionSeed={snapshot.playerBoard.sessionSeed}
                playerName={snapshot.player.displayName}
                themeLabel="Head 2 Head"
                hudVariant="match"
                difficultyOverride={snapshot.playerBoard.difficulty}
                onStateChange={(state) => controllerRef.current?.handlePlayerBoardState(state)}
              />
              </div>

              {snapshot.status === "countdown" ? (
                <div className="h2h-board-overlay h2h-board-overlay--countdown">
                  <div className="h2h-board-banner">
                    <TimerReset size={18} />
                    <div>
                      <p className="section-kicker">Round booting</p>
                      <p className="h2h-banner-copy">Board goes live in {formatClock(snapshot.countdownMs)}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {snapshot.playerBoardModifiers.frozen ? (
                <div className="h2h-board-overlay h2h-board-overlay--freeze">
                  <div className="h2h-board-banner h2h-board-banner--warning">
                    <Zap size={18} />
                    <div>
                      <p className="section-kicker">Freeze Pulse</p>
                      <p className="h2h-banner-copy">Your board is briefly locked.</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {snapshot.incomingAttackLabel ? (
                <div className="h2h-warning-chip">Incoming: {snapshot.incomingAttackLabel}</div>
              ) : null}

              {snapshot.playerBoardModifiers.fogPatches.map((patch, index) => (
                <div
                  key={`${patch.left}:${patch.top}:${index}`}
                  className="h2h-fog-patch"
                  style={{
                    top: `${patch.top}%`,
                    left: `${patch.left}%`,
                    width: `${patch.width}%`,
                    height: `${patch.height}%`,
                    transform: `rotate(${patch.rotationDeg}deg)`,
                  }}
                />
              ))}

              {snapshot.status === "finished" ? (
                <div className="h2h-board-overlay h2h-board-overlay--result">
                  <div className="h2h-result-card">
                    <p className="section-kicker">Match complete</p>
                    <h2 className="h2h-result-title">
                      {snapshot.winnerId === "player" ? "Victory" : "Defeat"}
                    </h2>
                    <p className="h2h-result-copy">
                      {snapshot.winnerId === "player"
                        ? `You closed the race at ${snapshot.player.score}.`
                        : `${snapshot.opponent.displayName} reached ${snapshot.opponent.score} first.`}
                    </p>
                    <div className="h2h-result-actions">
                      <Button onClick={() => restartMatch()} variant="play" size="lg">
                        <Sparkles size={16} />
                        Play Again
                      </Button>
                      <Button onClick={() => navigate("/play")} variant="outline" size="lg">
                        <ArrowLeft size={16} />
                        Exit
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="h2h-sidepanel">
            <div className="h2h-panel-card">
              <div className="h2h-panel-header">
                <div>
                  <p className="section-kicker">Momentum</p>
                  <h2 className="h2h-panel-title">Race Pressure</h2>
                </div>
                <Gauge size={18} className="text-primary" />
              </div>
              <div className="h2h-momentum-grid">
                <div>
                  <p className="h2h-mini-label">You</p>
                  <div className="h2h-progress-track">
                    <div className="h2h-progress-fill" style={{ width: `${snapshot.player.momentum}%` }} />
                  </div>
                  <p className="h2h-mini-copy">{snapshot.player.momentumTier} | combo {snapshot.player.comboStreak}</p>
                </div>
                <div>
                  <p className="h2h-mini-label">Opponent</p>
                  <div className="h2h-progress-track">
                    <div className="h2h-progress-fill h2h-progress-fill--opponent" style={{ width: `${snapshot.opponent.momentum}%` }} />
                  </div>
                  <p className="h2h-mini-copy">{snapshot.opponent.momentumTier} | combo {snapshot.opponent.comboStreak}</p>
                </div>
              </div>
            </div>

            <div className="h2h-panel-card">
              <div className="h2h-panel-header">
                <div>
                  <p className="section-kicker">Abilities</p>
                  <h2 className="h2h-panel-title">Attack and defense</h2>
                </div>
                <Swords size={18} className="text-primary" />
              </div>
              <div className="h2h-ability-stack">
                <button
                  type="button"
                  onClick={() => controllerRef.current?.useAttack()}
                  className={cn("h2h-ability-card", snapshot.player.attackCharge >= 100 && "h2h-ability-card--ready")}
                >
                  <div className="h2h-ability-top">
                    <div>
                      <p className="section-kicker">Attack</p>
                      <p className="h2h-ability-title">{snapshot.player.nextAttack.replaceAll("_", " ")}</p>
                    </div>
                    <Zap size={16} />
                  </div>
                  <div className="h2h-progress-track">
                    <div className="h2h-progress-fill" style={{ width: `${chargePercent(snapshot.player.attackCharge)}%` }} />
                  </div>
                  <p className="h2h-mini-copy">
                    {snapshot.player.attackCharge >= 100 ? "Fire now" : `${chargePercent(snapshot.player.attackCharge)}% charged`}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => controllerRef.current?.useDefense()}
                  className={cn("h2h-ability-card", snapshot.player.defenseCharge >= 100 && "h2h-ability-card--ready")}
                >
                  <div className="h2h-ability-top">
                    <div>
                      <p className="section-kicker">Defense</p>
                      <p className="h2h-ability-title">{snapshot.player.nextDefense.replaceAll("_", " ")}</p>
                    </div>
                    <Shield size={16} />
                  </div>
                  <div className="h2h-progress-track">
                    <div className="h2h-progress-fill h2h-progress-fill--defense" style={{ width: `${chargePercent(snapshot.player.defenseCharge)}%` }} />
                  </div>
                  <p className="h2h-mini-copy">
                    {snapshot.player.defenseCharge >= 100 ? "Hold or cleanse" : `${chargePercent(snapshot.player.defenseCharge)}% charged`}
                  </p>
                </button>
              </div>
            </div>

            <div className="h2h-panel-card">
              <div className="h2h-panel-header">
                <div>
                  <p className="section-kicker">Status</p>
                  <h2 className="h2h-panel-title">Live effects</h2>
                </div>
                <Sparkles size={18} className="text-primary" />
              </div>
              <div className="h2h-status-grid">
                <div>
                  <p className="h2h-mini-label">You</p>
                  <div className="h2h-chip-row">
                    {playerEffects.length > 0 ? playerEffects.map((status) => (
                      <span key={status.id} className="h2h-status-chip">{status.label}</span>
                    )) : <span className="h2h-status-chip h2h-status-chip--muted">Clear</span>}
                  </div>
                </div>
                <div>
                  <p className="h2h-mini-label">Opponent</p>
                  <div className="h2h-chip-row">
                    {opponentEffects.length > 0 ? opponentEffects.map((status) => (
                      <span key={status.id} className="h2h-status-chip">{status.label}</span>
                    )) : <span className="h2h-status-chip h2h-status-chip--muted">Clear</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="h2h-panel-card">
              <div className="h2h-panel-header">
                <div>
                  <p className="section-kicker">Match Feed</p>
                  <h2 className="h2h-panel-title">Recent swings</h2>
                </div>
                <Sparkles size={18} className="text-primary" />
              </div>
              <div className="h2h-log-stack">
                {recentLog.map((entry) => (
                  <div key={entry.id} className={cn("h2h-log-line", `h2h-log-line--${entry.tone}`)}>
                    {entry.text}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
