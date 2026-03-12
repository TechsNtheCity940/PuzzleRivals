import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildGuestUser, loadCurrentUserFromSession, saveProfileToSupabase } from "@/lib/player-data";
import { isSupabaseConfigured, supabase, supabaseConfigErrorMessage } from "@/lib/supabase-client";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  isReady: boolean;
  token: string | null;
  user: UserProfile | null;
  isGuest: boolean;
  canSave: boolean;
  saveProfile: (updates: Partial<UserProfile>) => Promise<void>;
  signInWithEmail: (email: string) => Promise<string>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchCurrentUser(): Promise<{ token: string | null; user: UserProfile | null }> {
  if (!supabase) {
    return { token: null, user: buildGuestUser() };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session?.user) {
    return { token: null, user: buildGuestUser() };
  }

  const user = await loadCurrentUserFromSession(session);
  return {
    token: session.access_token,
    user: user ?? buildGuestUser(),
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
        if (!isSupabaseConfigured) {
          if (!mounted) return;
          setToken(null);
          setUser(buildGuestUser());
          return;
        }

        const current = await loadCurrentUserWithRetry();
        if (!mounted) return;
        setToken(current.token);
        setUser(current.user);
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
    if (!supabase) {
      return;
    }

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
    if (!isSupabaseConfigured) {
      setToken(null);
      setUser(buildGuestUser());
      return;
    }

    const me = await loadCurrentUserWithRetry(2);
    setToken(me.token);
    setUser(me.user);
  }

  async function saveProfile(updates: Partial<UserProfile>) {
    setUser((current) => {
      const next = { ...(current ?? buildGuestUser()), ...updates } as UserProfile;
      next.socialLinks = {
        ...(current?.socialLinks ?? {}),
        ...(updates.socialLinks ?? {}),
      };
      return next;
    });

    const currentUser = user;
    if (!currentUser || currentUser.isGuest) {
      return;
    }

    const nextUser: UserProfile = {
      ...currentUser,
      ...updates,
      socialLinks: {
        ...currentUser.socialLinks,
        ...(updates.socialLinks ?? {}),
      },
    };

    await saveProfileToSupabase(nextUser);
    await refreshUser();
  }

  async function signInWithEmail(email: string) {
    if (!supabase) {
      throw new Error(supabaseConfigErrorMessage);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
        data: {
          username: user?.username ?? buildGuestUser().username,
        },
      },
    });

    if (error) {
      throw error;
    }

    return "Check your inbox for the Puzzle Rivals sign-in link.";
  }

  async function signInWithFacebook() {
    if (!supabase) {
      throw new Error(supabaseConfigErrorMessage);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });

    if (error) {
      throw error;
    }
  }

  async function signOut() {
    if (!supabase) {
      setToken(null);
      setUser(buildGuestUser());
      return;
    }

    await supabase.auth.signOut();
    setToken(null);
    setUser(buildGuestUser());
  }

  const value = useMemo(
    () => ({
      isReady,
      token,
      user,
      isGuest: user?.isGuest ?? true,
      canSave: !user?.isGuest,
      saveProfile,
      signInWithEmail,
      signInWithFacebook,
      signOut,
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
