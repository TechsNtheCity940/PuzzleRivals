# Backend Architecture And Launch Notes

## Current backend architecture

Puzzle Rivals now runs on a Supabase-first backend architecture.

The active production-facing path is:
- Supabase Auth for guest and account-backed sessions
- Supabase Postgres for profiles, lobbies, rounds, results, economy, and progression data
- Supabase Edge Functions for matchmaking, round progression, solve submission, payments, store actions, and account recovery flows
- Supabase Realtime for lobby snapshot broadcasts

The React client is already wired to this path through:
- `src/lib/supabase-client.ts`
- `src/lib/api-client.ts`
- `src/pages/MatchPage.tsx`
- the shared content/service layer used by the main product surfaces

## Legacy backend note

`server/` still exists, but it should be treated as a legacy Fastify/SQLite scaffold.

It remains useful for:
- isolated local scaffold tests
- automation-agent routes
- reference implementations during migration comparisons

It should not be treated as the primary gameplay backend when planning new product work.

## Active Supabase function surface

Gameplay and progression:
- `join-lobby`
- `ready-lobby`
- `sync-lobby`
- `submit-progress`
- `submit-solve`
- `vote-next-round`

Commerce and identity:
- `create-paypal-order`
- `capture-paypal-order`
- `purchase-store-item`
- `equip-store-item`
- `set-security-questions`
- `get-security-questions`
- `reset-password-with-security-questions`

## What matters most before launch

1. Keep the hosted Supabase schema up to date with repo migrations.
2. Redeploy changed Edge Functions after shared backend logic updates.
3. Maintain deterministic puzzle selection, replay prevention, and solve validation on the authoritative backend path.
4. Keep the main product surfaces wired to real backend-backed content instead of static-only placeholders.
5. Verify both mobile and desktop flows against the live Supabase-backed app.

## Deployment checklist

### 1. Configure the frontend

Set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use only the anon or publishable browser key in client env vars.

### 2. Configure Supabase project settings

Enable:
- Anonymous auth

Set secrets as needed:
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`

### 3. Push database changes

```sh
supabase db push
```

### 4. Deploy Edge Functions

Deploy whichever functions changed, especially any that depend on `functions/_shared/`.

### 5. Run verification

Primary verification for the active app path:

```sh
npm run build
npm run test
```

Optional legacy verification when touching `server/`:

```sh
npm run build:legacy-server
```

### 6. Perform live smoke checks

Confirm these work end to end on the hosted Supabase project:
- sign-in or guest auth
- join lobby
- practice round
- live round
- result settlement
- store or payment flow if touched
- profile/progression reads if touched

## Current documentation stance

When docs or tests disagree, treat the Supabase path as the source of truth for the shipped gameplay architecture.
Fastify references should be labeled as legacy or reference-only unless a task explicitly targets them.

