import {
  ArrowLeft,
  Shield,
  Sparkles,
  TimerReset,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import NeonRivalsGame, { primeNeonRivalsExperience } from "@/components/game/NeonRivalsGame";
import { Button } from "@/components/ui/button";
import { HEAD_TO_HEAD_PRESETS } from "@/game/head-to-head/config";
import HeadToHeadMatchController from "@/game/head-to-head/controller";
import type {
  HeadToHeadPresetId,
  HeadToHeadSnapshot,
} from "@/game/head-to-head/types";
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

function chargePercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function humanizeAbility(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizeEffects(statuses: HeadToHeadSnapshot["player"]["activeStatuses"]) {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return "Clear";
  }

  return statuses.map((status) => status.label).join(" � ");
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
  }, [matchSeed, playerName, preset, recentArenaHistory]);

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
      <div className="h2h-screen h2h-screen--arena">
        <div className="h2h-shell h2h-shell--loading h2h-shell--arena">
          <div className="h2h-loading-card">
            <p className="section-kicker">Head 2 Head</p>
            <h1 className="h2h-loading-title">Booting duel board</h1>
            <p className="h2h-loading-copy">Loading the next live puzzle race.</p>
          </div>
        </div>
      </div>
    );
  }

  const activePreset = HEAD_TO_HEAD_PRESETS[preset];
  const timerLabel = snapshot.status === "countdown"
    ? formatClock(snapshot.countdownMs)
    : formatClock(snapshot.elapsedMs);
  const boardKey = `${snapshot.playerBoard.roundKey}:${snapshot.playerBoardModifiers.scrambleVersion}`;
  const recentLog = snapshot.recentLog.slice(0, 2);
  const playerProgress = Math.min(100, (snapshot.player.score / snapshot.targetScore) * 100);
  const opponentProgress = Math.min(100, (snapshot.opponent.score / snapshot.targetScore) * 100);
  const playerStatusSummary = summarizeEffects(snapshot.player.activeStatuses);
  const opponentStatusSummary = summarizeEffects(snapshot.opponent.activeStatuses);
  const freezeStatusActive = snapshot.player.activeStatuses.some((status) => status.abilityId === "freeze_pulse");

  return (
    <div className="h2h-screen h2h-screen--arena">
      <div className="h2h-shell h2h-shell--arena">
        <section
          className={cn(
            "h2h-board-shell h2h-board-shell--arena",
            snapshot.playerBoardModifiers.reversed && "h2h-board-shell--reversed",
            snapshot.playerBoardModifiers.frozen && "h2h-board-shell--freeze-lock",
          )}
        >
          <div className="h2h-battle-hud">
            <Button
              onClick={() => navigate("/play")}
              variant="outline"
              size="sm"
              className="h2h-home-button"
            >
              <ArrowLeft size={15} />
              Home
            </Button>

            <div className="h2h-battle-scoreboard">
              <div className="h2h-player-track h2h-player-track--player">
                <div className="h2h-player-head">
                  <div>
                    <p className="section-kicker">You</p>
                    <p className="h2h-player-name">{snapshot.player.displayName}</p>
                  </div>
                  <p className="h2h-player-points">
                    {snapshot.player.score}
                    <span>/{snapshot.targetScore}</span>
                  </p>
                </div>
                <div className="h2h-track-bar">
                  <div className="h2h-track-fill" style={{ width: `${playerProgress}%` }} />
                </div>
                <p className="h2h-track-meta">
                  {snapshot.player.comboStreak} combo | {snapshot.player.momentumTier} momentum
                </p>
              </div>

              <div className="h2h-battle-timer">
                <p className="section-kicker">{activePreset.label}</p>
                <p className="h2h-battle-clock">{timerLabel}</p>
                <p className="h2h-track-meta">{snapshot.mode.label}</p>
              </div>

              <div className="h2h-player-track h2h-player-track--opponent">
                <div className="h2h-player-head">
                  <div>
                    <p className="section-kicker">Rival</p>
                    <p className="h2h-player-name">{snapshot.opponent.displayName}</p>
                  </div>
                  <p className="h2h-player-points">
                    {snapshot.opponent.score}
                    <span>/{snapshot.targetScore}</span>
                  </p>
                </div>
                <div className="h2h-track-bar">
                  <div className="h2h-track-fill h2h-track-fill--opponent" style={{ width: `${opponentProgress}%` }} />
                </div>
                <p className="h2h-track-meta">
                  {snapshot.opponent.comboStreak} combo | {snapshot.opponent.momentumTier} momentum
                </p>
              </div>
            </div>
          </div>

          <div className="h2h-board-stage h2h-board-stage--arena">
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

          {freezeStatusActive ? (
            <div
              className={cn(
                "h2h-board-overlay h2h-board-overlay--freeze",
                snapshot.playerBoardModifiers.frozen && "h2h-board-overlay--freeze-lock",
              )}
            >
              <div className="h2h-board-banner h2h-board-banner--warning">
                <Zap size={18} />
                <div>
                  <p className="section-kicker">Freeze Pulse</p>
                  <p className="h2h-banner-copy">
                    The pulse is dragging your inputs and breaking your tempo.
                  </p>
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

          <div className="h2h-battle-dock">
            <div className="h2h-auto-strip">
              <div className="h2h-auto-pill">
                <Zap size={14} />
                <span>Attack {chargePercent(snapshot.player.attackCharge)}%</span>
                <strong>{humanizeAbility(snapshot.player.nextAttack)}</strong>
              </div>
              <div className="h2h-auto-pill">
                <Shield size={14} />
                <span>Defense {chargePercent(snapshot.player.defenseCharge)}%</span>
                <strong>Auto counter</strong>
              </div>
            </div>

            <div className="h2h-status-strip">
              <div className="h2h-status-group">
                <p className="h2h-status-caption">You</p>
                <p className="h2h-status-text">{playerStatusSummary}</p>
              </div>
              <div className="h2h-status-group">
                <p className="h2h-status-caption">Rival</p>
                <p className="h2h-status-text">{opponentStatusSummary}</p>
              </div>
            </div>

            {recentLog.length > 0 ? (
              <div className="h2h-feed-strip">
                {recentLog.map((entry) => (
                  <div key={entry.id} className={cn("h2h-feed-chip", `h2h-feed-chip--${entry.tone}`)}>
                    {entry.text}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

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
                <div className="h2h-feed-strip h2h-feed-strip--result">
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
        </section>
      </div>
    </div>
  );
}
