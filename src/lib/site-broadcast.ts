import { isSupabaseSchemaSetupIssue, supabase } from "@/lib/supabase-client";

export type SiteBroadcastSource = "supabase";
export type SiteBroadcastResolution = "live" | "empty" | "unavailable";

export interface SiteBroadcast {
  slot: "home_top";
  title: string;
  message: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface SiteBroadcastSnapshot {
  broadcast: SiteBroadcast | null;
  source: SiteBroadcastSource;
  resolution: SiteBroadcastResolution;
}

type SiteBroadcastRow = {
  slot: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_href: string | null;
  is_active: boolean;
  updated_at: string;
};

function mapSiteBroadcast(row: SiteBroadcastRow): SiteBroadcast {
  return {
    slot: "home_top",
    title: row.title,
    message: row.message,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

export async function loadHomeBroadcast(): Promise<SiteBroadcastSnapshot> {
  if (!supabase) {
    return {
      broadcast: null,
      source: "supabase",
      resolution: "unavailable",
    };
  }

  const { data, error } = await supabase
    .from("site_broadcasts")
    .select("slot, title, message, cta_label, cta_href, is_active, updated_at")
    .eq("slot", "home_top")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    if (isSupabaseSchemaSetupIssue(error)) {
      return {
        broadcast: null,
        source: "supabase",
        resolution: "unavailable",
      };
    }

    return {
      broadcast: null,
      source: "supabase",
      resolution: "unavailable",
    };
  }

  if (!data) {
    return {
      broadcast: null,
      source: "supabase",
      resolution: "empty",
    };
  }

  return {
    broadcast: mapSiteBroadcast(data as SiteBroadcastRow),
    source: "supabase",
    resolution: "live",
  };
}
