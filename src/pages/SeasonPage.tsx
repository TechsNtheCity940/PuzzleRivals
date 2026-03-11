import { motion } from "framer-motion";
import { CURRENT_SEASON } from "@/lib/seed-data";
import { Lock, Star, Gift, ChevronRight } from "lucide-react";

export default function SeasonPage() {
  const season = CURRENT_SEASON;
  const progressPct = Math.round((season.currentTier / season.maxTier) * 100);

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-3">
        <h1 className="font-display font-bold text-lg">Season {season.seasonNumber}</h1>
        <p className="text-xs text-muted-foreground">{season.name}</p>
      </div>

      {/* Progress overview */}
      <div className="mx-4 mb-4 surface rounded p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-body">Tier {season.currentTier}/{season.maxTier}</span>
          <span className="text-xs font-condensed font-bold text-ion">{progressPct}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-ion rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        {!season.isPremium && (
          <button className="mt-3 w-full h-10 bg-ion text-primary-foreground font-display font-bold text-xs uppercase tracking-wider rounded flex items-center justify-center gap-2">
            <Star size={14} />
            Unlock Premium Track — $9.99
          </button>
        )}
      </div>

      {/* Track */}
      <div className="px-4 space-y-1 pb-4">
        {season.tracks.map(track => (
          <div
            key={track.tier}
            className={`surface rounded p-3 flex items-center gap-3 ${
              track.isUnlocked ? "" : "opacity-50"
            }`}
          >
            <div className={`w-8 h-8 rounded flex items-center justify-center font-display font-bold text-sm ${
              track.isUnlocked ? "bg-ion text-primary-foreground" : "bg-secondary"
            }`}>
              {track.tier}
            </div>

            {/* Free reward */}
            <div className="flex-1 min-w-0">
              {track.freeReward ? (
                <div className="flex items-center gap-1.5">
                  <Gift size={12} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-[11px] font-body truncate">{track.freeReward.label}</span>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground">—</span>
              )}
            </div>

            {/* Premium reward */}
            <div className="flex items-center gap-1.5 min-w-0">
              {!season.isPremium && <Lock size={10} className="text-muted-foreground flex-shrink-0" />}
              <span className={`text-[11px] font-body truncate ${season.isPremium ? "text-ion" : "text-muted-foreground"}`}>
                {track.premiumReward?.label || "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
