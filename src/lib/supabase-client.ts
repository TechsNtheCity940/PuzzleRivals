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
export const supabaseProjectRef = (() => {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split(".")[0] || null;
  } catch {
    return null;
  }
})();

export const supabaseConfigErrorMessage = !supabaseUrl
  ? "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  : !supabaseBrowserKey
    ? "Supabase is not configured. Set VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY, or VITE_SUPABASE_PUBLIC_KEY in your .env file."
    : hasForbiddenBrowserKey
      ? "Supabase browser auth is misconfigured. Replace VITE_SUPABASE_ANON_KEY with the public anon/publishable key from Supabase Settings > API. Do not use a service_role or secret key in the browser."
      : "";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export class SupabaseSchemaSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseSchemaSetupError";
  }
}

function readErrorMessage(error: SupabaseErrorLike) {
  return `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.trim().toLowerCase();
}

export function isSupabaseSchemaSetupIssue(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as SupabaseErrorLike;
  const code = candidate.code ?? "";
  const message = readErrorMessage(candidate);

  return (
    code === "PGRST205" ||
    code === "42P01" ||
    code === "42703" ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

export function buildSupabaseSchemaSetupMessage(resource?: string) {
  const resourceLabel = resource ? ` for ${resource}` : "";
  const projectLabel = supabaseProjectRef ? ` on project ${supabaseProjectRef}` : "";
  return `Supabase auth succeeded, but the app database schema is missing or out of date${resourceLabel}${projectLabel}. Push the repo migrations to the hosted Supabase project, then try again.`;
}

export function toSupabaseSchemaSetupError(error: unknown, resource?: string) {
  if (error instanceof SupabaseSchemaSetupError) {
    return error;
  }

  const detail =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? ` Backend reported: ${error.message}`
      : "";

  return new SupabaseSchemaSetupError(`${buildSupabaseSchemaSetupMessage(resource)}${detail}`);
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseBrowserKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
