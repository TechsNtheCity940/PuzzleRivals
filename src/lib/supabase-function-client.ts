import {
  isSupabaseSchemaSetupIssue,
  supabase,
  supabaseConfigErrorMessage,
  supabaseFunctionsUrl,
  toSupabaseSchemaSetupError,
} from "@/lib/supabase-client";

export type SupabaseFunctionErrorCandidate = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
  status?: number;
};

type InvokeSupabaseFunctionOptions = {
  requiresSessionMessage?: string;
  functionUnavailableMessage?: string;
  schemaResource?: string;
  isSchemaSetupIssue?: (error: SupabaseFunctionErrorCandidate) => boolean;
};

function readBrowserKey() {
  return (
    (import.meta.env.VITE_SUPABASE_PUBLIC_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    (import.meta.env["VITE-SUPABASE_PUBLIC_KEY"] as string | undefined) ??
    ""
  );
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function flattenDetails(details: unknown) {
  if (typeof details === "string" && details.trim().length > 0) {
    return details;
  }

  if (!details || typeof details !== "object") {
    return null;
  }

  const candidate = details as Record<string, unknown>;
  const parts = [
    readString(candidate.message),
    readString(candidate.details),
    readString(candidate.hint),
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" ") : null;
}

function toFunctionErrorCandidate(
  payload: unknown,
  status: number,
): SupabaseFunctionErrorCandidate {
  if (!payload || typeof payload !== "object") {
    return { status };
  }

  const candidate = payload as Record<string, unknown>;
  const nestedDetails =
    candidate.details && typeof candidate.details === "object"
      ? (candidate.details as Record<string, unknown>)
      : null;

  return {
    status,
    code:
      readString(candidate.code) ??
      readString(nestedDetails?.code) ??
      undefined,
    message:
      readString(candidate.message) ??
      readString(nestedDetails?.message) ??
      undefined,
    details:
      flattenDetails(candidate.details) ??
      flattenDetails(nestedDetails?.details) ??
      null,
    hint:
      readString(candidate.hint) ??
      readString(nestedDetails?.hint) ??
      null,
  };
}

function readFunctionErrorMessage(
  error: SupabaseFunctionErrorCandidate,
  fallback: string,
) {
  return error.message ?? error.details ?? error.hint ?? fallback;
}

function isFunctionUnavailable(
  functionName: string,
  error: SupabaseFunctionErrorCandidate,
) {
  if (error.status === 404) {
    return true;
  }

  const normalized = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
    .trim()
    .toLowerCase();

  return (
    normalized.includes(`function ${functionName} not found`) ||
    normalized.includes("edge function not found") ||
    normalized.includes("failed to send a request to the edge function") ||
    normalized.includes("no route matched")
  );
}

export async function invokeSupabaseFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  options: InvokeSupabaseFunctionOptions = {},
) {
  if (!supabase || !supabaseFunctionsUrl) {
    throw new Error(supabaseConfigErrorMessage);
  }

  const browserKey = readBrowserKey();
  if (!browserKey) {
    throw new Error(supabaseConfigErrorMessage);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error(
      options.requiresSessionMessage ??
        "You must be signed in before using this feature.",
    );
  }

  const response = await fetch(`${supabaseFunctionsUrl}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: browserKey,
      "x-supabase-auth": session.access_token,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | T
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    const error = toFunctionErrorCandidate(payload, response.status);

    if (
      options.functionUnavailableMessage &&
      isFunctionUnavailable(functionName, error)
    ) {
      throw new Error(options.functionUnavailableMessage);
    }

    if (
      isSupabaseSchemaSetupIssue(error) ||
      options.isSchemaSetupIssue?.(error)
    ) {
      throw toSupabaseSchemaSetupError(
        error,
        options.schemaResource ?? `Supabase function ${functionName}`,
      );
    }

    throw new Error(
      readFunctionErrorMessage(
        error,
        `Request failed with status ${response.status}`,
      ),
    );
  }

  return payload as T;
}
