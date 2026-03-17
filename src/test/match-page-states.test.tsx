import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { BackendLobby, BackendLobbyPlayer, MatchMode } from "@/lib/backend";
import MatchPage from "@/pages/MatchPage";

const mockFlags = vi.hoisted(() => ({
  isSupabaseConfigured: true,
  supabaseConfigErrorMessage: "Supabase missing",
}));

const mockAuthState = vi.hoisted(() => ({
  value: {
    isReady: true,
    user: {
      id: "user-1",
      username: "Ace",
      avatarId: "avatar-1",
      email: "ace@example.com",
    },
    refreshUser: vi.fn().mockResolvedValue(undefined),
    saveProfile: vi.fn().mockResolvedValue(undefined),
    canSave: true,
  },
}));

const mockLobbyState = vi.hoisted(() => ({
  lobby: null as BackendLobby | null,
}));

const mockAuthDialog = vi.hoisted(() => ({
  openSignIn: vi.fn(),
  openSignUp: vi.fn(),
}));

vi.mock("@/components/auth/AuthDialogContext", () => ({
  useAuthDialog: () => mockAuthDialog,
}));

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => mockAuthState.value,
}));

vi.mock("@/lib/supabase-client", () => ({
  get isSupabaseConfigured() {
    return mockFlags.isSupabaseConfigured;
  },
  get supabaseConfigErrorMessage() {
    return mockFlags.supabaseConfigErrorMessage;
  },
}));

vi.mock("@/lib/api-client", () => ({
  subscribeToLobby: () => () => undefined,
  supabaseApi: {
    joinLobby: vi.fn(async () => ({ lobby: mockLobbyState.lobby })),
    syncLobby: vi.fn(async () => ({ lobby: mockLobbyState.lobby })),
    readyLobby: vi.fn(async () => ({ lobby: mockLobbyState.lobby })),
    submitProgress: vi.fn(async () => ({ lobby: mockLobbyState.lobby })),
    submitSolve: vi.fn(async () => ({ lobby: mockLobbyState.lobby })),
    voteNextRound: vi.fn(async () => ({ lobby: mockLobbyState.lobby })),
  },
}));

vi.mock("@/components/match/MatchPuzzleBoard", () => ({
  default: () => <div data-testid="mock-match-board">Mock Board</div>,
}));

function createPlayer(overrides: Partial<BackendLobbyPlayer> = {}): BackendLobbyPlayer {
  return {
    playerId: "user-1",
    username: "Ace",
    elo: 1260,
    rank: "gold",
    isBot: false,
    ready: true,
    nextRoundVote: null,
    joinedAt: "2026-03-13T00:00:00.000Z",
    progress: 48,
    practiceProgress: 32,
    solvedAtMs: null,
    completions: 0,
    score: 0,
    currentSeed: 34,
    pace: 1,
    ...overrides,
  };
}

function createLobby(status: BackendLobby["status"], overrides: Partial<BackendLobby> = {}): BackendLobby {
  const players = overrides.players ?? [
    createPlayer(),
    createPlayer({ playerId: "user-2", username: "Rival", rank: "silver", elo: 1180, progress: 42, practiceProgress: 28 }),
  ];

  return {
    id: "lobby-12345678",
    mode: "ranked" as MatchMode,
    status,
    maxPlayers: 4,
    createdAt: "2026-03-13T00:00:00.000Z",
    updatedAt: "2026-03-13T00:00:00.000Z",
    expiresAt: "2026-03-13T01:00:00.000Z",
    players,
    selection: status === "filling"
      ? null
      : {
          puzzleType: "pattern_match",
          difficulty: 3,
          practiceSeed: 12,
          liveSeed: 34,
          selectedAt: "2026-03-13T00:00:00.000Z",
          meta: {
            type: "pattern_match",
            label: "Pattern Match",
            icon: "◆",
            description: "Read the pattern grid and identify the missing tile.",
          },
        },
    practiceStartsAt: "2026-03-13T00:00:00.000Z",
    practiceEndsAt: "2099-03-13T00:00:12.000Z",
    liveStartsAt: "2026-03-13T00:00:12.000Z",
    liveEndsAt: "2099-03-13T00:01:12.000Z",
    intermissionStartsAt: "2026-03-13T00:01:12.000Z",
    intermissionEndsAt: "2099-03-13T00:01:24.000Z",
    results: status === "intermission" || status === "complete"
      ? {
          completedAt: "2026-03-13T00:01:12.000Z",
          standings: [
            {
              playerId: "user-1",
              username: "Ace",
              progress: 100,
              solvedAtMs: 18300,
              rank: 1,
              completions: 3,
              score: 352,
              reward: { xp: 180, coins: 260, elo: 18 },
              isBot: false,
            },
            {
              playerId: "user-2",
              username: "Rival",
              progress: 84,
              solvedAtMs: null,
              rank: 2,
              completions: 1,
              score: 100,
              reward: { xp: 120, coins: 180, elo: -8 },
              isBot: false,
            },
          ],
          rapidFire: true,
        }
      : null,
    ...overrides,
  };
}

function renderMatchPage() {
  return render(
    <MemoryRouter initialEntries={["/match?mode=ranked"]}>
      <Routes>
        <Route path="/match" element={<MatchPage />} />
        <Route path="/play" element={<div>Play Route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MatchPage states", () => {
  beforeEach(() => {
    mockFlags.isSupabaseConfigured = true;
    mockFlags.supabaseConfigErrorMessage = "Supabase missing";
    mockLobbyState.lobby = createLobby("filling");
    mockAuthState.value = {
      ...mockAuthState.value,
      isReady: true,
      user: {
        id: "user-1",
        username: "Ace",
        avatarId: "avatar-1",
        email: "ace@example.com",
      },
      canSave: true,
      refreshUser: vi.fn().mockResolvedValue(undefined),
      saveProfile: vi.fn().mockResolvedValue(undefined),
    };
    mockAuthDialog.openSignIn.mockReset();
    mockAuthDialog.openSignUp.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders backend unavailable state", async () => {
    mockFlags.isSupabaseConfigured = false;

    renderMatchPage();

    expect(await screen.findByText("Backend Required")).toBeInTheDocument();
    expect(screen.getByText(/Supabase missing/i)).toBeInTheDocument();
  });

  it("renders account required state", async () => {
    mockAuthState.value = { ...mockAuthState.value, canSave: false };

    renderMatchPage();

    expect(await screen.findByText("Account Required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("renders connecting state", async () => {
    mockAuthState.value = { ...mockAuthState.value, isReady: false };

    renderMatchPage();

    expect(await screen.findByText("Preparing Session")).toBeInTheDocument();
    expect(screen.getByText(/command deck booting/i)).toBeInTheDocument();
  });

  it("renders filling lobby state", async () => {
    mockLobbyState.lobby = createLobby("filling");

    renderMatchPage();

    expect(await screen.findByText("Filling Lobby")).toBeInTheDocument();
    expect(screen.getByText(/The room launches into practice/i)).toBeInTheDocument();
  });

  it("renders ready state", async () => {
    mockLobbyState.lobby = createLobby("ready");

    renderMatchPage();

    expect(await screen.findByText("Puzzle Lock")).toBeInTheDocument();
    expect(screen.getByText("Pattern Match")).toBeInTheDocument();
  });

  it("renders practice state", async () => {
    mockLobbyState.lobby = createLobby("practice");

    renderMatchPage();

    expect(await screen.findByText("Practice Timer")).toBeInTheDocument();
    expect(screen.getByText("Practice Arena")).toBeInTheDocument();
    expect(screen.getByTestId("mock-match-board")).toBeInTheDocument();
  });

  it("renders live state", async () => {
    mockLobbyState.lobby = createLobby("live");

    renderMatchPage();

    expect(await screen.findByText("Match Timer")).toBeInTheDocument();
    expect(screen.getByText(/Live Arena - Rapid Fire/i)).toBeInTheDocument();
    expect(screen.getByText(/Score 0 \| Clears 0/i)).toBeInTheDocument();
  });

  it("renders intermission state", async () => {
    mockLobbyState.lobby = createLobby("intermission");

    renderMatchPage();

    expect(await screen.findByText("Match Leaderboard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exit to dashboard/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/1st/i).length).toBeGreaterThan(0));
  });
});
