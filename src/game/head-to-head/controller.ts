import {
  HEAD_TO_HEAD_ATTACK_ROTATION,
  HEAD_TO_HEAD_AUDIO_HOOKS,
  HEAD_TO_HEAD_BALANCE,
  HEAD_TO_HEAD_DEFENSE_ROTATION,
  HEAD_TO_HEAD_PRESETS,
  pickHeadToHeadMode,
} from "@/game/head-to-head/config";
import {
  buildBotSolveSample,
  getBotResolveAt,
  nextBotSeed,
} from "@/game/head-to-head/bot";
import {
  applyDisruptionPenalty,
  applyMistakePenalty,
  createStatusEffect,
  getAttackLabel,
  getDefenseLabel,
  getMomentumTier,
  hasActiveStatus,
  nextCharge,
  removeExpiredStatuses,
  resolveIncomingAttack,
  scoreSolve,
  updateMomentum,
} from "@/game/head-to-head/systems";
import type { NeonRivalsGameState } from "@/game/types";
import type {
  HeadToHeadAttackId,
  HeadToHeadBattleLogEntry,
  HeadToHeadBoardModifiers,
  HeadToHeadCombatantId,
  HeadToHeadCombatantState,
  HeadToHeadControllerOptions,
  HeadToHeadDefenseId,
  HeadToHeadFogPatch,
  HeadToHeadRoundState,
  HeadToHeadSnapshot,
  HeadToHeadStatusEffect,
} from "@/game/head-to-head/types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeSeed(seedHint: number) {
  const seed = Math.abs(Math.floor(seedHint)) || 1;
  return seed % 2147483647;
}

function nextSeedValue(seedHint: number) {
  const seed = normalizeSeed(seedHint);
  return (seed * 48271) % 2147483647;
}

function seededUnit(seedHint: number) {
  return (nextSeedValue(seedHint) - 1) / 2147483646;
}

function cycleAttack(current: HeadToHeadAttackId) {
  const index = HEAD_TO_HEAD_ATTACK_ROTATION.indexOf(current);
  return HEAD_TO_HEAD_ATTACK_ROTATION[(index + 1 + HEAD_TO_HEAD_ATTACK_ROTATION.length) % HEAD_TO_HEAD_ATTACK_ROTATION.length];
}

function cycleDefense(current: HeadToHeadDefenseId) {
  const index = HEAD_TO_HEAD_DEFENSE_ROTATION.indexOf(current);
  return HEAD_TO_HEAD_DEFENSE_ROTATION[(index + 1 + HEAD_TO_HEAD_DEFENSE_ROTATION.length) % HEAD_TO_HEAD_DEFENSE_ROTATION.length];
}

function createCombatant(id: HeadToHeadCombatantId, displayName: string): HeadToHeadCombatantState {
  return {
    id,
    displayName,
    score: 0,
    comboStreak: 0,
    comboTotal: 0,
    momentum: 0,
    momentumTier: "low",
    attackCharge: 0,
    defenseCharge: 0,
    nextAttack: HEAD_TO_HEAD_ATTACK_ROTATION[0],
    nextDefense: HEAD_TO_HEAD_DEFENSE_ROTATION[0],
    roundsSolved: 0,
    mistakes: 0,
    lastSolveMs: null,
    targetReachedAtMs: null,
    activeStatuses: [],
  };
}

function createRoundKey(mode: string, roundIndex: number, seed: number, scrambleVersion: number) {
  return `h2h:${mode}:${roundIndex}:${seed}:${scrambleVersion}`;
}

function buildFogPatches(seedHint: number): HeadToHeadFogPatch[] {
  const patches: HeadToHeadFogPatch[] = [];
  let seed = normalizeSeed(seedHint);

  for (let index = 0; index < 4; index += 1) {
    seed = nextSeedValue(seed + 19 + index * 31);
    const top = 8 + Math.round(seededUnit(seed + 7) * 70);
    const left = 8 + Math.round(seededUnit(seed + 17) * 70);
    const width = 12 + Math.round(seededUnit(seed + 29) * 16);
    const height = 10 + Math.round(seededUnit(seed + 41) * 14);
    const rotationDeg = Math.round(seededUnit(seed + 53) * 22) - 11;
    patches.push({ top, left, width, height, rotationDeg });
  }

  return patches;
}

function withStatusesRemoved(
  combatant: HeadToHeadCombatantState,
  predicate: (status: HeadToHeadStatusEffect) => boolean,
) {
  combatant.activeStatuses = combatant.activeStatuses.filter((status) => !predicate(status));
}

function removeShield(combatant: HeadToHeadCombatantState) {
  let removed = false;
  combatant.activeStatuses = combatant.activeStatuses.filter((status) => {
    if (!removed && status.abilityId === "shield") {
      removed = true;
      return false;
    }
    return true;
  });
}

function refreshMomentumTier(combatant: HeadToHeadCombatantState) {
  combatant.momentumTier = getMomentumTier(combatant.momentum);
}

export default class HeadToHeadMatchController {
  private readonly preset;
  private readonly playerName: string;
  private readonly opponentName: string;
  private readonly mode;
  private readonly onSnapshot?: (snapshot: HeadToHeadSnapshot) => void;
  private readonly onAudioCue?: (cue: keyof typeof HEAD_TO_HEAD_AUDIO_HOOKS) => void;
  private readonly startedSeed: number;

  private player = createCombatant("player", "Player");
  private opponent = createCombatant("opponent", "Rival Bot");
  private playerBoard: HeadToHeadRoundState;
  private playerScrambleVersion = 0;
  private recentLog: HeadToHeadBattleLogEntry[] = [];
  private status: HeadToHeadSnapshot["status"] = "countdown";
  private winnerId: HeadToHeadCombatantId | null = null;
  private finishedReason: string | null = null;
  private incomingAttackLabel: string | null = null;
  private incomingAttackUntilMs = 0;
  private snapshot: HeadToHeadSnapshot;
  private countdownEndsAtMs = 0;
  private liveStartedAtMs = 0;
  private pendingPlayerBoardAtMs: number | null = null;
  private botNextResolveAtMs: number | null = null;
  private botSeed: number;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private disposed = false;
  private lastResolvedBoardKey: string | null = null;

  constructor(options: HeadToHeadControllerOptions) {
    this.preset = HEAD_TO_HEAD_PRESETS[options.presetId];
    this.mode = pickHeadToHeadMode({
      seedHint: options.seedHint,
      history: options.history,
      currentMode: options.currentMode ?? null,
    });
    this.playerName = options.playerName;
    this.opponentName = options.opponentName ?? "Rival Bot";
    this.onSnapshot = options.onSnapshot;
    this.onAudioCue = options.onAudioCue;
    this.startedSeed = normalizeSeed(options.seedHint);
    this.botSeed = nextBotSeed(options.seedHint + 77);

    this.player = createCombatant("player", this.playerName);
    this.opponent = createCombatant("opponent", this.opponentName);
    this.playerBoard = this.createRoundState(1, this.mode.baseDifficulty, this.startedSeed);
    this.snapshot = this.buildSnapshot(Date.now());
  }

  start() {
    if (this.intervalHandle || this.disposed) {
      return;
    }

    const now = Date.now();
    this.status = "countdown";
    this.countdownEndsAtMs = now + HEAD_TO_HEAD_BALANCE.countdownMs;
    this.liveStartedAtMs = 0;
    this.pushLog("info", `${this.mode.label} is live. First to ${this.preset.targetScore} wins.`, now);
    this.emitSnapshot(now);
    this.intervalHandle = setInterval(() => this.tick(), 120);
  }

  destroy() {
    this.disposed = true;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  getSnapshot() {
    return this.snapshot;
  }

  handlePlayerBoardState(state: NeonRivalsGameState) {
    if (this.disposed || this.status === "finished") {
      return;
    }

    if (state.seed !== this.playerBoard.sessionSeed) {
      return;
    }

    if (state.status === "complete" && this.lastResolvedBoardKey !== this.playerBoard.roundKey) {
      this.lastResolvedBoardKey = this.playerBoard.roundKey;
      this.resolvePlayerSolve(state);
      return;
    }

    if (state.status === "failed" && this.lastResolvedBoardKey !== this.playerBoard.roundKey) {
      this.lastResolvedBoardKey = this.playerBoard.roundKey;
      this.resolvePlayerFailure();
    }
  }

  useAttack() {
    if (this.status !== "live" || this.player.attackCharge < 100) {
      return false;
    }

    const now = Date.now();
    this.activateAttack("player", now);
    this.emitSnapshot(now);
    return true;
  }

  useDefense() {
    if (this.status !== "live" || this.player.defenseCharge < 100) {
      return false;
    }

    const now = Date.now();
    this.activateDefense("player", now);
    this.emitSnapshot(now);
    return true;
  }

  private chooseAutoDefense(
    combatant: HeadToHeadCombatantState,
    now: number,
    incomingAttackId: HeadToHeadAttackId | null = null,
  ): HeadToHeadDefenseId | null {
    if (combatant.defenseCharge < HEAD_TO_HEAD_BALANCE.charge.threshold) {
      return null;
    }

    const activeAttackStatuses = combatant.activeStatuses.filter(
      (status) => status.kind === "attack" && status.endsAtMs > now,
    );

    if (incomingAttackId) {
      if (
        (incomingAttackId === "reverse_input" || incomingAttackId === "mini_scramble")
        && !hasActiveStatus(combatant, "anchor", now)
      ) {
        return "anchor";
      }

      if (incomingAttackId === "fog_tiles" || incomingAttackId === "freeze_pulse") {
        if (!hasActiveStatus(combatant, "shield", now)) {
          return "shield";
        }

        if (!hasActiveStatus(combatant, "focus_mode", now)) {
          return "focus_mode";
        }
      }

      if (!hasActiveStatus(combatant, "shield", now)) {
        return "shield";
      }

      return activeAttackStatuses.length > 0 ? "cleanse" : null;
    }

    if (activeAttackStatuses.length === 0) {
      return null;
    }

    if (
      activeAttackStatuses.some(
        (status) => status.abilityId === "reverse_input" || status.abilityId === "mini_scramble",
      ) && !hasActiveStatus(combatant, "anchor", now)
    ) {
      return "anchor";
    }

    if (
      activeAttackStatuses.some(
        (status) => status.abilityId === "fog_tiles" || status.abilityId === "freeze_pulse",
      ) && !hasActiveStatus(combatant, "focus_mode", now)
    ) {
      return "focus_mode";
    }

    return "cleanse";
  }

  private maybeAutoDeployDefense(
    combatantId: HeadToHeadCombatantId,
    now: number,
    incomingAttackId: HeadToHeadAttackId | null = null,
  ) {
    const combatant = combatantId === "player" ? this.player : this.opponent;
    const defenseId = this.chooseAutoDefense(combatant, now, incomingAttackId);

    if (!defenseId) {
      return false;
    }

    this.activateDefense(combatantId, now, defenseId, true);
    return true;
  }

  private maybeAutoDeployAttack(combatantId: HeadToHeadCombatantId, now: number) {
    const combatant = combatantId === "player" ? this.player : this.opponent;
    if (combatant.attackCharge < HEAD_TO_HEAD_BALANCE.charge.threshold) {
      return false;
    }

    this.activateAttack(combatantId, now, true);
    return true;
  }

  private tick() {
    if (this.disposed) {
      return;
    }

    const now = Date.now();
    this.player.activeStatuses = removeExpiredStatuses(this.player.activeStatuses, now);
    this.opponent.activeStatuses = removeExpiredStatuses(this.opponent.activeStatuses, now);

    if (this.incomingAttackUntilMs > 0 && now >= this.incomingAttackUntilMs) {
      this.incomingAttackUntilMs = 0;
      this.incomingAttackLabel = null;
    }

    if (this.status === "countdown" && now >= this.countdownEndsAtMs) {
      this.status = "live";
      this.liveStartedAtMs = now;
      this.botNextResolveAtMs = getBotResolveAt({
        now,
        mode: this.mode,
        difficulty: this.playerBoard.difficulty,
        combatant: this.opponent,
        seedHint: this.botSeed,
      });
      this.pushLog("info", `${this.mode.label} duel started.`, now);
    }

    if (this.status === "live") {
      this.maybeAutoDeployDefense("player", now);
      this.maybeAutoDeployDefense("opponent", now);

      if (this.pendingPlayerBoardAtMs && now >= this.pendingPlayerBoardAtMs) {
        this.pendingPlayerBoardAtMs = null;
        this.advancePlayerBoard();
      }

      if (this.botNextResolveAtMs && now >= this.botNextResolveAtMs) {
        this.resolveBotTurn(now);
      }
    }

    this.emitSnapshot(now);
  }

  private resolvePlayerSolve(state: NeonRivalsGameState) {
    const now = Date.now();
    const scoreGap = this.player.score - this.opponent.score;
    const outcome = scoreSolve(
      this.mode,
      {
        durationMs: state.durationMs,
        comboValue: Math.max(state.combo, state.maxCombo),
        matchedTiles: state.matchedTiles,
        movesLeft: state.movesLeft,
        flawless: state.status === "complete" && state.movesLeft > 0,
        sourceState: state,
      },
      this.player.momentumTier,
      scoreGap,
    );

    const previousTier = this.player.momentumTier;
    this.player.score += outcome.scoreDelta;
    this.player.comboStreak += 1 + outcome.comboStepDelta;
    this.player.comboTotal += 1 + outcome.comboStepDelta;
    this.player.momentum = updateMomentum(this.player.momentum, outcome.momentumDelta);
    refreshMomentumTier(this.player);
    this.player.attackCharge = nextCharge(this.player.attackCharge, outcome.attackChargeDelta);
    this.player.defenseCharge = nextCharge(this.player.defenseCharge, outcome.defenseChargeDelta);
    this.player.roundsSolved += 1;
    this.player.lastSolveMs = now;

    if (this.player.score >= this.preset.targetScore && !this.player.targetReachedAtMs) {
      this.player.targetReachedAtMs = now;
    }

    if (this.player.momentumTier !== previousTier) {
      this.onAudioCue?.("momentum");
    }

    if (
      Math.floor(this.player.score / HEAD_TO_HEAD_BALANCE.score.milestoneStep)
      > Math.floor((this.player.score - outcome.scoreDelta) / HEAD_TO_HEAD_BALANCE.score.milestoneStep)
    ) {
      this.onAudioCue?.("scoreMilestone");
    }

    this.pushLog(
      "score",
      `${this.player.displayName} solved clean for +${outcome.scoreDelta}.`,
      now,
    );

    this.maybeAutoDeployDefense("player", now);
    this.maybeAutoDeployAttack("player", now);
    this.queueNextPlayerBoard(now);
    this.checkForWinner(now);
    this.emitSnapshot(now);
  }

  private resolvePlayerFailure() {
    const now = Date.now();
    const penalty = applyMistakePenalty(this.player);
    this.player.momentum = penalty.momentum;
    this.player.comboStreak = penalty.comboStreak;
    this.player.mistakes += 1;
    refreshMomentumTier(this.player);
    this.pushLog("warning", `${this.player.displayName} lost the board and dropped momentum.`, now);
    this.maybeAutoDeployDefense("player", now);
    this.queueNextPlayerBoard(now);
    this.emitSnapshot(now);
  }

  private resolveBotTurn(now: number) {
    const difficulty = this.playerBoard.difficulty;
    const outcome = buildBotSolveSample({
      mode: this.mode,
      difficulty,
      combatant: this.opponent,
      seedHint: this.botSeed,
    });
    this.botSeed = nextBotSeed(this.botSeed + 97 + this.opponent.roundsSolved * 11);

    if (outcome.mistake) {
      const penalty = applyMistakePenalty(this.opponent);
      this.opponent.momentum = penalty.momentum;
      this.opponent.comboStreak = penalty.comboStreak;
      this.opponent.mistakes += 1;
      refreshMomentumTier(this.opponent);
      this.pushLog("warning", `${this.opponent.displayName} fumbled the board.`, now);
    } else {
      const scoreGap = this.opponent.score - this.player.score;
      const solveOutcome = scoreSolve(this.mode, outcome.sample, this.opponent.momentumTier, scoreGap);
      const previousTier = this.opponent.momentumTier;
      this.opponent.score += solveOutcome.scoreDelta;
      this.opponent.comboStreak += 1 + solveOutcome.comboStepDelta;
      this.opponent.comboTotal += 1 + solveOutcome.comboStepDelta;
      this.opponent.momentum = updateMomentum(this.opponent.momentum, solveOutcome.momentumDelta);
      refreshMomentumTier(this.opponent);
      this.opponent.attackCharge = nextCharge(this.opponent.attackCharge, solveOutcome.attackChargeDelta);
      this.opponent.defenseCharge = nextCharge(this.opponent.defenseCharge, solveOutcome.defenseChargeDelta);
      this.opponent.roundsSolved += 1;
      this.opponent.lastSolveMs = now;

      if (this.opponent.score >= this.preset.targetScore && !this.opponent.targetReachedAtMs) {
        this.opponent.targetReachedAtMs = now;
      }

      if (this.opponent.momentumTier !== previousTier) {
        this.onAudioCue?.("warning");
      }

      this.pushLog("score", `${this.opponent.displayName} solved for +${solveOutcome.scoreDelta}.`, now);
    }

    this.maybeAutoDeployDefense("opponent", now);
    this.maybeAutoDeployAttack("opponent", now);
    this.checkForWinner(now);
    this.botNextResolveAtMs = this.status === "live"
      ? getBotResolveAt({
          now,
          mode: this.mode,
          difficulty: this.playerBoard.difficulty,
          combatant: this.opponent,
          seedHint: this.botSeed,
        })
      : null;
    this.emitSnapshot(now);
  }

  private activateAttack(attackerId: HeadToHeadCombatantId, now: number, autoTriggered = false) {
    const attacker = attackerId === "player" ? this.player : this.opponent;
    const defender = attackerId === "player" ? this.opponent : this.player;
    const attackId = attacker.nextAttack;

    if (attacker.attackCharge < 100) {
      return;
    }

    attacker.attackCharge = 0;
    attacker.nextAttack = cycleAttack(attacker.nextAttack);
    this.maybeAutoDeployDefense(defender.id, now, attackId);

    const resolution = resolveIncomingAttack({ target: defender, attackId, now });
    this.onAudioCue?.("attack");

    if (resolution.blocked) {
      removeShield(defender);
      this.pushLog("defense", resolution.log, now);
      this.onAudioCue?.("defense");
      return;
    }

    if (resolution.ignored) {
      this.pushLog("defense", resolution.log, now);
      this.onAudioCue?.("defense");
      return;
    }

    const disruption = applyDisruptionPenalty(defender);
    defender.momentum = disruption.momentum;
    defender.comboStreak = disruption.comboStreak;
    refreshMomentumTier(defender);

    if (attackId === "mini_scramble") {
      if (defender.id === "player") {
        this.scramblePlayerBoard();
      } else if (this.botNextResolveAtMs) {
        this.botNextResolveAtMs += 700;
      }
    }

    defender.activeStatuses.push(
      createStatusEffect({
        id: `${attackId}:${now}:${defender.id}`,
        abilityId: attackId,
        kind: "attack",
        label: getAttackLabel(attackId),
        target: defender.id,
        startedAtMs: now,
        endsAtMs: now + resolution.durationMs,
      }),
    );

    if (defender.id === "player") {
      this.incomingAttackLabel = getAttackLabel(attackId);
      this.incomingAttackUntilMs = now + resolution.durationMs;
      this.onAudioCue?.("warning");
    }

    this.pushLog(
      "attack",
      autoTriggered ? `${getAttackLabel(attackId)} auto-fired at ${defender.displayName}.` : resolution.log,
      now,
    );
  }

  private activateDefense(
    combatantId: HeadToHeadCombatantId,
    now: number,
    defenseOverride?: HeadToHeadDefenseId,
    autoTriggered = false,
  ) {
    const combatant = combatantId === "player" ? this.player : this.opponent;
    const defenseId = defenseOverride ?? combatant.nextDefense;

    if (combatant.defenseCharge < 100) {
      return;
    }

    combatant.defenseCharge = 0;
    combatant.nextDefense = cycleDefense(defenseId);
    this.onAudioCue?.("defense");

    if (defenseId === "cleanse") {
      const removedCount = combatant.activeStatuses.filter((status) => status.kind === "attack").length;
      withStatusesRemoved(combatant, (status) => status.kind === "attack");
      this.pushLog(
        "defense",
        removedCount > 0
          ? `${combatant.displayName} ${autoTriggered ? "auto-cleansed" : "cleansed"} the board pressure.`
          : `${combatant.displayName} primed a late cleanse with no status to clear.`,
        now,
      );
      return;
    }

    const durationMs = HEAD_TO_HEAD_BALANCE.defenseDurationsMs[defenseId];
    combatant.activeStatuses.push(
      createStatusEffect({
        id: `${defenseId}:${now}:${combatant.id}`,
        abilityId: defenseId,
        kind: "defense",
        label: getDefenseLabel(defenseId),
        target: combatant.id,
        startedAtMs: now,
        endsAtMs: now + durationMs,
      }),
    );
    this.pushLog(
      "defense",
      `${combatant.displayName} ${autoTriggered ? "auto-raised" : "activated"} ${getDefenseLabel(defenseId)}.`,
      now,
    );
  }

  private scramblePlayerBoard() {
    this.playerScrambleVersion += 1;
    this.playerBoard = {
      ...this.playerBoard,
      sessionSeed: nextSeedValue(this.playerBoard.sessionSeed + this.playerScrambleVersion * 113),
      roundKey: createRoundKey(this.mode.mode, this.playerBoard.roundIndex, nextSeedValue(this.playerBoard.sessionSeed + this.playerScrambleVersion * 113), this.playerScrambleVersion),
    };
    this.lastResolvedBoardKey = null;
  }

  private queueNextPlayerBoard(now: number) {
    this.pendingPlayerBoardAtMs = now + 520;
  }

  private advancePlayerBoard() {
    const nextRoundIndex = this.playerBoard.roundIndex + 1;
    const difficulty = clamp(
      this.mode.baseDifficulty + Math.floor((nextRoundIndex - 1) / HEAD_TO_HEAD_BALANCE.roundDifficultyRampEvery),
      this.mode.baseDifficulty,
      HEAD_TO_HEAD_BALANCE.maxDifficulty,
    ) as 1 | 2 | 3 | 4 | 5;
    const seed = nextSeedValue(this.playerBoard.sessionSeed + nextRoundIndex * 53 + this.player.roundsSolved * 7 + this.player.mistakes * 11);

    this.playerScrambleVersion = 0;
    this.playerBoard = this.createRoundState(nextRoundIndex, difficulty, seed);
    this.lastResolvedBoardKey = null;
  }

  private createRoundState(roundIndex: number, difficulty: 1 | 2 | 3 | 4 | 5, seed: number): HeadToHeadRoundState {
    return {
      mode: this.mode.mode,
      boardFamily: this.mode.boardFamily,
      label: this.mode.label,
      difficulty,
      roundIndex,
      sessionSeed: seed,
      roundKey: createRoundKey(this.mode.mode, roundIndex, seed, this.playerScrambleVersion),
    };
  }

  private buildPlayerBoardModifiers(now: number): HeadToHeadBoardModifiers {
    const attackStatuses = this.player.activeStatuses.filter((status) => status.kind === "attack" && status.endsAtMs > now);
    const activeFog = attackStatuses.find((status) => status.abilityId === "fog_tiles");
    const freezeStatus = attackStatuses.find((status) => status.abilityId === "freeze_pulse");
    const freezeLocked = freezeStatus
      ? (now - freezeStatus.startedAtMs) % HEAD_TO_HEAD_BALANCE.freezePulse.cycleMs <= HEAD_TO_HEAD_BALANCE.freezePulse.lockMs
      : false;

    return {
      reversed: attackStatuses.some((status) => status.abilityId === "reverse_input"),
      frozen: freezeLocked,
      fogPatches: activeFog ? buildFogPatches(activeFog.startedAtMs + this.playerBoard.sessionSeed) : [],
      scrambleVersion: this.playerScrambleVersion,
      activeStatuses: [...this.player.activeStatuses],
    };
  }

  private pushLog(tone: HeadToHeadBattleLogEntry["tone"], text: string, atMs: number) {
    this.recentLog = [{ id: `${atMs}:${this.recentLog.length}`, tone, text, atMs }, ...this.recentLog].slice(0, 6);
  }

  private checkForWinner(now: number) {
    const playerHit = this.player.score >= this.preset.targetScore;
    const opponentHit = this.opponent.score >= this.preset.targetScore;

    if (!playerHit && !opponentHit) {
      return;
    }

    if (playerHit && !this.player.targetReachedAtMs) {
      this.player.targetReachedAtMs = now;
    }
    if (opponentHit && !this.opponent.targetReachedAtMs) {
      this.opponent.targetReachedAtMs = now;
    }

    if (this.player.score !== this.opponent.score) {
      this.finishMatch(this.player.score > this.opponent.score ? "player" : "opponent", now, "target_reached");
      return;
    }

    if (this.player.comboTotal !== this.opponent.comboTotal) {
      this.finishMatch(this.player.comboTotal > this.opponent.comboTotal ? "player" : "opponent", now, "combo_tiebreak");
      return;
    }

    const playerReachedAt = this.player.targetReachedAtMs ?? Number.POSITIVE_INFINITY;
    const opponentReachedAt = this.opponent.targetReachedAtMs ?? Number.POSITIVE_INFINITY;
    this.finishMatch(playerReachedAt <= opponentReachedAt ? "player" : "opponent", now, "time_tiebreak");
  }

  private finishMatch(winnerId: HeadToHeadCombatantId, now: number, reason: string) {
    this.status = "finished";
    this.winnerId = winnerId;
    this.finishedReason = reason;
    this.botNextResolveAtMs = null;
    this.pendingPlayerBoardAtMs = null;
    this.pushLog(
      winnerId === "player" ? "score" : "warning",
      winnerId === "player"
        ? `${this.player.displayName} reached ${this.player.score} and won the duel.`
        : `${this.opponent.displayName} closed the race at ${this.opponent.score}.`,
      now,
    );
    this.onAudioCue?.(winnerId === "player" ? "victory" : "defeat");
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private buildSnapshot(now: number): HeadToHeadSnapshot {
    const countdownMs = this.status === "countdown" ? Math.max(0, this.countdownEndsAtMs - now) : 0;
    const elapsedMs = this.liveStartedAtMs > 0 ? Math.max(0, now - this.liveStartedAtMs) : 0;

    return {
      status: this.status,
      preset: this.preset,
      mode: this.mode,
      targetScore: this.preset.targetScore,
      countdownMs,
      elapsedMs,
      player: { ...this.player, activeStatuses: [...this.player.activeStatuses] },
      opponent: { ...this.opponent, activeStatuses: [...this.opponent.activeStatuses] },
      playerBoard: { ...this.playerBoard },
      playerBoardModifiers: this.buildPlayerBoardModifiers(now),
      recentLog: [...this.recentLog],
      incomingAttackLabel: this.incomingAttackLabel,
      winnerId: this.winnerId,
      finishedReason: this.finishedReason,
    };
  }

  private emitSnapshot(now: number) {
    this.snapshot = this.buildSnapshot(now);
    this.onSnapshot?.(this.snapshot);
  }
}
