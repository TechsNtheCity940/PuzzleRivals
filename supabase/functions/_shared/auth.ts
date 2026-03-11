import { createUserClient } from "./supabase.ts";

export async function requireUser(req: Request) {
  const supabase = createUserClient(req);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Unauthorized.");
  }

  return {
    supabase,
    user: data.user,
  };
}
