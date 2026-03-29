import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Provider } from "@supabase/supabase-js";
import {
  buildGuestUser,
  loadCurrentUserFromSession,
  saveProfileToSupabase,
} from "@/lib/player-data";
import {
  isSupabaseConfigured,
  SupabaseSchemaSetupError,
  supabase,
  supabaseConfigErrorMessage,
} from "@/lib/supabase-client";
import type { UserProfile } from "@/lib/types";

interface AuthContextValue {
  isReady: boolean;
  backendWarning: string | null;
  token: string | null;
  hasSession: boolean;
  user: UserProfile | null;
  isGuest: boolean;
  canSave: boolean;
  saveProfile: (updates: Partial<UserProfile>) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ message: string; signedIn: boolean; backendWarning: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<string>;
  signInWithFacebook: () => Promise<void>;
  signInWithTikTok: () => Promise<void>;
  linkFacebook: () => Promise<void>;
  linkTikTok: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const TIKTOK_PROVIDER = (import.meta.env.VITE_SUPABASE_TIKTOK_PROVIDER ?? "custom:tiktok") as Provider;

async function fetchCurrentUser(): Promise<{ token: string | null; user: UserProfile | null; backendWarning: string | null }> {
  if (!supabase) {
    return { token: null, user: buildGuestUser(), backendWarning: null };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  if (!session?.user) {
    return { token: null, user: buildGuestUser(), backendWarning: null };
  }

  try {
    const user = await loadCurrentUserFromSession(session);
    return {
      token: session.access_token,
      user,
      backendWarning: null,
    };
  } catch (error) {
    if (error instanceof SupabaseSchemaSetupError) {
      return {
        token: session.access_token,
        user: null,
        backendWarning: error.message,
      };
    }

    throw error;
  }
}

async function loadCurrentUserWithRetry(retries = 5) {
  let attempt = 0;
  let current = await fetchCurrentUser();

  while (attempt < retries && current.token && !current.user && !current.backendWarning) {
    attempt += 1;
    await sleep(250 * attempt);
    current = await fetchCurrentUser();
  }

  if (current.token && !current.user) {
    return {
      token: current.token,
      user: null,
      backendWarning: current.backendWarning,
    };
  }

  return current;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [backendWarning, setBackendWarning] = useState<string | null>(null);
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
          setBackendWarning(null);
          return;
        }

        const current = await loadCurrentUserWithRetry();
        if (!mounted) return;
        setToken(current.token);
        setBackendWarning(current.backendWarning ?? null);
        setUser(current.user ?? (current.token ? null : buildGuestUser()));
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
        setBackendWarning(current.backendWarning ?? null);
        setUser(current.user ?? (current.token ? null : buildGuestUser()));
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
      setBackendWarning(null);
      return null;
    }

    const me = await loadCurrentUserWithRetry(2);
    setToken(me.token);
    setBackendWarning(me.backendWarning ?? null);
    setUser(me.user ?? (me.token ? null : buildGuestUser()));
    return me.backendWarning ?? null;
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
    let persistedUser = currentUser && !currentUser.isGuest ? currentUser : null;

    if (!persistedUser && supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      persistedUser = await loadCurrentUserFromSession(sessionData.session);
    }

    if (!persistedUser || persistedUser.isGuest) {
      return;
    }

    const nextUser: UserProfile = {
      ...persistedUser,
      ...updates,
      socialLinks: {
        ...persistedUser.socialLinks,
        ...(updates.socialLinks ?? {}),
      },
    };

    await saveProfileToSupabase(nextUser);
    await refreshUser();
  }

  async function signUpWithEmail(email: string, password: string) {
    if (!supabase) {
      throw new Error(supabaseConfigErrorMessage);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: user?.username ?? buildGuestUser().username,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      const warning = await refreshUser();
      return {
        message: warning ?? "Account created. You are now signed in.",
        signedIn: true,
        backendWarning: warning,
      };
    }

    return {
      message:
        "Account created. Confirm your email if your Supabase project requires email confirmation, then sign in with your password.",
      signedIn: false,
      backendWarning: null,
    };
  }

  async function signInWithEmail(email: string, password: string) {
    if (!supabase) {
      throw new Error(supabaseConfigErrorMessage);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    const warning = await refreshUser();
    return warning ?? "Signed in successfully.";
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

  async function signInWithTikTok() {
    if (!supabase) {
      throw new Error(supabaseConfigErrorMessage);
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: TIKTOK_PROVIDER,
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });

    if (error) {
      throw error;
    }
  }

  async function linkIdentity(provider: Provider) {
    if (!supabase) {
      throw new Error(supabaseConfigErrorMessage);
    }

    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/profile`,
      },
    });

    if (error) {
      throw error;
    }
  }

  async function linkFacebook() {
    await linkIdentity("facebook");
  }

  async function linkTikTok() {
    await linkIdentity(TIKTOK_PROVIDER);
  }

  async function signOut() {
    if (!supabase) {
      setToken(null);
      setUser(buildGuestUser());
      setBackendWarning(null);
      return;
    }

    await supabase.auth.signOut();
    setToken(null);
    setUser(buildGuestUser());
    setBackendWarning(null);
  }

  const value = useMemo(
    () => ({
      isReady,
      backendWarning,
      token,
      hasSession: Boolean(token),
      user,
      isGuest: !token && (user?.isGuest ?? true),
      canSave: !user?.isGuest,
      saveProfile,
      signUpWithEmail,
      signInWithEmail,
      signInWithFacebook,
      signInWithTikTok,
      linkFacebook,
      linkTikTok,
      signOut,
      refreshUser,
    }),
    [backendWarning, isReady, token, user],
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
