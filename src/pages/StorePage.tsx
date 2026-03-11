import { useState } from "react";
import { STORE_ITEMS, VIP_MEMBERSHIP, romanNumeral } from "@/lib/seed-data";
import { ShoppingBag, Crown, Check, ExternalLink } from "lucide-react";
import type { ItemCategory } from "@/lib/types";

type Tab = "all" | ItemCategory;

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "theme", label: "Themes" },
  { id: "frame", label: "Frames" },
  { id: "avatar", label: "Avatars" },
  { id: "bundle", label: "Bundles" },
  { id: "hint_pack", label: "Hints" },
];

export default function StorePage() {
  const [tab, setTab] = useState<Tab>("all");
  const items = tab === "all" ? STORE_ITEMS : STORE_ITEMS.filter(i => i.category === tab);
  const vip = VIP_MEMBERSHIP;

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-3">
        <h1 className="font-display font-bold text-lg">Store</h1>
      </div>

      {/* VIP Banner */}
      <div className="mx-4 mb-4 surface rounded p-4 border-ion">
        <div className="flex items-center gap-3 mb-3">
          <Crown size={24} className="text-ion" />
          <div className="flex-1">
            <p className="font-display font-bold text-sm">VIP Membership</p>
            <p className="text-[11px] text-muted-foreground">${vip.priceUsd}/month</p>
          </div>
          <button className="h-8 px-4 bg-ion text-primary-foreground font-display font-bold text-xs uppercase tracking-wider rounded">
            Subscribe
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {vip.perks.slice(0, 4).map(perk => (
            <div key={perk} className="flex items-center gap-1.5">
              <Check size={10} className="text-ion flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground">{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex px-4 gap-1 mb-4 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-shrink-0 h-8 px-3 rounded text-[10px] font-display font-bold uppercase tracking-wider transition-colors ${
              tab === t.id ? "bg-ion text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="px-4 grid grid-cols-2 gap-2 pb-4">
        {items.map(item => (
          <div key={item.id} className={`surface rounded overflow-hidden ${item.isFeatured ? "border-ion" : ""}`}>
            {/* Item visual */}
            <div className="h-28 bg-secondary flex items-center justify-center relative">
              <ShoppingBag size={32} className="text-muted-foreground/30" />
              {item.isFeatured && (
                <span className="absolute top-2 left-2 text-[8px] font-condensed font-bold uppercase tracking-widest bg-ion text-primary-foreground px-1.5 py-0.5 rounded">
                  Featured
                </span>
              )}
              <span className="absolute top-2 right-2 text-[9px] font-condensed font-bold text-muted-foreground">
                {romanNumeral(item.rarity)}
              </span>
              {item.isOwned && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Check size={24} className="text-ion" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="font-display font-bold text-xs truncate">{item.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
              <div className="mt-2">
                {item.isOwned ? (
                  <span className="text-[10px] font-condensed font-bold text-ion uppercase">Owned</span>
                ) : item.priceUsd ? (
                  <button className="h-7 w-full bg-ion text-primary-foreground font-display font-bold text-[10px] uppercase tracking-wider rounded flex items-center justify-center gap-1">
                    <ExternalLink size={10} />
                    ${item.priceUsd}
                  </button>
                ) : item.priceGems ? (
                  <button className="h-7 w-full bg-secondary font-display font-bold text-[10px] uppercase tracking-wider rounded">
                    💎 {item.priceGems}
                  </button>
                ) : (
                  <button className="h-7 w-full bg-secondary font-display font-bold text-[10px] uppercase tracking-wider rounded">
                    🪙 {item.priceCoins?.toLocaleString()}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
