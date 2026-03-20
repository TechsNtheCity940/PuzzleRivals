import { useEffect, useMemo, useState } from "react";
import { Bell, KeyRound, Link2, Shield, Users } from "lucide-react";
import IdentityLoadoutCard from "@/components/cosmetics/IdentityLoadoutCard";
import CosmeticPreview from "@/components/cosmetics/CosmeticPreview";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import StockAvatar from "@/components/profile/StockAvatar";
import { Button } from "@/components/ui/button";
import { saveSecurityQuestions, SECURITY_QUESTION_OPTIONS } from "@/lib/auth-security";
import {
  loadProfileContent,
  type GameContentSource,
  type ProfileSocialDirectoryEntry,
} from "@/lib/game-content";
import { DEFAULT_AVATAR_ID, STOCK_AVATARS } from "@/lib/profile-customization";
import { getRankBand, getRankColor } from "@/lib/seed-data";
import { isSupabaseConfigured, supabaseConfigErrorMessage } from "@/lib/supabase-client";
import type { LeaderboardEntry, PuzzleMeta } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

type Tab = "stats" | "social" | "security" | "inbox";

const DEFAULT_QUESTION_ONE = SECURITY_QUESTION_OPTIONS[0];
const DEFAULT_QUESTION_TWO = SECURITY_QUESTION_OPTIONS[1];

function sourceLabel(source: GameContentSource) {
  return source === "supabase" ? "Live" : "Demo";
}

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("stats");
  const { openSignIn, openSignUp } = useAuthDialog();
  const { user, isGuest, canSave, saveProfile, linkFacebook, linkTikTok, signOut, refreshUser } = useAuth();
  const rankBand = getRankBand(user?.elo ?? 0);
  const [puzzleTag, setPuzzleTag] = useState(user?.username ?? "Guest Player");
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? DEFAULT_AVATAR_ID);
  const [facebookHandle, setFacebookHandle] = useState(user?.socialLinks.facebook ?? "");
  const [tiktokHandle, setTiktokHandle] = useState(user?.socialLinks.tiktok ?? "");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [socialDirectory, setSocialDirectory] = useState<ProfileSocialDirectoryEntry[]>([]);
  const [puzzleTypes, setPuzzleTypes] = useState<PuzzleMeta[]>([]);
  const [leaderboardSource, setLeaderboardSource] = useState<GameContentSource>("seed");
  const [socialSource, setSocialSource] = useState<GameContentSource>("seed");
  const [isContentLoading, setIsContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const [securityQuestionOne, setSecurityQuestionOne] = useState(DEFAULT_QUESTION_ONE);
  const [securityQuestionTwo, setSecurityQuestionTwo] = useState(DEFAULT_QUESTION_TWO);
  const [securityAnswerOne, setSecurityAnswerOne] = useState("");
  const [securityAnswerTwo, setSecurityAnswerTwo] = useState("");
  const [securityStatus, setSecurityStatus] = useState<string | null>(null);

  useEffect(() => {
    setPuzzleTag(user?.username ?? "Guest Player");
    setAvatarId(user?.avatarId ?? DEFAULT_AVATAR_ID);
    setFacebookHandle(user?.socialLinks.facebook ?? "");
    setTiktokHandle(user?.socialLinks.tiktok ?? "");
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsContentLoading(true);
      setContentError(null);

      try {
        const snapshot = await loadProfileContent(user?.id);
        if (cancelled) return;

        setLeaderboard(snapshot.leaderboard);
        setSocialDirectory(snapshot.socialDirectory);
        setPuzzleTypes(snapshot.puzzleTypes);
        setLeaderboardSource(snapshot.sources.leaderboard);
        setSocialSource(snapshot.sources.socialDirectory);
      } catch (error) {
        if (cancelled) return;
        setContentError(error instanceof Error ? error.message : "Could not load profile content.");
      } finally {
        if (!cancelled) {
          setIsContentLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "stats", label: "Stats" },
    { id: "social", label: "Links" },
    { id: "security", label: "Security" },
    { id: "inbox", label: "Inbox" },
  ];
  const worstPuzzleLabel = useMemo(
    () => puzzleTypes.find((entry) => entry.type === user?.worstPuzzleType)?.label ?? "No completed matches yet",
    [puzzleTypes, user?.worstPuzzleType],
  );
  const linkedFacebookPlayers = socialDirectory.filter((entry) => entry.facebook_handle).slice(0, 2);
  const linkedTikTokPlayers = socialDirectory.filter((entry) => entry.tiktok_handle).slice(0, 2);

  async function handleSaveProfile() {
    setIsWorking(true);
    setProfileStatus(null);
    try {
      await saveProfile({
        username: puzzleTag.trim() || "PuzzleTag",
        avatarId,
        socialLinks: { facebook: facebookHandle.trim() || undefined, tiktok: tiktokHandle.trim() || undefined },
      });
      setProfileStatus(canSave ? "Profile updated and saved." : "Guest customization applied locally only.");
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleProviderAction(action: () => Promise<void>, successMessage: string) {
    setIsWorking(true);
    setAccountStatus(null);
    try {
      await action();
      setAccountStatus(successMessage);
    } catch (error) {
      setAccountStatus(error instanceof Error ? error.message : "Could not start provider flow.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSaveSecurityQuestions() {
    if (!canSave) {
      setSecurityStatus("Sign in before configuring password recovery.");
      return;
    }
    if (!securityAnswerOne.trim() || !securityAnswerTwo.trim()) {
      setSecurityStatus("Answer both security questions.");
      return;
    }
    if (securityQuestionOne === securityQuestionTwo) {
      setSecurityStatus("Choose two different security questions.");
      return;
    }

    setIsWorking(true);
    setSecurityStatus(null);
    try {
      await saveSecurityQuestions({
        questionOne: securityQuestionOne,
        answerOne: securityAnswerOne,
        questionTwo: securityQuestionTwo,
        answerTwo: securityAnswerTwo,
      });
      await refreshUser();
      setSecurityStatus("Security questions saved.");
      setSecurityAnswerOne("");
      setSecurityAnswerTwo("");
    } catch (error) {
      setSecurityStatus(error instanceof Error ? error.message : "Could not save security questions.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="page-screen">
      <div className="page-stack">
        <PageHeader
          eyebrow="Identity Deck"
          title={puzzleTag}
          subtitle={`${rankBand.label} - ELO ${user?.elo ?? 0}`}
          right={
            <div className="spotlight-panel flex items-center gap-4">
              <IdentityLoadoutCard
                username={puzzleTag}
                subtitle={user?.email ?? "Local mode"}
                avatarId={avatarId}
                frameId={user?.frameId}
                playerCardId={user?.playerCardId}
                bannerId={user?.bannerId}
                emblemId={user?.emblemId}
                titleId={user?.titleId}
                compact
              />
            </div>
          }
        />

        <section className="hero-panel">
          <div className="hero-grid">
            <div className="command-panel-soft p-5">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Live Identity</p>
                  <h2 className="section-title">Your command profile</h2>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
                <div className="command-panel-soft flex items-center justify-center p-4">
                  <StockAvatar avatarId={avatarId} frameId={user?.frameId} size="lg" />
                </div>
                <div className="section-stack">
                  <div>
                    <p className="text-3xl font-black tracking-tight">{user?.username ?? "Guest Player"}</p>
                    <p className={`mt-2 font-hud text-[10px] uppercase tracking-[0.2em] ${getRankColor(user?.rank ?? "bronze")}`}>
                      {rankBand.label}
                    </p>
                  </div>
                  <div className="metric-grid">
                    <div className="rich-stat">
                      <p className="hud-label">Wins</p>
                      <p className="stat-value">{user?.wins ?? 0}</p>
                    </div>
                    <div className="rich-stat">
                      <p className="hud-label">Losses</p>
                      <p className="stat-value">{user?.losses ?? 0}</p>
                    </div>
                    <div className="rich-stat">
                      <p className="hud-label">Weak Spot</p>
                      <p className="text-lg font-black text-primary">{worstPuzzleLabel}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <CosmeticPreview kind="theme" productId={user?.themeId} className="profile-cosmetic-preview" />
                    <CosmeticPreview kind="player_card" productId={user?.playerCardId} className="profile-cosmetic-preview" />
                    <CosmeticPreview kind="banner" productId={user?.bannerId} className="profile-cosmetic-preview" />
                    <CosmeticPreview kind="emblem" productId={user?.emblemId} className="profile-cosmetic-preview" />
                    <CosmeticPreview kind="title" productId={user?.titleId} className="profile-cosmetic-preview" />
                  </div>
                </div>
              </div>
            </div>

            <div className="spotlight-panel profile-spotlight">
              <div className="section-header">
                <div>
                  <p className="section-kicker">Control Surface</p>
                  <h2 className="section-title">Everything reachable</h2>
                </div>
              </div>
              <div className="metric-grid">
                <div className="rich-stat">
                  <p className="hud-label">Level</p>
                  <p className="stat-value">{user?.level ?? 1}</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Pass XP</p>
                  <p className="stat-value text-xp">{user?.passXp ?? 0}</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Rank Points</p>
                  <p className="stat-value text-gradient-prestige">{user?.rankPoints ?? 0}</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Shards</p>
                  <p className="stat-value text-primary">{user?.puzzleShards ?? 0}</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">XP Bank</p>
                  <p className="stat-value text-xp">{user?.xp ?? 0}</p>
                </div>
                <div className="rich-stat">
                  <p className="hud-label">Best Streak</p>
                  <p className="stat-value">{user?.bestStreak ?? 0}</p>
                </div>
              </div>
              <div className="command-panel-soft p-4">
                <p className="hud-label">Economy Readout</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Coins and gems handle broad progression and premium cosmetics. Shards protect against duplicate frustration. Rank points and pass XP now separate season pressure from raw account growth.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {tabs.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setTab(entry.id)}
                    className={`segment-chip justify-center py-3 ${tab === entry.id ? "segment-chip-active" : ""}`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="page-grid">
          <section className="section-panel">
            <div className="section-header">
              <div>
                <p className="section-kicker">Customization</p>
                <h2 className="section-title">Edit identity without digging</h2>
              </div>
            </div>
            <div className="section-stack">
              <div className="command-panel-soft p-4">
                <label className="hud-label" htmlFor="puzzleTag">
                  PuzzleTag
                </label>
                <input
                  id="puzzleTag"
                  value={puzzleTag}
                  onChange={(event) => setPuzzleTag(event.target.value.slice(0, 24))}
                  className="mt-3 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-base font-semibold outline-none focus:border-primary"
                  placeholder="PuzzleTag"
                />
              </div>

              <div className="deck-grid">
                {STOCK_AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setAvatarId(avatar.id)}
                    className={`command-panel-soft avatar-option p-3 text-left transition-colors ${
                      avatarId === avatar.id ? "border-primary bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <StockAvatar avatarId={avatar.id} frameId={user?.frameId} size="sm" />
                      <div>
                        <p className="text-sm font-black">{avatar.label}</p>
                        <p className="text-xs text-muted-foreground">Identity card</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button onClick={() => void handleSaveProfile()} variant="play" size="xl" className="w-full" disabled={isWorking}>
                {canSave ? "Save Identity" : "Apply Guest Style"}
              </Button>
              {profileStatus ? <p className="text-sm text-muted-foreground">{profileStatus}</p> : null}
            </div>
          </section>

          <section className="section-panel">
            {tab === "stats" && (
              <>
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Stats Board</p>
                    <h2 className="section-title">{sourceLabel(leaderboardSource)} ladder pressure</h2>
                  </div>
                </div>
                <div className="section-stack">
                  {contentError ? (
                    <div className="command-panel-soft px-4 py-3 text-sm text-muted-foreground">{contentError}</div>
                  ) : isContentLoading ? (
                    <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                      Loading ladder snapshot...
                    </div>
                  ) : leaderboard.length > 0 ? (
                    leaderboard.slice(0, 5).map((entry, index) => (
                      <PuzzleTileButton
                        key={entry.userId}
                        title={entry.username}
                        description={`${entry.rankTier} - ${entry.wins} wins`}
                        active={entry.userId === user?.id}
                        right={<span className="text-sm font-black text-primary">#{index + 1}</span>}
                      />
                    ))
                  ) : (
                    <div className="command-panel-soft flex min-h-[180px] items-center justify-center p-6 text-sm text-muted-foreground">
                      No leaderboard entries are available yet.
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === "social" && (
              <>
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Social Links</p>
                    <h2 className="section-title">{sourceLabel(socialSource)} connected identities</h2>
                  </div>
                </div>
                <div className="section-stack">
                  {!isSupabaseConfigured ? (
                    <div className="command-panel-soft px-4 py-3 text-sm text-destructive">{supabaseConfigErrorMessage}</div>
                  ) : null}
                  {isGuest ? (
                    <div className="command-panel-soft p-4 text-sm leading-6 text-muted-foreground">
                      Use the sign-in or sign-up flow first. Facebook and TikTok linking unlock once the account is live.
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button onClick={openSignUp} variant="play" size="lg">Sign Up</Button>
                        <Button onClick={openSignIn} variant="outline" size="lg">Sign In</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="action-grid">
                        <PuzzleTileButton
                          icon={Link2}
                          title={user?.linkedProviders?.facebook ? "Facebook linked" : "Link Facebook"}
                          description="Connect friends already playing."
                          onClick={() => void handleProviderAction(linkFacebook, "Redirecting to Facebook...")}
                          disabled={isWorking || user?.linkedProviders?.facebook}
                        />
                        <PuzzleTileButton
                          icon={Link2}
                          title={user?.linkedProviders?.tiktok ? "TikTok linked" : "Link TikTok"}
                          description="Connect your creator identity."
                          onClick={() => void handleProviderAction(linkTikTok, "Redirecting to TikTok...")}
                          disabled={isWorking || user?.linkedProviders?.tiktok}
                        />
                      </div>
                      <div className="action-grid">
                        <input
                          value={facebookHandle}
                          onChange={(event) => setFacebookHandle(event.target.value)}
                          className="h-12 rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
                          placeholder="facebook.com/you"
                        />
                        <input
                          value={tiktokHandle}
                          onChange={(event) => setTiktokHandle(event.target.value)}
                          className="h-12 rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
                          placeholder="tiktok.com/@you"
                        />
                      </div>
                      <Button onClick={() => void handleSaveProfile()} variant="outline" size="lg" className="w-full" disabled={isWorking}>
                        Save Social Links
                      </Button>
                    </>
                  )}
                  <div className="deck-grid">
                    {[...linkedFacebookPlayers, ...linkedTikTokPlayers].slice(0, 4).length > 0 ? (
                      [...linkedFacebookPlayers, ...linkedTikTokPlayers].slice(0, 4).map((entry) => (
                        <div key={entry.id} className="command-panel-soft flex items-center gap-3 p-4">
                          <StockAvatar avatarId={entry.avatar_id ?? DEFAULT_AVATAR_ID} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">{entry.username}</p>
                            <p className="truncate text-[10px] font-hud uppercase tracking-[0.16em] text-muted-foreground">
                              {entry.facebook_handle ?? entry.tiktok_handle}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="command-panel-soft flex min-h-[140px] items-center justify-center p-6 text-sm text-muted-foreground">
                        {isContentLoading ? "Loading social directory..." : "No linked player identities are available yet."}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {tab === "security" && (
              <>
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Security Deck</p>
                    <h2 className="section-title">Password recovery setup</h2>
                  </div>
                  <Shield size={18} className="text-primary" />
                </div>
                <div className="section-stack">
                  <div className="deck-grid">
                    <div className="command-panel-soft p-4">
                      <p className="hud-label">Question 1</p>
                      <select
                        value={securityQuestionOne}
                        onChange={(event) => setSecurityQuestionOne(event.target.value)}
                        className="mt-3 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
                      >
                        {SECURITY_QUESTION_OPTIONS.map((question) => (
                          <option key={question} value={question}>
                            {question}
                          </option>
                        ))}
                      </select>
                      <input
                        value={securityAnswerOne}
                        onChange={(event) => setSecurityAnswerOne(event.target.value)}
                        className="mt-3 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
                        placeholder="Answer"
                        type="password"
                      />
                    </div>
                    <div className="command-panel-soft p-4">
                      <p className="hud-label">Question 2</p>
                      <select
                        value={securityQuestionTwo}
                        onChange={(event) => setSecurityQuestionTwo(event.target.value)}
                        className="mt-3 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
                      >
                        {SECURITY_QUESTION_OPTIONS.map((question) => (
                          <option key={question} value={question}>
                            {question}
                          </option>
                        ))}
                      </select>
                      <input
                        value={securityAnswerTwo}
                        onChange={(event) => setSecurityAnswerTwo(event.target.value)}
                        className="mt-3 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
                        placeholder="Answer"
                        type="password"
                      />
                    </div>
                  </div>
                  <Button onClick={() => void handleSaveSecurityQuestions()} variant="play" size="xl" className="w-full" disabled={isWorking || !isSupabaseConfigured}>
                    <KeyRound size={16} />
                    Save Recovery Questions
                  </Button>
                  {securityStatus ? <p className="text-sm text-muted-foreground">{securityStatus}</p> : null}
                </div>
              </>
            )}

            {tab === "inbox" && (
              <>
                <div className="section-header">
                  <div>
                    <p className="section-kicker">Inbox</p>
                    <h2 className="section-title">Signals and notices</h2>
                  </div>
                  <Bell size={18} className="text-primary" />
                </div>
                <div className="section-stack">
                  <div className="command-panel-soft flex min-h-[220px] flex-col items-center justify-center gap-4 p-6 text-center">
                    <Users size={24} className="text-primary" />
                    <div>
                      <p className="text-base font-black">Inbox cleared</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Real notifications will appear here after live matches, purchases, and social activity.
                      </p>
                    </div>
                    {!isGuest ? (
                      <Button onClick={() => void signOut()} variant="outline" size="lg">
                        Sign Out
                      </Button>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {accountStatus ? <p className="px-1 text-sm text-muted-foreground">{accountStatus}</p> : null}
      </div>
    </div>
  );
}
