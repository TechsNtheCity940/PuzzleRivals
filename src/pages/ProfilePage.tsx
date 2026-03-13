import { useEffect, useMemo, useState } from "react";
import { Bell, KeyRound, Link2, Shield, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthDialog } from "@/components/auth/AuthDialogContext";
import PageHeader from "@/components/layout/PageHeader";
import PuzzleTileButton from "@/components/layout/PuzzleTileButton";
import StockAvatar from "@/components/profile/StockAvatar";
import { Button } from "@/components/ui/button";
import { fetchLeaderboard, fetchSocialDirectory } from "@/lib/player-data";
import { saveSecurityQuestions, SECURITY_QUESTION_OPTIONS } from "@/lib/auth-security";
import { DEFAULT_AVATAR_ID, STOCK_AVATARS } from "@/lib/profile-customization";
import { getRankBand, getRankColor, PUZZLE_TYPES } from "@/lib/seed-data";
import { isSupabaseConfigured, supabaseConfigErrorMessage } from "@/lib/supabase-client";
import type { LeaderboardEntry } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

type Tab = "stats" | "social" | "security" | "inbox";
type SocialDirectoryEntry = Awaited<ReturnType<typeof fetchSocialDirectory>>[number];

const DEFAULT_QUESTION_ONE = SECURITY_QUESTION_OPTIONS[0];
const DEFAULT_QUESTION_TWO = SECURITY_QUESTION_OPTIONS[1];

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
  const [socialDirectory, setSocialDirectory] = useState<SocialDirectoryEntry[]>([]);
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
    void Promise.all([fetchLeaderboard(8), fetchSocialDirectory(user?.id)]).then(([nextLeaderboard, nextSocial]) => {
      if (!cancelled) {
        setLeaderboard(nextLeaderboard);
        setSocialDirectory(nextSocial);
      }
    });
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
    () => PUZZLE_TYPES.find((entry) => entry.type === user?.worstPuzzleType)?.label ?? "No completed matches yet",
    [user?.worstPuzzleType],
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
          subtitle={`${rankBand.label} • ELO ${user?.elo ?? 0}`}
          right={
            <div className="command-panel-soft flex items-center gap-3 px-3 py-2">
              <StockAvatar avatarId={avatarId} size="sm" />
              <div className="text-right">
                <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-primary">{isGuest ? "Guest" : "Saved"}</p>
                <p className="text-xs font-bold">{user?.email ?? "Local mode"}</p>
              </div>
            </div>
          }
        />

        <section className="command-panel grid min-h-0 flex-1 grid-rows-[auto_auto_1fr] gap-3 overflow-hidden p-3">
          <div className="grid grid-cols-[0.95fr_1.05fr] gap-3">
            <div className="command-panel-soft grid grid-cols-[auto_1fr] gap-3 p-3">
              <StockAvatar avatarId={avatarId} size="lg" />
              <div className="min-w-0">
                <p className="hud-label">Live Identity</p>
                <p className="truncate text-lg font-black">{user?.username ?? "Guest Player"}</p>
                <p className={`mt-1 font-hud text-[10px] uppercase tracking-[0.18em] ${getRankColor(user?.rank ?? "bronze")}`}>
                  {rankBand.label}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-black/20 px-2 py-2 text-center">
                    <p className="font-hud text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Wins</p>
                    <p className="text-sm font-black">{user?.wins ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 px-2 py-2 text-center">
                    <p className="font-hud text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Losses</p>
                    <p className="text-sm font-black">{user?.losses ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-black/20 px-2 py-2 text-center">
                    <p className="font-hud text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Weakest</p>
                    <p className="truncate text-sm font-black text-primary">{worstPuzzleLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {tabs.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setTab(entry.id)}
                  className={`segment-chip h-full ${tab === entry.id ? "segment-chip-active" : ""}`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-h-0 grid-cols-[0.95fr_1.05fr] gap-3">
            <div className="command-panel-soft min-h-0 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="hud-label">Customization</p>
                  <p className="text-sm font-black">Compact avatar and PuzzleTag edits</p>
                </div>
                <img src="/brand/puzzle-rivals-logo.png" alt="Puzzle Rivals" className="h-8 w-8 rounded-full object-cover" draggable={false} />
              </div>
              <div className="grid gap-3">
                <input
                  value={puzzleTag}
                  onChange={(event) => setPuzzleTag(event.target.value.slice(0, 24))}
                  className="h-11 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm font-semibold outline-none focus:border-primary"
                  placeholder="PuzzleTag"
                />
                <div className="grid grid-cols-2 gap-2">
                  {STOCK_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setAvatarId(avatar.id)}
                      className={`rounded-[22px] border p-2 ${avatarId === avatar.id ? "border-primary bg-primary/10" : "border-white/10 bg-black/15"}`}
                    >
                      <div className="flex items-center gap-2">
                        <StockAvatar avatarId={avatar.id} size="sm" />
                        <span className="truncate text-xs font-bold">{avatar.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <Button onClick={() => void handleSaveProfile()} variant="play" size="lg" className="w-full" disabled={isWorking}>
                  {canSave ? "Save Identity" : "Apply Guest Style"}
                </Button>
                {profileStatus ? <p className="text-xs text-muted-foreground">{profileStatus}</p> : null}
              </div>
            </div>

            <div className="min-h-0">
              {tab === "stats" && (
                <div className="grid h-full gap-3">
                  {leaderboard.slice(0, 3).map((entry, index) => (
                    <PuzzleTileButton
                      key={entry.userId}
                      title={entry.username}
                      description={`${entry.rankTier} • ${entry.wins} wins`}
                      active={entry.userId === user?.id}
                      right={<span className="text-sm font-black text-primary">#{index + 1}</span>}
                    />
                  ))}
                </div>
              )}

              {tab === "social" && (
                <div className="grid h-full grid-rows-[auto_auto_1fr] gap-3">
                  {!isSupabaseConfigured ? (
                    <div className="command-panel-soft px-4 py-3 text-sm text-destructive">{supabaseConfigErrorMessage}</div>
                  ) : null}
                  {isGuest ? (
                    <div className="command-panel-soft p-4 text-sm text-muted-foreground">
                      Use the top-right sign-in or sign-up buttons first. Facebook and TikTok linking only unlock after you
                      are signed in.
                      <div className="mt-4 flex gap-3">
                        <Button onClick={openSignUp} variant="play" size="lg" className="flex-1">Sign Up</Button>
                        <Button onClick={openSignIn} variant="outline" size="lg" className="flex-1">Sign In</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
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
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          value={facebookHandle}
                          onChange={(event) => setFacebookHandle(event.target.value)}
                          className="h-11 rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
                          placeholder="facebook.com/you"
                        />
                        <input
                          value={tiktokHandle}
                          onChange={(event) => setTiktokHandle(event.target.value)}
                          className="h-11 rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
                          placeholder="tiktok.com/@you"
                        />
                      </div>
                    </>
                  )}
                  <div className="grid min-h-0 grid-cols-2 gap-3">
                    {[...linkedFacebookPlayers, ...linkedTikTokPlayers].slice(0, 4).map((entry) => (
                      <div key={entry.id} className="command-panel-soft flex items-center gap-3 p-3">
                        <StockAvatar avatarId={entry.avatar_id ?? DEFAULT_AVATAR_ID} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{entry.username}</p>
                          <p className="truncate text-[10px] font-hud uppercase tracking-[0.16em] text-muted-foreground">
                            {entry.facebook_handle ?? entry.tiktok_handle}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "security" && (
                <div className="grid h-full gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="command-panel-soft p-3">
                      <p className="hud-label">Question 1</p>
                      <select
                        value={securityQuestionOne}
                        onChange={(event) => setSecurityQuestionOne(event.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
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
                        className="mt-2 h-11 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
                        placeholder="Answer"
                        type="password"
                      />
                    </div>
                    <div className="command-panel-soft p-3">
                      <p className="hud-label">Question 2</p>
                      <select
                        value={securityQuestionTwo}
                        onChange={(event) => setSecurityQuestionTwo(event.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
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
                        className="mt-2 h-11 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary"
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
              )}

              {tab === "inbox" && (
                <div className="command-panel-soft flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <Bell size={24} className="text-primary" />
                  <div>
                    <p className="text-sm font-black">Inbox cleared</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Real notifications will appear here after live matches, purchases, and social activity.
                    </p>
                  </div>
                  {!isGuest ? (
                    <Button onClick={() => void signOut()} variant="outline" size="lg">
                      Sign Out
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>
        {accountStatus ? <p className="px-2 text-xs text-muted-foreground">{accountStatus}</p> : null}
      </div>
    </div>
  );
}
