import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      throw new Error("Email is required.");
    }

    const admin = createAdminClient();
    const { data: userData, error: userError } = await admin.auth.admin.listUsers();
    if (userError) throw userError;

    const authUser = userData.users.find((entry) => entry.email?.toLowerCase() === email.trim().toLowerCase());
    if (!authUser) {
      throw new Error("No account with security questions was found for that email.");
    }

    const { data: questions, error: questionError } = await admin
      .from("user_security_questions")
      .select("question_one, question_two")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (questionError) throw questionError;
    if (!questions) {
      throw new Error("This account has not set security questions yet.");
    }

    return Response.json(
      {
        questionOne: questions.question_one,
        questionTwo: questions.question_two,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Could not load security questions." },
      { status: 400, headers: corsHeaders },
    );
  }
});
