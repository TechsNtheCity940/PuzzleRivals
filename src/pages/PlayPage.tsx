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
  { id: "ranked" as PlayMode, label: "Ranked", icon: Swords, desc: "4-player ladder lobby" },
  { id: "casual" as PlayMode, label: "Casual", icon: Zap, desc: "No-rank generated runs" },
  { id: "royale" as PlayMode, label: "Royale", icon: Crown, desc: "High stakes elimination" },
  { id: "revenge" as PlayMode, label: "Revenge", icon: Flame, desc: "2-player rivalry duel" },
  { id: "challenge" as PlayMode, label: "Challenge", icon: Target, desc: "Train your weak spots" },
  { id: "daily" as PlayMode, label: "Daily", icon: Users, desc: "Elite daily variant" },
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

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Queue Select"
          title="Play Now"
          subtitle={`${rankBand.label} - ELO ${user?.elo ?? 0}`}
          right={
            <div className="command-panel-soft px-4 py-3 text-right">
              <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">Lobby Rule</p>
              <p className="text-sm font-black">{selectedConfig.lobby}</p>
            </div>
          }
        />

        <section className="command-panel grid min-h-0 flex-1 grid-rows-[auto_auto_1fr_auto] gap-3 overflow-hidden p-3">
          <div className="grid grid-cols-2 gap-2">
            {MODES.map((mode) => (
              <PuzzleTileButton
                key={mode.id}
                icon={mode.icon}
                title={mode.label}
                description={mode.desc}
                active={selectedMode === mode.id}
                onClick={() => setSelectedMode(mode.id)}
                right={
                  <span className={`font-hud text-[10px] uppercase tracking-[0.16em] ${selectedMode === mode.id ? "text-primary" : "text-muted-foreground"}`}>
                    {selectedMode === mode.id ? "Armed" : "Queue"}
                  </span>
                }
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {selectedConfig.steps.map((step) => (
              <div key={step} className="command-panel-soft flex items-center justify-center px-3 py-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>

          <div className="grid min-h-0 grid-cols-[1.1fr_0.9fr] gap-3">
            <div className="command-panel-soft min-h-0 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <div>
                  <p className="hud-label">Procedural Match AI</p>
                  <p className="text-sm font-black">Deterministic variety, live fairness</p>
                </div>
              </div>
              <div className="grid gap-2">
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
                  <div key={item} className="rounded-2xl bg-black/20 px-3 py-2 text-xs text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid min-h-0 grid-rows-[auto_1fr] gap-3">
              <div className="command-panel-soft p-3">
                <p className="hud-label">Today’s Variant</p>
                <p className="mt-1 text-sm font-black">{DAILY_CHALLENGES[0]?.title ?? "Daily 1%"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {DAILY_CHALLENGES[0]?.description ?? "Generated elite challenge."}
                </p>
              </div>
              <div className="command-panel-soft min-h-0 p-3">
                <p className="hud-label">Selected Mode</p>
                <p className="mt-1 text-xl font-black">{MODES.find((entry) => entry.id === selectedMode)?.label}</p>
                <p className={`mt-2 font-hud text-[10px] uppercase tracking-[0.18em] ${getRankColor(user?.rank ?? "bronze")}`}>
                  Active player band: {rankBand.label}
                </p>
              </div>
            </div>
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
            className="w-full"
            disabled={!isReady || !user}
          >
            <Swords size={18} />
            {!isReady || !user ? "Syncing Account..." : canSave ? "Launch Match" : "Sign Up To Compete"}
          </Button>
        </section>
      </div>
    </div>
  );
}
