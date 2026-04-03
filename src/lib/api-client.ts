import type { BackendLobby, MatchMode, PuzzleSubmission } from "@/lib/backend";
import type { NeonRivalsRunSubmission, NeonRivalsRunSyncResult } from "@/game/types";
import { supabase, supabaseConfigErrorMessage } from "@/lib/supabase-client";

export interface MatchHintSyncResult {
  lobby: BackendLobby;
  penalty: number;
  hintUses: number;
  hintPenaltyTotal: number;
  nextHintAvailableAt: string;
  remainingHints: number;
  liveScore: number;
}

async function invoke<T>(functionName: string, body: Record<string, unknown>) {
  if (!supabase) {
    throw new Error(supabaseConfigErrorMessage);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be signed in before using matchmaking.");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const browserKey =
    (import.meta.env.VITE_SUPABASE_PUBLIC_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

  if (!supabaseUrl || !browserKey) {
    throw new Error(supabaseConfigErrorMessage);
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: browserKey,
      "x-supabase-auth": session.access_token,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export function subscribeToLobby(lobbyId: string, onSnapshot: (lobby: BackendLobby) => void) {
  if (!supabase) {
    return () => {};
  }

  const channel = supabase.channel(`lobby:${lobbyId}`);

  channel.on("broadcast", { event: "lobby.snapshot" }, (payload) => {
    const nextLobby = payload.payload?.lobby ?? payload.payload;
    if (nextLobby?.id === lobbyId) {
      onSnapshot(nextLobby as BackendLobby);
    }
  });

  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export const supabaseApi = {
  joinLobby(mode: MatchMode) {
    return invoke<{ lobby: BackendLobby }>("join-lobby", { mode });
  },
  readyLobby(lobbyId: string) {
    return invoke<{ lobby: BackendLobby }>("ready-lobby", { lobbyId });
  },
  syncLobby(lobbyId: string) {
    return invoke<{ lobby: BackendLobby }>("sync-lobby", { lobbyId });
  },
  submitProgress(
    lobbyId: string,
    stage: "practice" | "live",
    submission: PuzzleSubmission,
    score?: number,
  ) {
    return invoke<{ lobby: BackendLobby; progress: number; liveScore: number }>(
      "submit-progress",
      { lobbyId, stage, submission, score },
    );
  },
  submitSolve(
    lobbyId: string,
    stage: "practice" | "live",
    submission: PuzzleSubmission,
    score?: number,
  ) {
    return invoke<{ lobby: BackendLobby }>("submit-solve", {
      lobbyId,
      stage,
      submission,
      score,
    });
  },
  useMatchHint(lobbyId: string) {
    return invoke<MatchHintSyncResult>("use-match-hint", { lobbyId });
  },
  voteNextRound(lobbyId: string, vote: "continue" | "exit") {
    return invoke<{ lobby: BackendLobby }>("vote-next-round", { lobbyId, vote });
  },
  submitNeonRivalsRun(run: NeonRivalsRunSubmission) {
    return invoke<NeonRivalsRunSyncResult>("submit-neon-rivals-run", run);
  },
};
