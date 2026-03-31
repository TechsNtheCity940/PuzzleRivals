import { requireUser } from "./auth.ts";
import { createAdminClient } from "./supabase.ts";

export const OWNER_ACCOUNT_EMAIL = "judgemrogan@gmail.com";

export function normalizeAccountEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

export async function requireOwner(req: Request) {
  const { user } = await requireUser(req);
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, username, app_role, vip_access")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const isOwner = profile?.app_role === "owner" || normalizeAccountEmail(user.email) === OWNER_ACCOUNT_EMAIL;
  if (!isOwner) {
    throw new Error("Owner access required.");
  }

  return {
    admin,
    user,
    profile,
  };
}
