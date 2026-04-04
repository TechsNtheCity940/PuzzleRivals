import type { BackendLobby, MatchMode, PuzzleSubmission } from "@/lib/backend";
import type { NeonRivalsRunSubmission, NeonRivalsRunSyncResult } from "@/game/types";
import {
  invokeSupabaseFunction,
  type SupabaseFunctionErrorCandidate,
} from "@/lib/supabase-function-client";
import { supabase } from "@/lib/supabase-client";

export interface MatchHintSyncResult {
  lobby: BackendLobby;
  penalty: number;
  hintUses: number;
  hintPenaltyTotal: number;
  nextHintAvailableAt: string;
  remainingHints: number;
  liveScore: number;
}

type LegacyMatchHintPayload = Omit<MatchHintSyncResult, "lobby"> & Partial<BackendLobby>;
type MatchHintPayload = MatchHintSyncResult | LegacyMatchHintPayload;

function isBackendLobby(value: unknown): value is BackendLobby {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.mode === "string" &&
    typeof candidate.status === "string" &&
    Array.isArray(candidate.players)
  );
}

function normalizeBackendLobby(value: BackendLobby | MatchHintPayload): BackendLobby | null {
  if (!isBackendLobby(value)) {
    return null;
  }

  return {
    id: value.id,
    mode: value.mode,
    status: value.status,
    maxPlayers: value.maxPlayers,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    expiresAt: value.expiresAt,
    players: value.players,
    selection: value.selection,
    practiceStartsAt: value.practiceStartsAt,
    practiceEndsAt: value.practiceEndsAt,
    liveStartsAt: value.liveStartsAt,
    liveEndsAt: value.liveEndsAt,
    intermissionStartsAt: value.intermissionStartsAt,
    intermissionEndsAt: value.intermissionEndsAt,
    results: value.results,
  };
}

function isMatchModeSchemaDrift(error: SupabaseFunctionErrorCandidate) {
  const normalized = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
    .trim()
    .toLowerCase();

  return normalized.includes("invalid input value for enum match_mode");
}

function resolveSchemaResource(functionName: string) {
  switch (functionName) {
    case "join-lobby":
      return "public.match_mode";
    default:
      return "active matchmaking schema";
  }
}

async function invoke<T>(functionName: string, body: Record<string, unknown>) {
  return invokeSupabaseFunction<T>(functionName, body, {
    requiresSessionMessage: "You must be signed in before using matchmaking.",
    schemaResource: resolveSchemaResource(functionName),
    isSchemaSetupIssue:
      functionName === "join-lobby" ? isMatchModeSchemaDrift : undefined,
  });
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
  leaveLobby(lobbyId: string) {
    return invoke<{ lobby: BackendLobby }>("leave-lobby", { lobbyId });
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
  async useMatchHint(lobbyId: string) {
    const payload = await invoke<MatchHintPayload>("use-match-hint", { lobbyId });
    const lobby = "lobby" in payload && payload.lobby
      ? normalizeBackendLobby(payload.lobby)
      : normalizeBackendLobby(payload);

    if (!lobby) {
      throw new Error("Hint response did not include the updated lobby state.");
    }

    return {
      ...payload,
      lobby,
    } as MatchHintSyncResult;
  },
  voteNextRound(lobbyId: string, vote: "continue" | "exit") {
    return invoke<{ lobby: BackendLobby }>("vote-next-round", { lobbyId, vote });
  },
  submitNeonRivalsRun(run: NeonRivalsRunSubmission) {
    return invoke<NeonRivalsRunSyncResult>("submit-neon-rivals-run", run);
  },
};
