import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import {
  PLAYERS,
  LEADERBOARD,
  CLANS,
  NOTIFICATIONS,
  getRankBand,
  getRankColor,
  PUZZLE_TYPES,
} from "@/lib/seed-data";
import { Settings, Users, Trophy, Shield, Bell, Link2, ChevronRight, Swords, BarChart3 } from "lucide-react";

type Tab = "stats" | "leaderboard" | "friends" | "clan" | "notifications";

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("stats");
  const { user } = useAuth();
  const rankBand = getRankBand(user?.elo ?? 0);
  const xpPct = user ? Math.round((user.xp / Math.max(user.xpToNext, 1)) * 100) : 0;

  const friends = PLAYERS.filter((player) => user?.friends.includes(player.id));
  const nemeses = PLAYERS.filter((player) => user?.nemeses.includes(player.id));

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "leaderboard", label: "Ranks", icon: Trophy },
    { id: "friends", label: "Social", icon: Users },
    { id: "clan", label: "Clan", icon: Shield },
    { id: "notifications", label: "Inbox", icon: Bell },
  ];

  const winRate = user && user.matchesPlayed > 0 ? Math.round((user.wins / user.matchesPlayed) * 100) : 0;

  return (
    <div className="space-y-4 px-4 pb-4 pt-6">
      <section className="panel">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-prestige text-3xl font-black text-white">
            {user?.username?.[0] ?? "?"}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="hud-label">Player Card</p>
                <h1 className="mt-1 text-2xl font-black">{user?.username ?? "Fresh Account"}</h1>
                <p className={`mt-1 text-[11px] font-hud font-semibold uppercase tracking-[0.18em] ${getRankColor(user?.rank ?? "bronze")}`}>
                  {rankBand.label} | ELO {user?.elo ?? 0}
                </p>
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background/35">
                <Settings size={18} className="text-muted-foreground" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-play" style={{ width: `${xpPct}%` }} />
              </div>
              <span className="font-hud text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Lv {user?.level ?? 1}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
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

        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-2xl bg-background/35 px-3 py-2 text-[11px] font-hud font-semibold uppercase tracking-[0.14em]">
            <Link2 size={12} className="mr-1 inline" />
            {user?.socialLinks.facebook || "Link Facebook"}
          </button>
          <button className="flex-1 rounded-2xl bg-background/35 px-3 py-2 text-[11px] font-hud font-semibold uppercase tracking-[0.14em]">
            <Link2 size={12} className="mr-1 inline" />
            {user?.socialLinks.tiktok || "Link TikTok"}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-5 gap-2 rounded-[28px] border border-border bg-card/80 p-2 backdrop-blur-xl">
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
            {item.id === "notifications" && NOTIFICATIONS.filter((notification) => !notification.isRead).length > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            )}
            {tab === item.id && (
              <motion.div layoutId="profile-tab" className="absolute inset-0 -z-10 rounded-[20px] border border-primary/20 bg-primary/5" />
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {tab === "stats" && (
          <div className="panel">
            <p className="hud-label">Puzzle Skill Breakdown</p>
            <div className="mt-4 space-y-3">
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
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="space-y-2">
            {LEADERBOARD.map((entry) => (
              <div
                key={entry.userId}
                className={`surface flex items-center gap-3 p-3 ${entry.userId === user?.id ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <span className="w-6 text-center font-hud text-sm font-semibold">{entry.rank}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/35 text-sm font-black">
                  {entry.username[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{entry.username}</p>
                  <p className={`text-[11px] font-hud font-semibold uppercase tracking-[0.16em] ${getRankColor(entry.rankTier)}`}>
                    {entry.rankTier}
                  </p>
                </div>
                <span className="text-sm font-black text-primary">{entry.elo}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "friends" && (
          <div className="space-y-4">
            {nemeses.length > 0 && (
              <div className="panel">
                <p className="mb-3 flex items-center gap-2 text-sm font-black">
                  <Swords size={14} className="text-destructive" />
                  Nemeses
                </p>
                <div className="space-y-2">
                  {nemeses.map((nemesis) => (
                    <div key={nemesis.id} className="flex items-center gap-3 rounded-2xl bg-background/35 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card text-sm font-black">
                        {nemesis.username[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{nemesis.username}</p>
                        <p className={`text-[11px] font-hud font-semibold uppercase tracking-[0.16em] ${getRankColor(nemesis.rank)}`}>
                          ELO {nemesis.elo}
                        </p>
                      </div>
                      <button className="rounded-2xl bg-destructive px-3 py-2 font-hud text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                        Revenge
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="panel">
              <p className="mb-3 text-sm font-black">Friends</p>
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3 rounded-2xl bg-background/35 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card text-sm font-black">
                      {friend.username[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{friend.username}</p>
                      <p className={`text-[11px] font-hud font-semibold uppercase tracking-[0.16em] ${getRankColor(friend.rank)}`}>
                        ELO {friend.elo}
                      </p>
                    </div>
                    <button className="rounded-2xl bg-card px-3 py-2 font-hud text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Challenge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "clan" && (
          <div className="space-y-3">
            {CLANS.map((clan) => (
              <div key={clan.id} className="panel">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12">
                    <Shield size={22} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black">{clan.name} [{clan.tag}]</p>
                    <p className="mt-1 text-[11px] font-hud text-muted-foreground">{clan.memberCount}/{clan.maxMembers} members | Rank #{clan.rank}</p>
                  </div>
                  <p className="text-sm font-black text-primary">Trophies {clan.trophies.toLocaleString()}</p>
                </div>
                <div className="mt-4 space-y-2">
                  {clan.members.slice(0, 3).map((member) => (
                    <div key={member.userId} className="flex items-center gap-2 rounded-2xl bg-background/35 px-3 py-2 text-sm">
                      <span className="w-12 font-hud text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{member.role}</span>
                      <span className="font-bold">{member.username}</span>
                      <span className="ml-auto text-muted-foreground">+{member.trophiesContributed.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-4 h-10 w-full rounded-2xl bg-card font-hud text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Request to Join
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-2">
            {NOTIFICATIONS.map((notification) => (
              <div key={notification.id} className={`surface flex items-center gap-3 p-3 ${!notification.isRead ? "border-primary/30" : ""}`}>
                <div className={`h-2 w-2 rounded-full ${!notification.isRead ? "bg-primary" : "bg-transparent"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{notification.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{notification.message}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
