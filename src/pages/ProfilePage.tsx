import { useState } from "react";
import { CURRENT_USER, PLAYERS, LEADERBOARD, CLANS, NOTIFICATIONS, getRankBand, getRankColor, PUZZLE_TYPES } from "@/lib/seed-data";
import { Settings, Users, Trophy, Shield, Bell, Link2, ChevronRight, Swords, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

type Tab = "stats" | "leaderboard" | "friends" | "clan" | "notifications";

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("stats");
  const user = CURRENT_USER;
  const rankBand = getRankBand(user.elo);
  const xpPct = Math.round((user.xp / user.xpToNext) * 100);

  const friends = PLAYERS.filter(p => user.friends.includes(p.id));
  const nemeses = PLAYERS.filter(p => user.nemeses.includes(p.id));

  const tabs: { id: Tab; label: string; icon: typeof Trophy }[] = [
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "leaderboard", label: "Ranks", icon: Trophy },
    { id: "friends", label: "Social", icon: Users },
    { id: "clan", label: "Clan", icon: Shield },
    { id: "notifications", label: "Inbox", icon: Bell },
  ];

  return (
    <div className="flex flex-col">
      {/* Profile Header */}
      <div className="px-4 pt-4 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded bg-secondary flex items-center justify-center font-display font-bold text-2xl">
            {user.username[0]}
          </div>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">{user.username}</h1>
            <p className={`text-xs font-condensed font-bold uppercase tracking-wider ${getRankColor(user.rank)}`}>
              {rankBand.label} · ELO {user.elo}
            </p>
            <div className="flex items-center gap-1 mt-1.5">
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-ion rounded-full" style={{ width: `${xpPct}%` }} />
              </div>
              <span className="text-[9px] font-condensed text-muted-foreground">Lv.{user.level}</span>
            </div>
          </div>
          <button className="p-2">
            <Settings size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {[
            { val: user.wins, label: "Wins" },
            { val: user.losses, label: "Losses" },
            { val: user.bestStreak, label: "Best Streak" },
            { val: `${Math.round((user.wins / user.matchesPlayed) * 100)}%`, label: "Win Rate" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display font-bold text-sm">{s.val}</p>
              <p className="text-[9px] font-condensed text-muted-foreground uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Social links */}
        <div className="flex gap-2 mt-3">
          <button className="h-7 px-3 bg-secondary rounded text-[10px] font-display font-semibold flex items-center gap-1.5">
            <Link2 size={10} />
            {user.socialLinks.facebook || "Link Facebook"}
          </button>
          <button className="h-7 px-3 bg-secondary rounded text-[10px] font-display font-semibold flex items-center gap-1.5">
            <Link2 size={10} />
            {user.socialLinks.tiktok || "Link TikTok"}
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-center text-[10px] font-condensed font-bold uppercase tracking-wider transition-colors relative ${
              tab === t.id ? "text-ion" : "text-muted-foreground"
            }`}
          >
            {t.label}
            {t.id === "notifications" && NOTIFICATIONS.filter(n => !n.isRead).length > 0 && (
              <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-ion" />
            )}
            {tab === t.id && (
              <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-ion" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {tab === "stats" && (
          <div className="space-y-4">
            <p className="font-display font-bold text-sm">Puzzle Skills</p>
            <div className="space-y-2">
              {PUZZLE_TYPES.map(p => {
                const skill = user.puzzleSkills[p.type];
                return (
                  <div key={p.type} className="flex items-center gap-3">
                    <span className="text-lg w-6">{p.icon}</span>
                    <span className="text-xs font-body w-20 truncate">{p.label}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-ion rounded-full" style={{ width: `${skill}%` }} />
                    </div>
                    <span className="text-[10px] font-condensed font-bold w-6 text-right">{skill}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="space-y-1">
            {LEADERBOARD.map(entry => (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-2.5 rounded ${
                  entry.userId === user.id ? "surface border-ion" : ""
                }`}
              >
                <span className="font-condensed font-bold text-sm w-6 text-center">
                  {entry.rank}
                </span>
                <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center font-display font-bold text-xs">
                  {entry.username[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-xs truncate">{entry.username}</p>
                  <p className={`text-[10px] font-condensed font-bold uppercase ${getRankColor(entry.rankTier)}`}>
                    {entry.rankTier}
                  </p>
                </div>
                <span className="font-condensed font-bold text-sm">{entry.elo}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "friends" && (
          <div className="space-y-4">
            {nemeses.length > 0 && (
              <>
                <p className="font-display font-bold text-sm flex items-center gap-2">
                  <Swords size={14} className="text-destructive" />
                  Nemeses
                </p>
                {nemeses.map(n => (
                  <div key={n.id} className="flex items-center gap-3 surface rounded p-3">
                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center font-display font-bold text-sm">
                      {n.username[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-display font-semibold text-xs">{n.username}</p>
                      <p className={`text-[10px] font-condensed font-bold uppercase ${getRankColor(n.rank)}`}>
                        ELO {n.elo}
                      </p>
                    </div>
                    <button className="h-7 px-3 bg-destructive text-destructive-foreground font-display font-bold text-[10px] uppercase rounded">
                      Revenge
                    </button>
                  </div>
                ))}
              </>
            )}

            <p className="font-display font-bold text-sm">Friends</p>
            {friends.map(f => (
              <div key={f.id} className="flex items-center gap-3 surface rounded p-3">
                <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center font-display font-bold text-sm">
                  {f.username[0]}
                </div>
                <div className="flex-1">
                  <p className="font-display font-semibold text-xs">{f.username}</p>
                  <p className={`text-[10px] font-condensed font-bold uppercase ${getRankColor(f.rank)}`}>
                    ELO {f.elo}
                  </p>
                </div>
                <button className="h-7 px-3 bg-secondary font-display font-bold text-[10px] uppercase rounded">
                  Challenge
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "clan" && (
          <div className="space-y-3">
            {CLANS.map(clan => (
              <div key={clan.id} className="surface rounded p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Shield size={24} className="text-ion" />
                  <div className="flex-1">
                    <p className="font-display font-bold text-sm">{clan.name} [{clan.tag}]</p>
                    <p className="text-[10px] text-muted-foreground">{clan.memberCount}/{clan.maxMembers} members · Rank #{clan.rank}</p>
                  </div>
                  <p className="font-display font-bold text-sm text-ion">🏆 {clan.trophies.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  {clan.members.slice(0, 3).map(m => (
                    <div key={m.userId} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground capitalize text-[10px] w-12">{m.role}</span>
                      <span className="font-display font-semibold">{m.username}</span>
                      <span className="text-muted-foreground ml-auto">+{m.trophiesContributed.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-3 w-full h-8 bg-secondary font-display font-bold text-[10px] uppercase tracking-wider rounded">
                  Request to Join
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-1">
            {NOTIFICATIONS.map(n => (
              <div
                key={n.id}
                className={`surface rounded p-3 flex items-center gap-3 ${!n.isRead ? "border-ion" : ""}`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!n.isRead ? "bg-ion" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-xs">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
