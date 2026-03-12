import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseBrowserKey =
  import.meta.env.VITE_SUPABASE_PUBLIC_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env["VITE-SUPABASE_PUBLIC_KEY"] ??
  "";

function decodeJwtPayload(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    return JSON.parse(window.atob(normalized)) as { role?: string } | null;
  } catch {
    return null;
  }
}

function isForbiddenBrowserKey(key: string) {
  if (!key) return false;
  if (key.startsWith("sb_secret_")) return true;

  const payload = decodeJwtPayload(key);
  if (!payload?.role) return false;
  return payload.role !== "anon";
}

export const hasForbiddenBrowserKey = isForbiddenBrowserKey(supabaseBrowserKey);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseBrowserKey && !hasForbiddenBrowserKey);

export const supabaseConfigErrorMessage = !supabaseUrl
  ? "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  : !supabaseBrowserKey
    ? "Supabase is not configured. Set VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY, or VITE_SUPABASE_PUBLIC_KEY in your .env file."
    : hasForbiddenBrowserKey
      ? "Supabase browser auth is misconfigured. Replace VITE_SUPABASE_ANON_KEY with the public anon/publishable key from Supabase Settings > API. Do not use a service_role or secret key in the browser."
      : "";

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseBrowserKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
