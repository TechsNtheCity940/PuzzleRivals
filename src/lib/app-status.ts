import { supabase } from "@/lib/supabase-client";

export type AppRuntimeStatusResolution = "live" | "unavailable";

export interface AppRuntimeStatus {
  source: "supabase";
  resolution: AppRuntimeStatusResolution;
  commerceReady: boolean;
  paypalMode: "live" | "sandbox";
  canonicalOrigin: string;
}

export const FALLBACK_APP_RUNTIME_STATUS: AppRuntimeStatus = {
  source: "supabase",
  resolution: "unavailable",
  commerceReady: false,
  paypalMode: "live",
  canonicalOrigin: "https://www.puzzlerivals.com",
};

export async function loadAppRuntimeStatus(): Promise<AppRuntimeStatus> {
  if (!supabase) {
    return FALLBACK_APP_RUNTIME_STATUS;
  }

  const { data, error } = await supabase.functions.invoke("app-runtime-status");
  if (error) {
    return FALLBACK_APP_RUNTIME_STATUS;
  }

  return {
    ...FALLBACK_APP_RUNTIME_STATUS,
    ...(data as Partial<AppRuntimeStatus>),
    source: "supabase",
  };
}
