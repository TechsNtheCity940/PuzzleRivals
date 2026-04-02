import { createAdminClient, createUserClient } from "./supabase.ts";

export async function requireUser(req: Request) {
  const supabase = createUserClient(req);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Unauthorized.");
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("is_blocked, blocked_reason")
    .eq("id", data.user.id)
    .maybeSingle<{ is_blocked: boolean; blocked_reason: string | null }>();

  if (profileError) {
    throw profileError;
  }

  if (profile?.is_blocked) {
    throw new Error(profile.blocked_reason ? `Account blocked: ${profile.blocked_reason}` : "Account blocked.");
  }

  return {
    supabase,
    user: data.user,
  };
}
