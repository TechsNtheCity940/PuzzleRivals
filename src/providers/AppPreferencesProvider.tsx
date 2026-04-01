import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ArenaRotationHistoryEntry,
  NeonRivalsBoardFamily,
  NeonRivalsRunMode,
} from "@/game/types";
import {
  appendArenaHistory,
  createArenaHistoryEntry,
} from "@/game/config/arenaRotation";

type PreferencesShape = {
  reduceMotion: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  lowBandwidthMode: boolean;
  compactArenaLayout: boolean;
  notificationsEnabled: boolean;
  lastArenaMode: NeonRivalsRunMode;
  dismissedArenaHints: Partial<Record<NeonRivalsBoardFamily, boolean>>;
  recentArenaHistory: ArenaRotationHistoryEntry[];
};

type AppPreferencesContextValue = PreferencesShape & {
  updatePreference: <
    K extends keyof Omit<
      PreferencesShape,
      "dismissedArenaHints" | "lastArenaMode" | "recentArenaHistory"
    >,
  >(
    key: K,
    value: PreferencesShape[K],
  ) => void;
  setLastArenaMode: (mode: NeonRivalsRunMode) => void;
  recordArenaHistory: (mode: NeonRivalsRunMode, seed: number) => void;
  clearArenaHistory: () => void;
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
  recentArenaHistory: [],
};

const AppPreferencesContext =
  createContext<AppPreferencesContextValue | null>(null);

function isValidArenaMode(value: unknown): value is NeonRivalsRunMode {
  return typeof value === "string" && value.length > 0;
}

function isValidBoardFamily(value: unknown): value is NeonRivalsBoardFamily {
  return typeof value === "string" && value.length > 0;
}

function sanitizeArenaHistoryEntry(value: unknown): ArenaRotationHistoryEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Partial<ArenaRotationHistoryEntry>;
  if (
    !isValidArenaMode(entry.mode) ||
    !isValidBoardFamily(entry.boardFamily) ||
    typeof entry.seed !== "number" ||
    typeof entry.playedAt !== "number"
  ) {
    return null;
  }

  return {
    mode: entry.mode,
    boardFamily: entry.boardFamily,
    seed: entry.seed,
    playedAt: entry.playedAt,
  };
}

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
        parsed.dismissedArenaHints && typeof parsed.dismissedArenaHints === "object"
          ? parsed.dismissedArenaHints
          : DEFAULT_PREFERENCES.dismissedArenaHints,
      lastArenaMode: isValidArenaMode(parsed.lastArenaMode)
        ? parsed.lastArenaMode
        : DEFAULT_PREFERENCES.lastArenaMode,
      recentArenaHistory: Array.isArray(parsed.recentArenaHistory)
        ? parsed.recentArenaHistory
            .map(sanitizeArenaHistoryEntry)
            .filter((entry): entry is ArenaRotationHistoryEntry => Boolean(entry))
        : DEFAULT_PREFERENCES.recentArenaHistory,
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
      recordArenaHistory: (mode, seed) => {
        setPreferences((current) => ({
          ...current,
          recentArenaHistory: appendArenaHistory(
            current.recentArenaHistory,
            createArenaHistoryEntry(mode, seed),
          ),
        }));
      },
      clearArenaHistory: () => {
        setPreferences((current) => ({
          ...current,
          recentArenaHistory: [],
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
