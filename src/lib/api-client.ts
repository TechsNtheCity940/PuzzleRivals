import type { BackendLobby, MatchMode, PuzzleSubmission } from "@/lib/backend";
import { supabase, supabaseConfigErrorMessage } from "@/lib/supabase-client";

async function invoke<T>(functionName: string, body: Record<string, unknown>) {
  if (!supabase) {
    throw new Error(supabaseConfigErrorMessage);
  }

  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) {
    throw new Error(error.message);
  }
  return data as T;
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
  submitProgress(lobbyId: string, stage: "practice" | "live", submission: PuzzleSubmission) {
    return invoke<{ lobby: BackendLobby; progress: number }>("submit-progress", { lobbyId, stage, submission });
  },
  submitSolve(lobbyId: string, stage: "practice" | "live", submission: PuzzleSubmission) {
    return invoke<{ lobby: BackendLobby }>("submit-solve", { lobbyId, stage, submission });
  },
  voteNextRound(lobbyId: string, vote: "continue" | "exit") {
    return invoke<{ lobby: BackendLobby }>("vote-next-round", { lobbyId, vote });
  },
};
