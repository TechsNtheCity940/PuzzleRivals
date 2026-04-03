import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  Flame,
  Sparkles,
  Swords,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { primeNeonRivalsExperience } from "@/components/game/NeonRivalsGame";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { Button } from "@/components/ui/button";
import {
  loadDiscoveryContent,
  type GameContentResolution,
  type GameContentSource,
} from "@/lib/game-content";
import { useAuth } from "@/providers/AuthProvider";
import { useAppPreferences } from "@/providers/AppPreferencesProvider";
import { getRankBand, getRankColor } from "@/lib/seed-data";
import type { DailyChallenge } from "@/lib/types";

type PlayMode =
  | "ranked"
  | "head_to_head"
  | "casual"
  | "royale"
  | "revenge"
  | "challenge"
  | "daily";

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

const MODES = [
  {
    id: "ranked" as PlayMode,
    label: "Ranked",
    icon: Swords,
    desc: "4-player ladder lobby",
    status: "Armed",
  },
  {
    id: "head_to_head" as PlayMode,
    label: "Head 2 Head",
    icon: Zap,
    desc: "1v1 score race",
    status: "Duel",
  },
  {
    id: "casual" as PlayMode,
    label: "Casual",
    icon: Zap,
    desc: "No-rank generated runs",
    status: "Queue",
  },
  {
    id: "royale" as PlayMode,
    label: "Royale",
    icon: Crown,
    desc: "High stakes elimination",
    status: "Queue",
  },
  {
    id: "revenge" as PlayMode,
    label: "Revenge",
    icon: Flame,
    desc: "2-player rivalry duel",
    status: "Queue",
  },
  {
    id: "challenge" as PlayMode,
    label: "Challenge",
    icon: Target,
    desc: "Train your weak spots",
    status: "Queue",
  },
  {
    id: "daily" as PlayMode,
    label: "Daily",
    icon: Users,
    desc: "Elite daily variant",
    status: "Queue",
  },
];

function sourceLabel(source: GameContentSource) {
  return source === "supabase" ? "Live" : "Offline";
}

function describeChallengeResolution(resolution: GameContentResolution) {
  if (resolution === "empty")
    return "The live daily challenge queue is empty right now.";
  if (resolution === "unavailable")
    return "Live daily challenge data is currently unavailable.";
  return "Daily challenge data is unavailable in this environment.";
}

function canPrewarmNeonRivals() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const connection = (
    navigator as Navigator & { connection?: NetworkInformationLike }
  ).connection;
  return (
    !connection?.saveData &&
    connection?.effectiveType !== "slow-2g" &&
    connection?.effectiveType !== "2g"
  );
}

function primeNeonRivalsRoute(assets = true) {
  void import("./NeonRivalsGamePage");
  void import("./HeadToHeadPage");
  if (assets) {
    void primeNeonRivalsExperience();
  }
}

export default function PlayPage() {
  const navigate = useNavigate();
  const { openSignUp } = useAuthDialog();
  const { user, canSave, hasSession, isReady, signOut } = useAuth();
  const { lastArenaMode, lowBandwidthMode } = useAppPreferences();
  const accountNeedsSync = hasSession && !user;
  const [selectedMode, setSelectedMode] = useState<PlayMode>("ranked");
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(
    null,
  );
  const [dailySource, setDailySource] = useState<GameContentSource>("supabase");
  const [dailyResolution, setDailyResolution] =
    useState<GameContentResolution>("unavailable");
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const rankBand = getRankBand(user?.elo ?? 0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsContentLoading(true);
      setContentError(null);

      try {
        const discovery = await loadDiscoveryContent();
        if (cancelled) return;

        setDailyChallenge(discovery.dailyChallenges[0] ?? null);
        setDailySource(discovery.sources.dailyChallenges);
        setDailyResolution(discovery.resolutions.dailyChallenges);
      } catch (error) {
        if (cancelled) return;
        setContentError(
          error instanceof Error
            ? error.message
            : "Failed to load today's challenge.",
        );
      } finally {
        if (!cancelled) {
          setIsContentLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (lowBandwidthMode || !canPrewarmNeonRivals()) {
      return;
    }

    let cancelled = false;
    const prime = () => {
      if (!cancelled) {
        primeNeonRivalsRoute(false);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(prime, { timeout: 1800 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(handle);
      };
    }

    const timeout = window.setTimeout(prime, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [lowBandwidthMode]);

  const selectedConfig = useMemo(() => {
    if (selectedMode === "head_to_head") {
      return {
        lobby: "2 Players",
        steps: [
          "One random continuous Phaser puzzle family per round.",
          "12s practice warm-up, then first to 100 wins.",
          "No chess, checkers, or word-riddle boards in this queue.",
        ],
      };
    }

    const revenge = selectedMode === "revenge";
    return {
      lobby: revenge ? "2 Players" : "4 Players",
      steps: revenge
        ? [
            "Targets your weak spot",
            "Weights their strongest category",
            "Can repeat last loss puzzle",
          ]
        : ["Random ranked puzzle", "12s practice warm-up", "Fresh live board"],
    };
  }, [selectedMode]);

  const selectedModeMeta = MODES.find((mode) => mode.id === selectedMode);
  const arenaHref = `/play/neon-rival?mode=${lastArenaMode}`;
  const queueHref = `/match?mode=${selectedMode}`;

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Queue Select"
          title="Play Now"
          subtitle={
            accountNeedsSync
              ? "Signed in, but profile sync is unavailable. Sign out and retry before queuing."
              : `${rankBand.label} - ELO ${user?.elo ?? 0}`
          }
          right={
            <div className="spotlight-panel">
              <p className="section-kicker">Lobby Rule</p>
              <p className="mt-2 text-3xl font-black">{selectedConfig.lobby}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Built for quick access, fast queue reads, and zero hidden tiles.
              </p>
            </div>
          }
        />

        <section className="hero-panel">
          <div className="hero-grid">
            <div className="section-stack">
              <div>
                <p className="section-kicker">Queue Select</p>
                <h2 className="hero-title text-3xl md:text-4xl">
                  {selectedModeMeta?.label} mode locked in
                </h2>
                <p className="hero-subtitle mt-3">
                  {selectedMode === "head_to_head"
                    ? "Head 2 Head now runs through the live queue. Two players load the same random continuous board family, get a short practice round, and race to 100 before the timer burns out."
                    : "Ranked uses a random lobby-selected Phaser board with a practice warm-up, then a live battle. Other queues keep the same fast-entry shell."}
                </p>
              </div>
              <Button
                onClick={() => {
                  if (accountNeedsSync) {
                    void signOut();
                    return;
                  }
                  if (canSave) {
                    navigate(queueHref);
                    return;
                  }
                  openSignUp();
                }}
                variant="play"
                size="xl"
                className="w-full sm:w-auto"
                disabled={!isReady || (!user && !accountNeedsSync)}
              >
                <Swords size={18} />
                {!isReady
                  ? "Syncing Account..."
                  : accountNeedsSync
                    ? "Sign Out To Retry"
                    : canSave
                      ? selectedMode === "head_to_head"
                        ? "Join Duel"
                        : "Join Queue"
                      : "Sign Up To Compete"}
              </Button>
            </div>

            <div className="spotlight-panel">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Arena Snapshot</p>
                  <h3 className="section-title">Resume {lastArenaMode.replaceAll("_", " ")}</h3>
                </div>
                <span
                  className={`font-hud text-[10px] uppercase tracking-[0.18em] ${getRankColor(
                    user?.rank ?? "bronze",
                  )}`}
                >
                  {rankBand.label}
                </span>
              </div>
              <div className="section-stack">
                {selectedConfig.steps.map((step) => (
                  <div
                    key={step}
                    className="command-panel-soft px-4 py-3 text-sm text-muted-foreground"
                  >
                    {step}
                  </div>
                ))}
                <div className="command-panel-soft px-4 py-3 text-sm leading-6 text-muted-foreground">
                  {lowBandwidthMode
                    ? "Low-bandwidth mode is active. The Phaser bundle will only load when you explicitly open the Arena route."
                    : "Route priming stays enabled so the Phaser board is warm before the duel or ranked route loads."}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="page-grid">
          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Queue Modes</p>
                <h2 className="section-title">Every lane stays reachable</h2>
              </div>
            </div>
            <div className="deck-grid">
              {MODES.map((mode) => (
                <PuzzleTileButton
                  key={mode.id}
                  icon={mode.icon}
                  title={mode.label}
                  description={mode.desc}
                  active={selectedMode === mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  right={
                    <span
                      className={`font-hud text-[10px] uppercase tracking-[0.16em] ${
                        selectedMode === mode.id
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {selectedMode === mode.id ? mode.status : "Queue"}
                    </span>
                  }
                />
              ))}
            </div>
          </section>

          <div className="section-stack">
            <section className="section-panel">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Arena</p>
                  <h2 className="section-title">Open the Arena</h2>
                </div>
                <Sparkles size={18} className="text-primary" />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Jump straight into the Arena and focus on the live animated board, the round timer, and the current challenge.
              </p>
              <Button
                onClick={() => navigate(arenaHref)}
                onMouseEnter={() => primeNeonRivalsRoute(true)}
                onFocus={() => primeNeonRivalsRoute(true)}
                onTouchStart={() => primeNeonRivalsRoute(true)}
                variant="play"
                size="lg"
                className="mt-4 w-full sm:w-auto"
              >
                <Sparkles size={16} />
                Open Arena
              </Button>
            </section>

            <section className="section-panel">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Game Modes</p>
                  <h2 className="section-title">
                    Learn each battle format
                  </h2>
                </div>
                <Sparkles size={18} className="text-primary" />
              </div>
              <div className="section-stack">
                {(selectedMode === "head_to_head"
                  ? [
                      "Two players load the same random board family and solve in real time.",
                      "The match opens with a short practice board before the live score race starts.",
                      "First to 100 wins, and the pool avoids chess, checkers, and word-riddle lanes.",
                    ]
                  : selectedMode === "revenge"
                    ? [
                        "Face the rival who just beat you in a focused rematch.",
                        "Battle through a fresh board with the same pressure.",
                        "Win the rematch to swing momentum back your way.",
                      ]
                    : [
                        "Ranked matches drop you into fast four-player puzzle battles.",
                        "Each round brings a new puzzle and a fresh leaderboard race.",
                        "Climb faster with strong finishes, clean solves, and fewer mistakes.",
                      ]
                ).map((item) => (
                  <div
                    key={item}
                    className="command-panel-soft px-4 py-3 text-sm leading-6 text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="section-panel">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Today's Variant</p>
                  <h2 className="section-title">
                    {isContentLoading
                      ? "Loading challenge..."
                      : dailyChallenge?.title ?? "Daily 1%"}
                  </h2>
                </div>
                <span className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">
                  {isContentLoading ? "Syncing" : sourceLabel(dailySource)}
                </span>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {contentError ??
                  (isContentLoading
                    ? "Pulling the latest challenge feed for this queue screen."
                    : dailyChallenge?.description ??
                      describeChallengeResolution(dailyResolution))}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
