import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BarChart3, KeyRound, Link2, Lock, Mail, Shield, Trophy, Users } from "lucide-react";
import StockAvatar from "@/components/profile/StockAvatar";
import { Button } from "@/components/ui/button";
import { fetchLeaderboard, fetchSocialDirectory } from "@/lib/player-data";
import {
  fetchSecurityQuestions,
  resetPasswordWithSecurityQuestions,
  saveSecurityQuestions,
  SECURITY_QUESTION_OPTIONS,
} from "@/lib/auth-security";
import { DEFAULT_AVATAR_ID, STOCK_AVATARS } from "@/lib/profile-customization";
import { getRankBand, getRankColor, PUZZLE_TYPES } from "@/lib/seed-data";
import { isSupabaseConfigured, supabaseConfigErrorMessage } from "@/lib/supabase-client";
import type { LeaderboardEntry } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

type Tab = "stats" | "leaderboard" | "social" | "notifications";
type SocialDirectoryEntry = Awaited<ReturnType<typeof fetchSocialDirectory>>[number];

const DEFAULT_QUESTION_ONE = SECURITY_QUESTION_OPTIONS[0];
const DEFAULT_QUESTION_TWO = SECURITY_QUESTION_OPTIONS[1];

function emptyRecoveryState() {
  return { email: "", questionOne: "", questionTwo: "", answerOne: "", answerTwo: "", newPassword: "" };
}

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("stats");
  const {
    user,
    isGuest,
    canSave,
    saveProfile,
    signUpWithEmail,
    signInWithEmail,
    signInWithFacebook,
    signInWithTikTok,
    linkFacebook,
    linkTikTok,
    signOut,
    refreshUser,
  } = useAuth();
  const rankBand = getRankBand(user?.elo ?? 0);
  const xpPct = user ? Math.round((user.xp / Math.max(user.xpToNext, 1)) * 100) : 0;
  const winRate = user && user.matchesPlayed > 0 ? Math.round((user.wins / user.matchesPlayed) * 100) : 0;
  const [puzzleTag, setPuzzleTag] = useState(user?.username ?? "Guest Player");
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? DEFAULT_AVATAR_ID);
  const [facebookHandle, setFacebookHandle] = useState(user?.socialLinks.facebook ?? "");
  const [tiktokHandle, setTiktokHandle] = useState(user?.socialLinks.tiktok ?? "");
  const [authEmail, setAuthEmail] = useState(user?.email ?? "");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signupQuestionOne, setSignupQuestionOne] = useState(DEFAULT_QUESTION_ONE);
  const [signupQuestionTwo, setSignupQuestionTwo] = useState(DEFAULT_QUESTION_TWO);
  const [signupAnswerOne, setSignupAnswerOne] = useState("");
  const [signupAnswerTwo, setSignupAnswerTwo] = useState("");
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [socialDirectory, setSocialDirectory] = useState<SocialDirectoryEntry[]>([]);
  const [securityQuestionOne, setSecurityQuestionOne] = useState(DEFAULT_QUESTION_ONE);
  const [securityQuestionTwo, setSecurityQuestionTwo] = useState(DEFAULT_QUESTION_TWO);
  const [securityAnswerOne, setSecurityAnswerOne] = useState("");
  const [securityAnswerTwo, setSecurityAnswerTwo] = useState("");
  const [securityStatus, setSecurityStatus] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(emptyRecoveryState());
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);

  useEffect(() => {
    setPuzzleTag(user?.username ?? "Guest Player");
    setAvatarId(user?.avatarId ?? DEFAULT_AVATAR_ID);
    setFacebookHandle(user?.socialLinks.facebook ?? "");
    setTiktokHandle(user?.socialLinks.tiktok ?? "");
    setAuthEmail(user?.email ?? "");
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchLeaderboard(20), fetchSocialDirectory(user?.id)]).then(([nextLeaderboard, nextSocial]) => {
      if (!cancelled) {
        setLeaderboard(nextLeaderboard);
        setSocialDirectory(nextSocial);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "leaderboard", label: "Ranks", icon: Trophy },
    { id: "social", label: "Social", icon: Users },
    { id: "notifications", label: "Inbox", icon: Bell },
  ];
  const worstPuzzleLabel = useMemo(
    () => PUZZLE_TYPES.find((entry) => entry.type === user?.worstPuzzleType)?.label ?? "No completed matches yet",
    [user?.worstPuzzleType],
  );
  const linkedFacebookPlayers = socialDirectory.filter((entry) => entry.facebook_handle);
  const linkedTikTokPlayers = socialDirectory.filter((entry) => entry.tiktok_handle);

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

  async function handleEmailSignup() {
    if (authPassword.length < 8) return setAccountStatus("Password must be at least 8 characters.");
    if (authPassword !== confirmPassword) return setAccountStatus("Password confirmation does not match.");
    if (!signupAnswerOne.trim() || !signupAnswerTwo.trim()) return setAccountStatus("Set answers for both security questions.");
    if (signupQuestionOne === signupQuestionTwo) return setAccountStatus("Choose two different security questions.");
    setIsWorking(true);
    setAccountStatus(null);
    try {
      const message = await signUpWithEmail(authEmail.trim(), authPassword);
      await saveProfile({
        username: puzzleTag.trim() || "PuzzleTag",
        avatarId,
        socialLinks: { facebook: facebookHandle.trim() || undefined, tiktok: tiktokHandle.trim() || undefined },
      });
      try {
        await saveSecurityQuestions({
          questionOne: signupQuestionOne,
          answerOne: signupAnswerOne,
          questionTwo: signupQuestionTwo,
          answerTwo: signupAnswerTwo,
        });
        await refreshUser();
        setSecurityStatus("Security questions saved.");
      } catch {
        setSecurityStatus("Finish setting your security questions after your first successful sign-in if email confirmation is enabled.");
      }
      setAccountStatus(message);
      setAuthPassword("");
      setConfirmPassword("");
    } catch (error) {
      setAccountStatus(error instanceof Error ? error.message : "Could not create your account.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleEmailLogin() {
    if (!authEmail.trim() || !authPassword) return setAccountStatus("Enter your email and password.");
    setIsWorking(true);
    setAccountStatus(null);
    try {
      const message = await signInWithEmail(authEmail.trim(), authPassword);
      await saveProfile({
        username: puzzleTag.trim() || "PuzzleTag",
        avatarId,
        socialLinks: { facebook: facebookHandle.trim() || undefined, tiktok: tiktokHandle.trim() || undefined },
      });
      setAccountStatus(message);
      setAuthPassword("");
      setConfirmPassword("");
    } catch (error) {
      setAccountStatus(error instanceof Error ? error.message : "Could not sign in.");
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
      setIsWorking(false);
    }
  }

  async function handleSaveSecurityQuestions() {
    if (!canSave) return setSecurityStatus("Sign in before configuring password recovery.");
    if (!securityAnswerOne.trim() || !securityAnswerTwo.trim()) return setSecurityStatus("Answer both security questions.");
    if (securityQuestionOne === securityQuestionTwo) return setSecurityStatus("Choose two different security questions.");
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
      setSecurityStatus("Security questions saved for password recovery.");
      setSecurityAnswerOne("");
      setSecurityAnswerTwo("");
    } catch (error) {
      setSecurityStatus(error instanceof Error ? error.message : "Could not save security questions.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleLoadRecoveryQuestions() {
    if (!recovery.email.trim()) return setRecoveryStatus("Enter the email tied to your account.");
    setIsWorking(true);
    setRecoveryStatus(null);
    try {
      const questions = await fetchSecurityQuestions(recovery.email.trim());
      setRecovery((current) => ({ ...current, questionOne: questions.questionOne, questionTwo: questions.questionTwo }));
      setRecoveryStatus("Security questions loaded.");
    } catch (error) {
      setRecoveryStatus(error instanceof Error ? error.message : "Could not load security questions.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleResetPassword() {
    if (!recovery.email.trim() || !recovery.answerOne.trim() || !recovery.answerTwo.trim() || recovery.newPassword.length < 8) {
      return setRecoveryStatus("Enter your email, both answers, and a new password with at least 8 characters.");
    }
    setIsWorking(true);
    setRecoveryStatus(null);
    try {
      await resetPasswordWithSecurityQuestions(recovery.email.trim(), {
        answerOne: recovery.answerOne,
        answerTwo: recovery.answerTwo,
        newPassword: recovery.newPassword,
      });
      setRecoveryStatus("Password reset. You can sign in with the new password now.");
      setRecovery(emptyRecoveryState());
    } catch (error) {
      setRecoveryStatus(error instanceof Error ? error.message : "Could not reset password.");
    } finally {
      setIsWorking(false);
    }
  }

  const providerBadge = (label: string, linked: boolean) => (
    <div className={`rounded-2xl px-3 py-2 text-xs font-hud uppercase tracking-[0.16em] ${linked ? "bg-primary/10 text-primary" : "bg-background/35 text-muted-foreground"}`}>
      {label}: {linked ? "linked" : "not linked"}
    </div>
  );

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <section className="panel space-y-5">
        <div className="flex items-start gap-4">
          <StockAvatar avatarId={avatarId} size="lg" />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="hud-label">Player Card</p>
                <h1 className="mt-1 text-2xl font-black">{puzzleTag}</h1>
                <p className={`mt-1 text-[11px] font-hud font-semibold uppercase tracking-[0.18em] ${getRankColor(user?.rank ?? "bronze")}`}>{rankBand.label} | ELO {user?.elo ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/35 px-3 py-2 text-right">
                <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                <p className="text-sm font-black">{isGuest ? "Guest" : "Saved"}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-play" style={{ width: `${xpPct}%` }} /></div>
              <span className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Lv {user?.level ?? 1}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[{ value: user?.wins ?? 0, label: "Wins" }, { value: user?.losses ?? 0, label: "Losses" }, { value: user?.bestStreak ?? 0, label: "Best" }, { value: `${winRate}%`, label: "Rate" }].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-background/35 p-3 text-center">
              <p className="text-lg font-black">{stat.value}</p>
              <p className="mt-1 font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-background/30 p-4">
            <div className="flex items-center gap-2"><Shield size={16} className="text-primary" /><p className="text-sm font-black">Identity Links</p></div>
            <div className="mt-3 flex flex-wrap gap-2">
              {providerBadge("Email", user?.linkedProviders?.email ?? !isGuest)}
              {providerBadge("Facebook", user?.linkedProviders?.facebook ?? false)}
              {providerBadge("TikTok", user?.linkedProviders?.tiktok ?? false)}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">TikTok uses your configured Supabase OAuth/OIDC provider. Set <code>VITE_SUPABASE_TIKTOK_PROVIDER</code> if your provider id differs from <code>custom:tiktok</code>.</div>
          </div>
          <div className="rounded-3xl border border-border bg-background/30 p-4">
            <div className="flex items-center gap-2"><KeyRound size={16} className="text-primary" /><p className="text-sm font-black">Recovery Status</p></div>
            <p className="mt-3 text-sm text-muted-foreground">{user?.securityQuestionsConfigured ? "Security questions are configured for this account." : "Set two security questions after signing in so you can recover your password later."}</p>
          </div>
        </div>
      </section>
      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <div><p className="hud-label">Profile Customization</p><h2 className="mt-1 text-lg font-black">PuzzleTag, avatar, and public social URLs</h2></div>
          <Link2 size={18} className="text-accent" />
        </div>
        <div>
          <label className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">PuzzleTag</label>
          <input value={puzzleTag} onChange={(event) => setPuzzleTag(event.target.value.slice(0, 24))} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm font-semibold outline-none focus:border-primary" placeholder="PuzzleTag" />
        </div>
        <div>
          <p className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Stock Avatars</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {STOCK_AVATARS.map((avatar) => (
              <button key={avatar.id} onClick={() => setAvatarId(avatar.id)} className={`rounded-3xl border p-3 text-left transition-all ${avatarId === avatar.id ? "border-primary bg-primary/10" : "border-border bg-background/35"}`}>
                <div className="flex items-center gap-3"><StockAvatar avatarId={avatar.id} size="sm" /><div><p className="text-sm font-black">{avatar.label}</p><p className="text-xs text-muted-foreground">{avatar.description}</p></div></div>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Facebook Profile URL</label>
            <input value={facebookHandle} onChange={(event) => setFacebookHandle(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="facebook.com/yourtag" />
          </div>
          <div>
            <label className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">TikTok Profile URL</label>
            <input value={tiktokHandle} onChange={(event) => setTiktokHandle(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="tiktok.com/@yourtag" />
          </div>
        </div>
        <Button onClick={() => void handleSaveProfile()} variant="play" size="lg" className="w-full" disabled={isWorking}>{canSave ? "Save Profile" : "Apply Guest Customization"}</Button>
        {profileStatus && <p className="text-sm text-muted-foreground">{profileStatus}</p>}
      </section>

      <section className="panel space-y-4">
        <div className="flex items-center justify-between">
          <div><p className="hud-label text-primary">Account Access</p><h2 className="mt-1 text-lg font-black">Full login system</h2></div>
          <Mail size={18} className="text-primary" />
        </div>
        {!isSupabaseConfigured && <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{supabaseConfigErrorMessage}</div>}
        {isGuest ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-background/30 p-4">
              <p className="text-sm font-black">Create account with email + password</p>
              <div className="mt-3 space-y-3">
                <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Email address" type="email" />
                <input value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Password" type="password" />
                <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Confirm password" type="password" />
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Security question 1</label>
                    <select value={signupQuestionOne} onChange={(event) => setSignupQuestionOne(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary">{SECURITY_QUESTION_OPTIONS.map((question) => <option key={question} value={question}>{question}</option>)}</select>
                    <input value={signupAnswerOne} onChange={(event) => setSignupAnswerOne(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Answer" type="password" />
                  </div>
                  <div>
                    <label className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Security question 2</label>
                    <select value={signupQuestionTwo} onChange={(event) => setSignupQuestionTwo(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary">{SECURITY_QUESTION_OPTIONS.map((question) => <option key={question} value={question}>{question}</option>)}</select>
                    <input value={signupAnswerTwo} onChange={(event) => setSignupAnswerTwo(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Answer" type="password" />
                  </div>
                </div>
                <Button onClick={() => void handleEmailSignup()} variant="play" size="lg" className="w-full" disabled={isWorking || !isSupabaseConfigured}><Lock size={16} />Sign Up With Email</Button>
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-background/30 p-4">
              <p className="text-sm font-black">Sign in and link providers</p>
              <div className="mt-3 space-y-3">
                <input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Email address" type="email" />
                <input value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Password" type="password" />
                <Button onClick={() => void handleEmailLogin()} variant="outline" size="lg" className="w-full" disabled={isWorking || !isSupabaseConfigured}><Mail size={16} />Sign In With Email</Button>
                <Button onClick={() => void handleProviderAction(signInWithFacebook, "Redirecting to Facebook sign-in...")} variant="outline" size="lg" className="w-full" disabled={isWorking || !isSupabaseConfigured}>Continue With Facebook</Button>
                <Button onClick={() => void handleProviderAction(signInWithTikTok, "Redirecting to TikTok sign-in...")} variant="outline" size="lg" className="w-full" disabled={isWorking || !isSupabaseConfigured}>Continue With TikTok</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-background/30 p-4">
              <p className="text-sm font-black">Connected account</p>
              <p className="mt-2 text-sm text-muted-foreground">Signed in as {user?.email ?? "linked social account"} using {user?.authMethod ?? "email"} auth. Ranked matches and store purchases will now save to this account.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => void handleProviderAction(linkFacebook, "Redirecting to Facebook to link this account...")} variant="outline" size="lg" disabled={isWorking || !isSupabaseConfigured || user?.linkedProviders?.facebook}>{user?.linkedProviders?.facebook ? "Facebook Linked" : "Link Facebook"}</Button>
                <Button onClick={() => void handleProviderAction(linkTikTok, "Redirecting to TikTok to link this account...")} variant="outline" size="lg" disabled={isWorking || !isSupabaseConfigured || user?.linkedProviders?.tiktok}>{user?.linkedProviders?.tiktok ? "TikTok Linked" : "Link TikTok"}</Button>
                <Button onClick={() => void signOut()} variant="outline" size="lg" disabled={isWorking}>Sign Out</Button>
              </div>
            </div>
            <div className="rounded-3xl border border-border bg-background/30 p-4">
              <div className="flex items-center gap-2"><Shield size={16} className="text-primary" /><p className="text-sm font-black">Set or update security questions</p></div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Question 1</label>
                  <select value={securityQuestionOne} onChange={(event) => setSecurityQuestionOne(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary">{SECURITY_QUESTION_OPTIONS.map((question) => <option key={question} value={question}>{question}</option>)}</select>
                  <input value={securityAnswerOne} onChange={(event) => setSecurityAnswerOne(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Answer" type="password" />
                </div>
                <div>
                  <label className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Question 2</label>
                  <select value={securityQuestionTwo} onChange={(event) => setSecurityQuestionTwo(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary">{SECURITY_QUESTION_OPTIONS.map((question) => <option key={question} value={question}>{question}</option>)}</select>
                  <input value={securityAnswerTwo} onChange={(event) => setSecurityAnswerTwo(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Answer" type="password" />
                </div>
              </div>
              <Button onClick={() => void handleSaveSecurityQuestions()} variant="play" size="lg" className="mt-4 w-full" disabled={isWorking || !isSupabaseConfigured}>Save Security Questions</Button>
              {securityStatus && <p className="mt-3 text-sm text-muted-foreground">{securityStatus}</p>}
            </div>
          </div>
        )}
        {accountStatus && <p className="text-sm text-muted-foreground">{accountStatus}</p>}
      </section>

      <section className="panel space-y-4">
        <div className="flex items-center gap-2"><KeyRound size={16} className="text-primary" /><div><p className="hud-label text-primary">Forgot Password</p><h2 className="mt-1 text-lg font-black">Reset with your security questions</h2></div></div>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input value={recovery.email} onChange={(event) => setRecovery((current) => ({ ...current, email: event.target.value }))} className="h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Account email" type="email" />
          <Button onClick={() => void handleLoadRecoveryQuestions()} variant="outline" size="lg" disabled={isWorking || !isSupabaseConfigured}>Load Questions</Button>
        </div>
        {recovery.questionOne && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-background/35 p-4">
              <p className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{recovery.questionOne}</p>
              <input value={recovery.answerOne} onChange={(event) => setRecovery((current) => ({ ...current, answerOne: event.target.value }))} className="mt-3 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Answer" type="password" />
            </div>
            <div className="rounded-2xl bg-background/35 p-4">
              <p className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{recovery.questionTwo}</p>
              <input value={recovery.answerTwo} onChange={(event) => setRecovery((current) => ({ ...current, answerTwo: event.target.value }))} className="mt-3 h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="Answer" type="password" />
            </div>
          </div>
        )}
        <input value={recovery.newPassword} onChange={(event) => setRecovery((current) => ({ ...current, newPassword: event.target.value }))} className="h-12 w-full rounded-2xl border border-border bg-background/35 px-4 text-sm outline-none focus:border-primary" placeholder="New password" type="password" />
        <Button onClick={() => void handleResetPassword()} variant="play" size="lg" className="w-full" disabled={isWorking || !isSupabaseConfigured}>Reset Password</Button>
        {recoveryStatus && <p className="text-sm text-muted-foreground">{recoveryStatus}</p>}
      </section>

      <div className="grid grid-cols-4 gap-2 rounded-[28px] border border-border bg-card/80 p-2 backdrop-blur-xl">
        {tabs.map((entry) => (
          <button key={entry.id} onClick={() => setTab(entry.id)} className={`relative rounded-[20px] px-2 py-3 text-center transition-all ${tab === entry.id ? "bg-primary/12 text-primary" : "text-muted-foreground"}`}>
            <entry.icon size={16} className="mx-auto" />
            <span className="mt-1 block font-hud text-[9px] font-semibold uppercase tracking-[0.14em]">{entry.label}</span>
            {tab === entry.id && <motion.div layoutId="profile-tab" className="absolute inset-0 -z-10 rounded-[20px] border border-primary/20 bg-primary/5" />}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tab === "stats" && <div className="panel"><p className="hud-label">Puzzle Skill Breakdown</p><div className="mt-4 space-y-3"><div className="rounded-2xl bg-background/35 p-3"><p className="text-sm font-bold">Weakest live puzzle type</p><p className="mt-1 text-sm text-muted-foreground">{worstPuzzleLabel}</p></div>{PUZZLE_TYPES.map((puzzle) => { const value = user?.puzzleSkills[puzzle.type] ?? 0; return <div key={puzzle.type} className="rounded-2xl bg-background/35 p-3"><div className="flex items-center gap-3"><span className="flex-1 text-sm font-bold">{puzzle.label}</span><span className="font-hud text-xs text-primary">{value}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-play" style={{ width: `${value}%` }} /></div></div>; })}</div></div>}
        {tab === "leaderboard" && <div className="space-y-2">{leaderboard.length === 0 ? <div className="panel text-sm text-muted-foreground">No ranked players have finished matches yet.</div> : leaderboard.map((entry) => <div key={entry.userId} className={`surface flex items-center gap-3 p-3 ${entry.userId === user?.id ? "border-primary/30 bg-primary/5" : ""}`}><span className="w-6 text-center font-hud text-sm font-semibold">{entry.rank}</span><StockAvatar avatarId={entry.avatarId ?? DEFAULT_AVATAR_ID} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{entry.username}</p><p className={`text-[11px] font-hud font-semibold uppercase tracking-[0.16em] ${getRankColor(entry.rankTier)}`}>{entry.rankTier}</p></div><span className="text-sm font-black text-primary">{entry.elo}</span></div>)}</div>}
        {tab === "social" && <div className="space-y-4"><div className="panel"><p className="text-sm font-black">Facebook-linked players</p><div className="mt-3 space-y-2">{linkedFacebookPlayers.length === 0 ? <p className="text-sm text-muted-foreground">No Facebook-linked players yet.</p> : linkedFacebookPlayers.map((entry) => <div key={entry.id} className="flex items-center gap-3 rounded-2xl bg-background/35 p-3"><StockAvatar avatarId={entry.avatar_id ?? DEFAULT_AVATAR_ID} size="sm" /><div className="flex-1"><p className="text-sm font-bold">{entry.username}</p><p className="text-[11px] font-hud uppercase tracking-[0.16em] text-muted-foreground">{entry.facebook_handle}</p></div></div>)}</div></div><div className="panel"><p className="text-sm font-black">TikTok-linked players</p><div className="mt-3 space-y-2">{linkedTikTokPlayers.length === 0 ? <p className="text-sm text-muted-foreground">No TikTok-linked players yet.</p> : linkedTikTokPlayers.map((entry) => <div key={entry.id} className="flex items-center gap-3 rounded-2xl bg-background/35 p-3"><StockAvatar avatarId={entry.avatar_id ?? DEFAULT_AVATAR_ID} size="sm" /><div className="flex-1"><p className="text-sm font-bold">{entry.username}</p><p className="text-[11px] font-hud uppercase tracking-[0.16em] text-muted-foreground">{entry.tiktok_handle}</p></div></div>)}</div></div></div>}
        {tab === "notifications" && <div className="panel text-center"><p className="text-sm font-black">Inbox cleared</p><p className="mt-2 text-sm text-muted-foreground">This is a fresh launch state. Real notifications will appear here after live matches, purchases, and account events.</p></div>}
      </div>
    </div>
  );
}
