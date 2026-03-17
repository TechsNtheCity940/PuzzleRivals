import { useMemo, useState } from "react";
import { Crown, Flame, Sparkles, Swords, Target, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { DAILY_CHALLENGES, getRankBand, getRankColor } from "@/lib/seed-data";

type PlayMode = "ranked" | "casual" | "royale" | "revenge" | "challenge" | "daily";

const MODES = [
  { id: "ranked" as PlayMode, label: "Ranked", icon: Swords, desc: "4-player ladder lobby", status: "Armed" },
  { id: "casual" as PlayMode, label: "Casual", icon: Zap, desc: "No-rank generated runs", status: "Queue" },
  { id: "royale" as PlayMode, label: "Royale", icon: Crown, desc: "High stakes elimination", status: "Queue" },
  { id: "revenge" as PlayMode, label: "Revenge", icon: Flame, desc: "2-player rivalry duel", status: "Queue" },
  { id: "challenge" as PlayMode, label: "Challenge", icon: Target, desc: "Train your weak spots", status: "Queue" },
  { id: "daily" as PlayMode, label: "Daily", icon: Users, desc: "Elite daily variant", status: "Queue" },
];

export default function PlayPage() {
  const navigate = useNavigate();
  const { openSignUp } = useAuthDialog();
  const { user, canSave, isReady } = useAuth();
  const [selectedMode, setSelectedMode] = useState<PlayMode>("ranked");
  const rankBand = getRankBand(user?.elo ?? 0);

  const selectedConfig = useMemo(() => {
    const revenge = selectedMode === "revenge";
    return {
      lobby: revenge ? "2 Players" : "4 Players",
      steps: revenge
        ? [
            "Targets your weak spot",
            "Weights their strongest category",
            "Can repeat last loss puzzle",
          ]
        : ["Weighted puzzle pick", "12s practice warm-up", "Fresh live seed"],
    };
  }, [selectedMode]);

  const selectedModeMeta = MODES.find((mode) => mode.id === selectedMode);

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Queue Select"
          title="Play Now"
          subtitle={`${rankBand.label} - ELO ${user?.elo ?? 0}`}
          right={
            <div className="spotlight-panel">
              <p className="section-kicker">Lobby Rule</p>
              <p className="mt-2 text-3xl font-black">{selectedConfig.lobby}</p>
              <p className="mt-2 text-sm text-muted-foreground">Built for quick access, fast queue reads, and zero hidden tiles.</p>
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
                  Clean, readable match cards with one dominant action. Choose a mode, scan the rule set, then launch without hunting through stacked panels.
                </p>
              </div>
              <Button
                onClick={() => {
                  if (canSave) {
                    navigate(`/match?mode=${selectedMode}`);
                    return;
                  }
                  openSignUp();
                }}
                variant="play"
                size="xl"
                className="w-full sm:w-auto"
                disabled={!isReady || !user}
              >
                <Swords size={18} />
                {!isReady || !user ? "Syncing Account..." : canSave ? "Launch Match" : "Sign Up To Compete"}
              </Button>
            </div>

            <div className="spotlight-panel">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Mode Snapshot</p>
                  <h3 className="section-title">{selectedModeMeta?.label}</h3>
                </div>
                <span className={`font-hud text-[10px] uppercase tracking-[0.18em] ${getRankColor(user?.rank ?? "bronze")}`}>
                  {rankBand.label}
                </span>
              </div>
              <div className="section-stack">
                {selectedConfig.steps.map((step) => (
                  <div key={step} className="command-panel-soft px-4 py-3 text-sm text-muted-foreground">
                    {step}
                  </div>
                ))}
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
                        selectedMode === mode.id ? "text-primary" : "text-muted-foreground"
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
                  <p className="section-kicker">Procedural Match AI</p>
                  <h2 className="section-title">Deterministic variety, live fairness</h2>
                </div>
                <Sparkles size={18} className="text-primary" />
              </div>
              <div className="section-stack">
                {(selectedMode === "revenge"
                  ? [
                      "Chooses between your worst puzzle type and your rival's best.",
                      "Can replay the last puzzle category they used to beat you.",
                      "Fresh practice/live seeds keep the duel fair.",
                    ]
                  : [
                      "Difficulty tracks lobby skill bands.",
                      "Puzzle type selection is weighted, not random spam.",
                      "Practice and live always share category, never exact layout.",
                    ]).map((item) => (
                  <div key={item} className="command-panel-soft px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="section-panel">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Today&apos;s Variant</p>
                  <h2 className="section-title">{DAILY_CHALLENGES[0]?.title ?? "Daily 1%"}</h2>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                {DAILY_CHALLENGES[0]?.description ?? "Generated elite challenge."}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
