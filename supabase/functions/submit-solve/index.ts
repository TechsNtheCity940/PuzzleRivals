import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { createAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user } = await requireUser(req);
    const { roundId, solvedAtMs, submissionHash } = await req.json();
    const admin = createAdminClient();

    const { error } = await admin
      .from("round_results")
      .upsert({
        round_id: roundId,
        user_id: user.id,
        live_progress: 100,
        solved_at_ms: solvedAtMs,
        submission_hash: submissionHash,
      });

    if (error) throw error;

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Failed to submit solve." }, {
      status: 400,
      headers: corsHeaders,
    });
  }
});
