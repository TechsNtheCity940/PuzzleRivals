import Phaser from "phaser";
import {
  buildGeneratedQuizRounds,
  type GeneratedQuizRound,
  type QuizPuzzleKind,
} from "../../../shared/match-quiz-content";
import {
  buildNeonRivalsObjective,
  getObjectiveProgressPercent,
} from "@/game/config/runModes";
import type {
  NeonRivalsGameBridge,
  NeonRivalsGameState,
  NeonRivalsGameStatus,
  NeonRivalsRunMode,
} from "@/game/types";
import {
  BOARD_VIEWPORT_CENTER_X,
  BOARD_VIEWPORT_CENTER_Y,
  BOARD_VIEWPORT_HEIGHT,
  BOARD_VIEWPORT_WIDTH,
  TILE_TYPES,
  type TileTextureKey,
} from "@/game/utils/constants";

interface QuizBoardOptions {
  bridge?: NeonRivalsGameBridge;
  seed: number;
  mode: NeonRivalsRunMode;
}

interface OptionPanelVisual {
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Rectangle;
  frame: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  kicker: Phaser.GameObjects.Text;
}

function emptyColorProgress() {
  return TILE_TYPES.reduce((accumulator, tileType) => {
    accumulator[tileType] = 0;
    return accumulator;
  }, {} as Partial<Record<TileTextureKey, number>>);
}

function getQuizKind(mode: NeonRivalsRunMode): QuizPuzzleKind {
  switch (mode) {
    case "trivia_blitz":
      return "trivia_blitz";
    case "geography_dash":
      return "geography_quiz";
    case "science_spark":
      return "science_quiz";
    case "analogy_arc":
      return "analogies";
    case "vocabulary_duel":
      return "vocabulary_duel";
    default:
      return "riddle_choice";
  }
}

function getQuizPalette(mode: NeonRivalsRunMode) {
  if (mode === "science_spark") {
    return { accent: 0x72f5ff, accentSoft: 0x17364e, secondary: 0xb88aff, correct: 0xc8ff4d, wrong: 0xff5d8f };
  }
  if (mode === "geography_dash") {
    return { accent: 0x65f2ff, accentSoft: 0x163245, secondary: 0x7cffb6, correct: 0xc8ff4d, wrong: 0xff6d92 };
  }
  if (mode === "trivia_blitz") {
    return { accent: 0xffd86d, accentSoft: 0x3d2b18, secondary: 0x65f2ff, correct: 0xc8ff4d, wrong: 0xff5d8f };
  }
  if (mode === "analogy_arc") {
    return { accent: 0xc28cff, accentSoft: 0x25193f, secondary: 0x65f2ff, correct: 0xc8ff4d, wrong: 0xff6aa6 };
  }
  if (mode === "vocabulary_duel") {
    return { accent: 0xff9ce1, accentSoft: 0x351d3b, secondary: 0x65f2ff, correct: 0xc8ff4d, wrong: 0xff6d92 };
  }
  return { accent: 0x65f2ff, accentSoft: 0x162d44, secondary: 0xff8bc8, correct: 0xc8ff4d, wrong: 0xff5d8f };
}

function getOptionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

export default class QuizBoard {
  private scene: Phaser.Scene;
  private bridge?: NeonRivalsGameBridge;
  private sessionSeed: number;
  private mode: NeonRivalsRunMode;
  private objective: ReturnType<typeof buildNeonRivalsObjective>;
  private rounds: GeneratedQuizRound[] = [];
  private status: NeonRivalsGameStatus = "booting";
  private inputLocked = false;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private matchedTiles = 0;
  private movesLeft = 10;
  private targetScore = 1680;
  private runStartedAtMs = 0;
  private roundIndex = 0;
  private boardShadow?: Phaser.GameObjects.Rectangle;
  private boardFrame?: Phaser.GameObjects.Rectangle;
  private scanLine?: Phaser.GameObjects.Rectangle;
  private promptPanel?: Phaser.GameObjects.Rectangle;
  private titleText?: Phaser.GameObjects.Text;
  private roundText?: Phaser.GameObjects.Text;
  private helperText?: Phaser.GameObjects.Text;
  private optionPanels: OptionPanelVisual[] = [];

  constructor(scene: Phaser.Scene, options: QuizBoardOptions) {
    this.scene = scene;
    this.bridge = options.bridge;
    this.sessionSeed = Math.max(1, options.seed >>> 0);
    this.mode = options.mode;
    this.objective = buildNeonRivalsObjective(this.mode, this.sessionSeed);
    this.rounds = buildGeneratedQuizRounds(getQuizKind(this.mode), this.sessionSeed, 4);
  }

  create() {
    this.movesLeft = this.objective.startingMoves;
    this.targetScore = this.objective.targetScore;
    this.runStartedAtMs = this.scene.time.now;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.matchedTiles = 0;
    this.roundIndex = 0;
    this.buildBoardSurface();
    this.renderRound();
    this.status = "running";
    this.emitState();
  }

  destroy() {
    this.boardShadow?.destroy();
    this.boardFrame?.destroy();
    this.scanLine?.destroy();
    this.promptPanel?.destroy();
    this.titleText?.destroy();
    this.roundText?.destroy();
    this.helperText?.destroy();
    this.optionPanels.forEach((panel) => panel.container.destroy());
    this.optionPanels = [];
  }

  private buildBoardSurface() {
    const palette = getQuizPalette(this.mode);
    const panelWidth = Math.min(BOARD_VIEWPORT_WIDTH - 40, 712);
    const panelHeight = Math.min(BOARD_VIEWPORT_HEIGHT - 10, 730);

    this.boardShadow = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y + 18,
      panelWidth + 72,
      panelHeight + 88,
      0x06101e,
      0.92,
    );
    this.boardShadow.setStrokeStyle(2, palette.accent, 0.16);
    this.boardShadow.setDepth(18);

    this.boardFrame = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y + 18,
      panelWidth + 24,
      panelHeight + 26,
      0x08182e,
      0.58,
    );
    this.boardFrame.setStrokeStyle(3, palette.accent, 0.28);
    this.boardFrame.setDepth(20);

    this.scanLine = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y - panelHeight / 2 + 16,
      panelWidth,
      9,
      palette.secondary,
      0.08,
    );
    this.scanLine.setDepth(21);
    this.scene.tweens.add({
      targets: this.scanLine,
      y: BOARD_VIEWPORT_CENTER_Y + panelHeight / 2 - 16,
      alpha: { from: 0.03, to: 0.15 },
      duration: 2400,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.roundText = this.scene.add
      .text(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y - 302, "ROUND 1/1", {
        fontFamily: "Chakra Petch, Arial",
        fontSize: "24px",
        color: "#65f2ff",
        letterSpacing: 6,
      })
      .setOrigin(0.5)
      .setDepth(28);

    this.titleText = this.scene.add
      .text(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y - 262, "", {
        fontFamily: "Arial Black, Arial",
        fontSize: "30px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: panelWidth - 110 },
        lineSpacing: 10,
      })
      .setOrigin(0.5, 0)
      .setDepth(28);

    this.helperText = this.scene.add
      .text(
        BOARD_VIEWPORT_CENTER_X,
        BOARD_VIEWPORT_CENTER_Y - 122,
        "Read the prompt first, then fire the cleanest answer lane.",
        {
          fontFamily: "Chakra Petch, Arial",
          fontSize: "17px",
          color: "#b8c9de",
          align: "center",
          wordWrap: { width: panelWidth - 140 },
        },
      )
      .setOrigin(0.5, 0)
      .setDepth(28);

    this.promptPanel = this.scene.add.rectangle(
      BOARD_VIEWPORT_CENTER_X,
      BOARD_VIEWPORT_CENTER_Y - 176,
      panelWidth - 80,
      116,
      palette.accentSoft,
      0.18,
    );
    this.promptPanel.setStrokeStyle(2, palette.accent, 0.38);
    this.promptPanel.setDepth(26);

    const optionWidth = 286;
    const optionHeight = 162;
    const startX = BOARD_VIEWPORT_CENTER_X - optionWidth / 2 - 30;
    const startY = BOARD_VIEWPORT_CENTER_Y + 48;
    this.optionPanels = [
      this.createOptionPanel(startX, startY, optionWidth, optionHeight, 0),
      this.createOptionPanel(startX + optionWidth + 60, startY, optionWidth, optionHeight, 1),
      this.createOptionPanel(startX, startY + optionHeight + 34, optionWidth, optionHeight, 2),
      this.createOptionPanel(startX + optionWidth + 60, startY + optionHeight + 34, optionWidth, optionHeight, 3),
    ];
  }

  private createOptionPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    optionIndex: number,
  ) {
    const palette = getQuizPalette(this.mode);
    const container = this.scene.add.container(x, y);
    container.setSize(width, height);
    container.setDepth(32);

    const glow = this.scene.add.rectangle(0, 0, width, height, palette.secondary, 0.05);
    const frame = this.scene.add.rectangle(0, 0, width - 10, height - 10, 0x10192f, 0.94);
    frame.setStrokeStyle(2, palette.accent, 0.3);
    const kicker = this.scene.add.text(-width / 2 + 20, -height / 2 + 16, getOptionLabel(optionIndex), {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "18px",
      color: "#c8ff4d",
      letterSpacing: 4,
    });
    const text = this.scene.add.text(0, 12, "", {
      fontFamily: "Chakra Petch, Arial",
      fontSize: "22px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: width - 48 },
      lineSpacing: 8,
    }).setOrigin(0.5);

    container.add([glow, frame, kicker, text]);
    container.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);
    container.on("pointerdown", () => {
      void this.handleOption(optionIndex);
    });
    container.on("pointerover", () => {
      if (this.inputLocked || this.status !== "running") return;
      glow.setFillStyle(palette.secondary, 0.13);
      frame.setStrokeStyle(2, palette.secondary, 0.7);
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 120,
        ease: "Sine.easeOut",
      });
    });
    container.on("pointerout", () => {
      this.resetOptionPanel(optionIndex);
    });

    return { container, glow, frame, text, kicker };
  }

  private renderRound() {
    const round = this.rounds[this.roundIndex];
    this.roundText?.setText(`ROUND ${this.roundIndex + 1}/${this.rounds.length}`);
    this.titleText?.setText(round.prompt);
    this.helperText?.setText(this.getHelperText());

    this.optionPanels.forEach((panel, index) => {
      panel.text.setText(round.options[index]);
      this.resetOptionPanel(index);
    });
  }

  private getHelperText() {
    if (this.mode === "trivia_blitz") {
      return "Facts move fast. Clean streaks matter more than one lucky recovery.";
    }
    if (this.mode === "geography_dash") {
      return "Read the capital, landmark, or country prompt before you chase the bright panel.";
    }
    if (this.mode === "science_spark") {
      return "Element symbols and system clues are mixed together. Read before you fire.";
    }
    if (this.mode === "analogy_arc") {
      return "Treat the relation as the real puzzle. Surface wording is usually a distraction.";
    }
    if (this.mode === "vocabulary_duel") {
      return "Close distractors are intentional. Pick the cleanest meaning, not the flashiest word.";
    }
    return "Read the riddle first, then commit to the strongest answer lane.";
  }

  private resetOptionPanel(index: number) {
    const palette = getQuizPalette(this.mode);
    const panel = this.optionPanels[index];
    panel.glow.setFillStyle(palette.secondary, 0.05);
    panel.frame.setStrokeStyle(2, palette.accent, 0.3);
    panel.container.setScale(1);
    panel.container.setAngle(0);
  }

  private async handleOption(optionIndex: number) {
    if (this.inputLocked || this.status === "complete" || this.status === "failed") {
      return;
    }

    const round = this.rounds[this.roundIndex];
    const panel = this.optionPanels[optionIndex];
    const palette = getQuizPalette(this.mode);
    this.inputLocked = true;
    this.movesLeft = Math.max(0, this.movesLeft - 1);

    if (optionIndex === round.correctOption) {
      this.score += 175 + Math.max(0, this.movesLeft * 8);
      this.combo += 1;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.matchedTiles = this.roundIndex + 1;
      this.scene.events.emit("board-combo");
      await this.playCorrectOption(panel, palette.correct);

      if (this.roundIndex === this.rounds.length - 1) {
        this.status = "complete";
        this.emitState();
        await this.playCompletion();
        this.emitState();
        this.bridge?.onComplete?.(this.snapshotState());
        return;
      }

      this.roundIndex += 1;
      this.status = "running";
      this.renderRound();
      this.inputLocked = false;
      this.emitState();
      return;
    }

    this.combo = 0;
    this.score += 35;
    await this.playWrongOption(panel, palette.wrong);

    if (this.movesLeft <= 0) {
      this.status = "failed";
      this.emitState();
      await this.playFailure();
      this.emitState();
      this.bridge?.onFailed?.(this.snapshotState());
      return;
    }

    this.status = "running";
    this.inputLocked = false;
    this.emitState();
  }

  private async playCorrectOption(panel: OptionPanelVisual, color: number) {
    panel.glow.setFillStyle(color, 0.18);
    panel.frame.setStrokeStyle(2, color, 0.88);
    const burst = this.scene.add.image(panel.container.x, panel.container.y, "impact_ring");
    burst.setTint(color);
    burst.setDepth(40);
    burst.setAlpha(0.26);
    burst.setScale(0.4);

    await Promise.all([
      this.tweenPromise(panel.container, {
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 170,
        yoyo: true,
        ease: "Sine.easeInOut",
      }),
      this.tweenPromise(burst, {
        alpha: 0,
        scaleX: 1.24,
        scaleY: 1.24,
        duration: 240,
        ease: "Cubic.easeOut",
      }),
    ]);

    burst.destroy();
  }

  private async playWrongOption(panel: OptionPanelVisual, color: number) {
    panel.glow.setFillStyle(color, 0.16);
    panel.frame.setStrokeStyle(2, color, 0.84);
    this.scene.cameras.main.shake(100, 0.0016);
    await this.tweenPromise(panel.container, {
      angle: 5,
      duration: 70,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
    });
    this.resetOptionPanel(this.optionPanels.indexOf(panel));
  }

  private async playCompletion() {
    const burst = this.scene.add.image(BOARD_VIEWPORT_CENTER_X, BOARD_VIEWPORT_CENTER_Y + 30, "combo_burst");
    burst.setTint(getQuizPalette(this.mode).secondary);
    burst.setDepth(42);
    burst.setAlpha(0.64);
    burst.setScale(0.38);
    await this.tweenPromise(burst, {
      alpha: 0,
      scaleX: 2.4,
      scaleY: 2.4,
      duration: 460,
      ease: "Cubic.easeOut",
    });
    burst.destroy();
  }

  private async playFailure() {
    this.scene.cameras.main.shake(170, 0.002);
    if (this.boardFrame) {
      await this.tweenPromise(this.boardFrame, {
        alpha: 0.2,
        duration: 180,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }
  }

  private getProgressPercent() {
    return Math.max(0, Math.min(100, Math.round((this.matchedTiles / Math.max(this.rounds.length, 1)) * 100)));
  }

  private snapshotState(): NeonRivalsGameState {
    const objectiveValue = this.getProgressPercent();
    return {
      status: this.status,
      mode: this.mode,
      boardFamily: this.objective.boardFamily,
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      movesLeft: this.movesLeft,
      resourceLabel: this.objective.resourceLabel,
      targetScore: this.targetScore,
      matchedTiles: this.matchedTiles,
      objectiveTitle: this.objective.title,
      objectiveLabel: this.objective.label,
      objectiveDescription: this.objective.description,
      objectiveValue,
      objectiveTarget: this.objective.targetValue,
      objectiveProgressPercent: getObjectiveProgressPercent(objectiveValue, this.objective.targetValue),
      clearedByColor: emptyColorProgress(),
      durationMs: Math.max(0, Math.round(this.scene.time.now - this.runStartedAtMs)),
      seed: this.sessionSeed,
    };
  }

  private emitState() {
    const snapshot = this.snapshotState();
    this.scene.events.emit("board-state", snapshot);
    this.bridge?.onStateChange?.(snapshot);
  }

  private tweenPromise(
    target: Phaser.Tweens.TweenTarget | undefined,
    config: Omit<Phaser.Types.Tweens.TweenBuilderConfig, "targets">,
  ) {
    if (!target) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: target,
        ...config,
        onComplete: () => resolve(),
      });
    });
  }
}
