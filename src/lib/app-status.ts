import { supabaseFunctionsUrl } from "@/lib/supabase-client";

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
  if (!supabaseFunctionsUrl) {
    return FALLBACK_APP_RUNTIME_STATUS;
  }

  try {
    const response = await fetch(`${supabaseFunctionsUrl}/app-runtime-status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return FALLBACK_APP_RUNTIME_STATUS;
    }

    const data = (await response.json()) as Partial<AppRuntimeStatus>;
    return {
      ...FALLBACK_APP_RUNTIME_STATUS,
      ...data,
      source: "supabase",
    };
  } catch {
    return FALLBACK_APP_RUNTIME_STATUS;
  }
}
