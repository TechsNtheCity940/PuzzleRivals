import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { NeonRivalsBoardFamily, NeonRivalsRunMode } from "@/game/types";

type PreferencesShape = {
  reduceMotion: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  lowBandwidthMode: boolean;
  compactArenaLayout: boolean;
  notificationsEnabled: boolean;
  lastArenaMode: NeonRivalsRunMode;
  dismissedArenaHints: Partial<Record<NeonRivalsBoardFamily, boolean>>;
};

type AppPreferencesContextValue = PreferencesShape & {
  updatePreference: <K extends keyof Omit<PreferencesShape, "dismissedArenaHints" | "lastArenaMode">>(
    key: K,
    value: PreferencesShape[K],
  ) => void;
  setLastArenaMode: (mode: NeonRivalsRunMode) => void;
  dismissArenaHint: (family: NeonRivalsBoardFamily) => void;
  restoreArenaHints: () => void;
  resetPreferences: () => void;
};

const STORAGE_KEY = "puzzle-rivals:preferences";
const DEFAULT_PREFERENCES: PreferencesShape = {
  reduceMotion: false,
  soundEnabled: true,
  musicEnabled: true,
  lowBandwidthMode: false,
  compactArenaLayout: true,
  notificationsEnabled: true,
  lastArenaMode: "score_attack",
  dismissedArenaHints: {},
};

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null);

function readStoredPreferences() {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<PreferencesShape>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      dismissedArenaHints:
        parsed.dismissedArenaHints ?? DEFAULT_PREFERENCES.dismissedArenaHints,
      lastArenaMode:
        parsed.lastArenaMode ?? DEFAULT_PREFERENCES.lastArenaMode,
    } satisfies PreferencesShape;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<PreferencesShape>(
    () => readStoredPreferences(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    document.documentElement.dataset.motion = preferences.reduceMotion
      ? "reduced"
      : "full";
    document.documentElement.dataset.bandwidth = preferences.lowBandwidthMode
      ? "low"
      : "full";
    document.documentElement.dataset.arena = preferences.compactArenaLayout
      ? "compact"
      : "expanded";
  }, [preferences]);

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      ...preferences,
      updatePreference: (key, value) => {
        setPreferences((current) => ({
          ...current,
          [key]: value,
        }));
      },
      setLastArenaMode: (mode) => {
        setPreferences((current) => ({
          ...current,
          lastArenaMode: mode,
        }));
      },
      dismissArenaHint: (family) => {
        setPreferences((current) => ({
          ...current,
          dismissedArenaHints: {
            ...current.dismissedArenaHints,
            [family]: true,
          },
        }));
      },
      restoreArenaHints: () => {
        setPreferences((current) => ({
          ...current,
          dismissedArenaHints: {},
        }));
      },
      resetPreferences: () => {
        setPreferences(DEFAULT_PREFERENCES);
      },
    }),
    [preferences],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider.",
    );
  }
  return context;
}
