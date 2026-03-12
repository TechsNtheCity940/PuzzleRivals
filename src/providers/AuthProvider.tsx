import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CURRENT_USER } from "@/lib/seed-data";
import { supabase } from "@/lib/supabase-client";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  isReady: boolean;
  token: string | null;
  user: UserProfile | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchCurrentUser(): Promise<{ token: string | null; user: UserProfile | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session?.user) {
    return { token: null, user: null };
  }

  const [{ data: profile }, { data: stats }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.user.id).single(),
    supabase.from("player_stats").select("*").eq("user_id", session.user.id).single(),
  ]);

  if (!profile) {
    return { token: session.access_token, user: null };
  }

  return {
    token: session.access_token,
    user: {
      ...CURRENT_USER,
      id: profile.id,
      username: profile.username,
      elo: profile.elo,
      rank: profile.rank,
      level: profile.level,
      xp: profile.xp,
      xpToNext: profile.xp_to_next,
      coins: profile.coins,
      gems: profile.gems,
      isVip: profile.is_vip,
      wins: stats?.wins ?? CURRENT_USER.wins,
      losses: stats?.losses ?? CURRENT_USER.losses,
      matchesPlayed: stats?.matches_played ?? CURRENT_USER.matchesPlayed,
      winStreak: stats?.win_streak ?? CURRENT_USER.winStreak,
      bestStreak: stats?.best_streak ?? CURRENT_USER.bestStreak,
      joinedAt: profile.created_at,
    },
  };
}

async function loadCurrentUserWithRetry(retries = 5) {
  let attempt = 0;
  let current = await fetchCurrentUser();

  while (attempt < retries && current.token && !current.user) {
    attempt += 1;
    await sleep(250 * attempt);
    current = await fetchCurrentUser();
  }

  return current;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const current = await loadCurrentUserWithRetry();
        if (current.user) {
          if (!mounted) return;
          setToken(current.token);
          setUser(current.user);
          return;
        }

        const { data, error } = await supabase.auth.signInAnonymously({
          options: {},
        });

        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error("Supabase session was not created.");
        }

        const session = await loadCurrentUserWithRetry();
        if (!mounted) return;
        setToken(session.token);
        setUser(session.user);
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
      void loadCurrentUserWithRetry(2).then((current) => {
        setUser(current.user);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function refreshUser() {
    const me = await loadCurrentUserWithRetry(2);
    setToken(me.token);
    setUser(me.user);
  }

  const value = useMemo(
    () => ({
      isReady,
      token,
      user,
      refreshUser,
    }),
    [isReady, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
