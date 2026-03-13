import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { answersMatch } from "../_shared/security.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, answerOne, answerTwo, newPassword } = await req.json();

    if (!email || !answerOne || !answerTwo || !newPassword) {
      throw new Error("Email, answers, and a new password are required.");
    }

    if (String(newPassword).length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }

    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin.auth.admin.listUsers();
    if (userError) throw userError;

    const authUser = userData.users.find((entry) => entry.email?.toLowerCase() === String(email).trim().toLowerCase());
    if (!authUser) {
      throw new Error("Could not verify that account.");
    }

    const { data: securityRow, error: securityError } = await admin
      .from("user_security_questions")
      .select("answer_one_hash, answer_two_hash")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (securityError) throw securityError;
    if (!securityRow) {
      throw new Error("This account has not set security questions yet.");
    }

    const [firstMatches, secondMatches] = await Promise.all([
      answersMatch(String(answerOne), securityRow.answer_one_hash),
      answersMatch(String(answerTwo), securityRow.answer_two_hash),
    ]);

    if (!firstMatches || !secondMatches) {
      throw new Error("Security question answers did not match.");
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(authUser.id, {
      password: String(newPassword),
    });

    if (updateError) throw updateError;

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Could not reset password." },
      { status: 400, headers: corsHeaders },
    );
  }
});
