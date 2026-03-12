import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BarChart3,
  Link2,
  Mail,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import StockAvatar from "@/components/profile/StockAvatar";
import { Button } from "@/components/ui/button";
import { fetchLeaderboard, fetchSocialDirectory } from "@/lib/player-data";
import { DEFAULT_AVATAR_ID, STOCK_AVATARS } from "@/lib/profile-customization";
import { getRankBand, getRankColor, PUZZLE_TYPES } from "@/lib/seed-data";
import { isSupabaseConfigured, supabaseConfigErrorMessage } from "@/lib/supabase-client";
import type { LeaderboardEntry } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

type Tab = "stats" | "leaderboard" | "social" | "notifications";

type SocialDirectoryEntry = Awaited<ReturnType<typeof fetchSocialDirectory>>[number];

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("stats");
  const { user, isGuest, canSave, saveProfile, signInWithEmail, signInWithFacebook, signOut } = useAuth();
  const rankBand = getRankBand(user?.elo ?? 0);
  const xpPct = user ? Math.round((user.xp / Math.max(user.xpToNext, 1)) * 100) : 0;
  const winRate = user && user.matchesPlayed > 0 ? Math.round((user.wins / user.matchesPlayed) * 100) : 0;

  const [puzzleTag, setPuzzleTag] = useState(user?.username ?? "Guest Player");
  const [avatarId, setAvatarId] = useState(user?.avatarId ?? DEFAULT_AVATAR_ID);
  const [facebookHandle, setFacebookHandle] = useState(user?.socialLinks.facebook ?? "");
  const [tiktokHandle, setTiktokHandle] = useState(user?.socialLinks.tiktok ?? "");
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [socialDirectory, setSocialDirectory] = useState<SocialDirectoryEntry[]>([]);

  useEffect(() => {
    setPuzzleTag(user?.username ?? "Guest Player");
    setAvatarId(user?.avatarId ?? DEFAULT_AVATAR_ID);
    setFacebookHandle(user?.socialLinks.facebook ?? "");
    setTiktokHandle(user?.socialLinks.tiktok ?? "");
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
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await saveProfile({
        username: puzzleTag.trim() || "PuzzleTag",
        avatarId,
        socialLinks: {
          facebook: facebookHandle.trim() || undefined,
          tiktok: tiktokHandle.trim() || undefined,
        },
      });
      setStatusMessage(
        canSave
          ? "Profile updated. Your PuzzleTag, avatar, and social links are now live."
          : "Guest customization applied locally. Create an account to save it permanently.",
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEmailSignIn() {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const message = await signInWithEmail(email.trim());
      setStatusMessage(message);
      await saveProfile({
        username: puzzleTag.trim() || "PuzzleTag",
        avatarId,
        socialLinks: {
          facebook: facebookHandle.trim() || undefined,
          tiktok: tiktokHandle.trim() || undefined,
        },
      });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not start email sign-in.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFacebookSignIn() {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await signInWithFacebook();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not start Facebook sign-in.");
      setIsSaving(false);
    }
  }

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
                <p className={`mt-1 text-[11px] font-hud font-semibold uppercase tracking-[0.18em] ${getRankColor(user?.rank ?? "bronze")}`}>
                  {rankBand.label} | ELO {user?.elo ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background/35 px-3 py-2 text-right">
                <p className="font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                <p className="text-sm font-black">{isGuest ? "Guest" : "Saved"}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-play" style={{ width: `${xpPct}%` }} />
              </div>
              <span className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Lv {user?.level ?? 1}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { val: user?.wins ?? 0, label: "Wins" },
                { val: user?.losses ?? 0, label: "Losses" },
                { val: user?.bestStreak ?? 0, label: "Best" },
                { val: `${winRate}%`, label: "Rate" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-background/35 p-3 text-center">
                  <p className="text-lg font-black">{stat.val}</p>
                  <p className="mt-1 font-hud text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 rounded-[28px] bg-background/30 p-4">
          <div>
            <p className="hud-label">Customization</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Set your PuzzleTag, choose one of the four stock avatars, and link your public social handles.
            </p>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold">PuzzleTag</span>
            <input
              value={puzzleTag}
              onChange={(event) => setPuzzleTag(event.target.value.slice(0, 24))}
              className="h-12 rounded-2xl border border-border bg-background/35 px-4 text-sm font-semibold outline-none focus:border-primary"
              placeholder="Set your PuzzleTag"
            />
          </label>

          <div>
            <p className="text-sm font-bold">Stock Avatars</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {STOCK_AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => setAvatarId(avatar.id)}
                  className={`rounded-[24px] border p-3 text-left transition-all ${
                    avatarId === avatar.id ? "border-primary/30 bg-primary/10" : "border-border bg-background/35"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <StockAvatar avatarId={avatar.id} selected={avatarId === avatar.id} />
                    <div>
                      <p className="text-sm font-bold">{avatar.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{avatar.accessoryLabel}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-bold">Facebook Profile</span>
              <input
                value={facebookHandle}
                onChange={(event) => setFacebookHandle(event.target.value)}
                className="h-12 rounded-2xl border border-border bg-background/35 px-4 text-sm font-semibold outline-none focus:border-primary"
                placeholder="facebook.com/yourtag or @yourtag"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold">TikTok Profile</span>
              <input
                value={tiktokHandle}
                onChange={(event) => setTiktokHandle(event.target.value)}
                className="h-12 rounded-2xl border border-border bg-background/35 px-4 text-sm font-semibold outline-none focus:border-primary"
                placeholder="tiktok.com/@yourtag"
              />
            </label>
          </div>

          <Button onClick={() => void handleSaveProfile()} variant="play" size="lg" disabled={isSaving}>
            <Shield size={16} />
            {canSave ? "Save Profile" : "Apply Guest Customization"}
          </Button>

          {statusMessage && (
            <div className="rounded-2xl border border-primary/15 bg-primary/10 px-4 py-3 text-sm text-primary">
              {statusMessage}
            </div>
          )}
        </div>

        <div className="grid gap-3 rounded-[28px] bg-background/30 p-4">
          <div>
            <p className="hud-label">Account Saving</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Guests can customize locally, but real stats, wins, and leaderboard placement only save to an account.
            </p>
          </div>

          {isGuest ? (
            <>
              {!isSupabaseConfigured && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {supabaseConfigErrorMessage}
                </div>
              )}
              <label className="grid gap-2">
                <span className="text-sm font-bold">Email Sign-In</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-2xl border border-border bg-background/35 px-4 text-sm font-semibold outline-none focus:border-primary"
                  placeholder="you@example.com"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button onClick={() => void handleEmailSignIn()} variant="play" size="lg" disabled={isSaving || !email.trim()}>
                  <Mail size={16} />
                  Save With Email
                </Button>
                <Button onClick={() => void handleFacebookSignIn()} variant="outline" size="lg" disabled={isSaving}>
                  <Link2 size={16} />
                  Continue With Facebook
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                TikTok is available here as a profile link for discovery. Real account sign-in is currently wired for email and Facebook.
              </p>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/35 px-4 py-3">
              <div>
                <p className="text-sm font-bold">{user?.email ?? "Signed-in player"}</p>
                <p className="text-xs text-muted-foreground">
                  Saving through {user?.authMethod === "facebook" ? "Facebook" : "email"} account
                </p>
              </div>
              <Button onClick={() => void signOut()} variant="outline" size="sm">
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-4 gap-2 rounded-[28px] border border-border bg-card/80 p-2 backdrop-blur-xl">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`relative rounded-[20px] px-2 py-3 text-center transition-all ${
              tab === item.id ? "bg-primary/12 text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon size={16} className="mx-auto" />
            <span className="mt-1 block font-hud text-[9px] font-semibold uppercase tracking-[0.14em]">{item.label}</span>
            {tab === item.id && (
              <motion.div layoutId="profile-tab" className="absolute inset-0 -z-10 rounded-[20px] border border-primary/20 bg-primary/5" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tab === "stats" && (
          <div className="panel space-y-4">
            <div className="rounded-2xl bg-background/35 p-4">
              <p className="hud-label">Worst Puzzle Type</p>
              <p className="mt-2 text-lg font-black">{worstPuzzleLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This is based on your live match history. Guest players stay at zero until they create an account.
              </p>
            </div>

            {PUZZLE_TYPES.map((puzzle) => {
              const skill = user?.puzzleSkills[puzzle.type] ?? 0;
              return (
                <div key={puzzle.type} className="rounded-2xl bg-background/35 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{puzzle.icon}</span>
                    <span className="flex-1 text-sm font-bold">{puzzle.label}</span>
                    <span className="font-hud text-xs text-primary">{skill}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-gradient-play" style={{ width: `${skill}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="space-y-2">
            {leaderboard.length > 0 ? (
              leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`surface flex items-center gap-3 p-3 ${entry.userId === user?.id ? "border-primary/30 bg-primary/5" : ""}`}
                >
                  <span className="w-6 text-center font-hud text-sm font-semibold">{entry.rank}</span>
                  <StockAvatar avatarId={entry.avatarId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{entry.username}</p>
                    <p className={`text-[11px] font-hud font-semibold uppercase tracking-[0.16em] ${getRankColor(entry.rankTier)}`}>
                      {entry.rankTier}
                    </p>
                  </div>
                  <span className="text-sm font-black text-primary">{entry.elo}</span>
                </div>
              ))
            ) : (
              <div className="panel text-sm text-muted-foreground">
                No leaderboard entries yet. Real rankings start after saved-account matches are completed.
              </div>
            )}
          </div>
        )}

        {tab === "social" && (
          <div className="space-y-4">
            <div className="panel">
              <p className="mb-3 text-sm font-black">Facebook-linked players</p>
              <div className="space-y-2">
                {linkedFacebookPlayers.length > 0 ? (
                  linkedFacebookPlayers.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 rounded-2xl bg-background/35 p-3">
                      <StockAvatar avatarId={entry.avatar_id} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-bold">{entry.username}</p>
                        <p className="text-[11px] font-hud uppercase tracking-[0.16em] text-muted-foreground">
                          {entry.facebook_handle}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No linked Facebook profiles yet.</p>
                )}
              </div>
            </div>

            <div className="panel">
              <p className="mb-3 text-sm font-black">TikTok-linked players</p>
              <div className="space-y-2">
                {linkedTikTokPlayers.length > 0 ? (
                  linkedTikTokPlayers.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 rounded-2xl bg-background/35 p-3">
                      <StockAvatar avatarId={entry.avatar_id} size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-bold">{entry.username}</p>
                        <p className="text-[11px] font-hud uppercase tracking-[0.16em] text-muted-foreground">
                          {entry.tiktok_handle}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No linked TikTok profiles yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "notifications" && (
          <div className="panel text-sm text-muted-foreground">
            Inbox reset complete. No notifications exist yet because no live matches have been played.
          </div>
        )}
      </div>
    </div>
  );
}
