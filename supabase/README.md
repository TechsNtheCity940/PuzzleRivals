# Supabase Scaffold

This folder is the starting point for moving production state from the local `server/` Fastify backend to Supabase.

Current contents:

- `migrations/20260311_000001_initial_schema.sql`
  - base schema for auth-backed profiles, lobbies, rounds, results, and purchases
- `rls/20260311_000002_policies.sql`
  - first RLS pass for player-safe reads and owner-scoped access
- `functions/join-lobby`
- `functions/ready-lobby`
- `functions/submit-progress`
- `functions/submit-solve`
- `functions/vote-next-round`

Important:

- these Edge Functions are the first migration slice, not the final authoritative implementation
- puzzle seed generation, realtime broadcasts, timer advancement, and PayPal functions still need to be ported into Supabase-specific logic
- once the schema is applied, the next step is to add SQL helpers / RPCs for atomic lobby transitions
