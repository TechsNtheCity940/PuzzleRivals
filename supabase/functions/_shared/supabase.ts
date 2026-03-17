import { createClient } from "jsr:@supabase/supabase-js@2";

export function createUserClient(req: Request) {
  const forwardedAuth =
    req.headers.get("x-supabase-auth") ??
    req.headers.get("authorization") ??
    "";
  const authorization = forwardedAuth.startsWith("Bearer ")
    ? forwardedAuth
    : forwardedAuth
      ? `Bearer ${forwardedAuth}`
      : "";

  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    },
  );
}

export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}
