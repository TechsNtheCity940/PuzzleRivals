import { corsHeaders } from "../_shared/cors.ts";

const PRODUCTION_CANONICAL_ORIGIN = "https://www.puzzlerivals.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const paypalMode = (Deno.env.get("PAYPAL_ENV") ?? "live") === "live"
    ? "live"
    : "sandbox";
  const commerceReady = Boolean(
    Deno.env.get("PAYPAL_CLIENT_ID") && Deno.env.get("PAYPAL_CLIENT_SECRET"),
  );

  return Response.json(
    {
      source: "supabase",
      resolution: "live",
      commerceReady,
      paypalMode,
      canonicalOrigin: PRODUCTION_CANONICAL_ORIGIN,
    },
    { headers: corsHeaders },
  );
});
