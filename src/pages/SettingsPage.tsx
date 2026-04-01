import { Gauge, Volume2, Bell, RefreshCw, SlidersHorizontal } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAppPreferences } from "@/providers/AppPreferencesProvider";

function PreferenceRow({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: typeof Gauge;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="command-panel-soft flex items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="neon-rivals-stat-icon mt-0.5 shrink-0">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-base font-black text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function SettingsPage() {
  const {
    reduceMotion,
    soundEnabled,
    musicEnabled,
    lowBandwidthMode,
    compactArenaLayout,
    notificationsEnabled,
    updatePreference,
    resetPreferences,
    restoreArenaHints,
  } = useAppPreferences();

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Control Surface"
          title="Settings"
          subtitle="Tune motion, network behavior, notifications, and Arena layout defaults before beta traffic starts."
          right={<SlidersHorizontal size={18} className="text-primary" />}
        />

        <div className="page-grid">
          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Performance</p>
                <h2 className="section-title">Device comfort</h2>
              </div>
            </div>
            <div className="section-stack">
              <PreferenceRow
                icon={Gauge}
                title="Low-bandwidth mode"
                description="Stops idle Arena prewarming and keeps large route assets from downloading before the player explicitly launches the board."
                checked={lowBandwidthMode}
                onCheckedChange={(checked) =>
                  updatePreference("lowBandwidthMode", checked)
                }
              />
              <PreferenceRow
                icon={RefreshCw}
                title="Reduce motion"
                description="Softens non-essential shell motion and keeps the UI from stacking extra visual movement around the playfield."
                checked={reduceMotion}
                onCheckedChange={(checked) =>
                  updatePreference("reduceMotion", checked)
                }
              />
              <PreferenceRow
                icon={Gauge}
                title="Compact Arena layout"
                description="Keeps the playfield dominant and compresses the route chrome so the Phaser board stays above the fold."
                checked={compactArenaLayout}
                onCheckedChange={(checked) =>
                  updatePreference("compactArenaLayout", checked)
                }
              />
            </div>
          </section>

          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Alerts + Audio</p>
                <h2 className="section-title">Signal tuning</h2>
              </div>
            </div>
            <div className="section-stack">
              <PreferenceRow
                icon={Bell}
                title="Notifications"
                description="Keeps the header badges, notification center, and request/message indicators active."
                checked={notificationsEnabled}
                onCheckedChange={(checked) =>
                  updatePreference("notificationsEnabled", checked)
                }
              />
              <PreferenceRow
                icon={Volume2}
                title="Sound effects"
                description="Reserves SFX for gameplay and interaction feedback once the Arena audio pass is expanded."
                checked={soundEnabled}
                onCheckedChange={(checked) =>
                  updatePreference("soundEnabled", checked)
                }
              />
              <PreferenceRow
                icon={Volume2}
                title="Music"
                description="Lets the account shell and Arena honor a global music preference instead of burying it per route later."
                checked={musicEnabled}
                onCheckedChange={(checked) =>
                  updatePreference("musicEnabled", checked)
                }
              />
            </div>
          </section>
        </div>

        <section className="section-panel">
          <div className="section-header">
            <div>
              <p className="section-kicker">Arena Coaching</p>
              <h2 className="section-title">Restore onboarding prompts</h2>
            </div>
          </div>
          <div className="command-panel-soft flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-black text-white">Control guides</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Re-enable the per-board control reminders for maze, pipe, tile, number, spatial, and strategy boards.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={restoreArenaHints} variant="outline" size="lg">
                Restore Guides
              </Button>
              <Button onClick={resetPreferences} variant="play" size="lg">
                Reset All Settings
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
