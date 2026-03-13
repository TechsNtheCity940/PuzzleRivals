import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { hashSecurityAnswer } from "../_shared/security.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { questionOne, answerOne, questionTwo, answerTwo } = await req.json();

    if (!questionOne || !questionTwo || !answerOne || !answerTwo) {
      throw new Error("Two security questions and answers are required.");
    }

    if (questionOne === questionTwo) {
      throw new Error("Choose two different security questions.");
    }

    const admin = createAdminClient();
    const { error } = await admin.from("user_security_questions").upsert({
      user_id: user.id,
      question_one: String(questionOne).trim(),
      answer_one_hash: await hashSecurityAnswer(String(answerOne)),
      question_two: String(questionTwo).trim(),
      answer_two_hash: await hashSecurityAnswer(String(answerTwo)),
    });

    if (error) throw error;

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Could not save security questions." },
      { status: 400, headers: corsHeaders },
    );
  }
});
