# Supabase Backend

This folder is the active production-facing backend path for Puzzle Rivals.

It holds the Supabase database schema, row-level security, shared Edge Function logic, and deployed function entry points that back the React client's auth, matchmaking, progression, economy, and recovery flows.

## Current contents

- `migrations/`
  - database schema, gameplay, economy, loadout, and auth-supporting changes
- `rls/`
  - row-level security policies for player-safe reads and owner-scoped access
- `functions/_shared/`
  - authoritative matchmaking, puzzle selection, replay-prevention, realtime, economy, and utility logic shared across functions
- `functions/join-lobby`
- `functions/ready-lobby`
- `functions/sync-lobby`
- `functions/submit-progress`
- `functions/submit-solve`
- `functions/vote-next-round`
- `functions/create-paypal-order`
- `functions/capture-paypal-order`
- `functions/purchase-store-item`
- `functions/equip-store-item`
- `functions/set-security-questions`
- `functions/get-security-questions`
- `functions/reset-password-with-security-questions`

## What is active today

The Supabase path is the app's primary backend for:
- auth-backed profiles and account flows
- lobby creation, readiness, synchronization, and round advancement
- authoritative puzzle seed selection and variation control
- Realtime lobby snapshots
- solve submission and progression updates
- storefront purchase/equip flows
- PayPal order creation and capture
- account recovery security-question flows

## Working assumptions

- The React client should be treated as Supabase-first unless a task explicitly targets `server/`.
- New gameplay and progression work should land here rather than in the legacy Fastify scaffold.
- Legacy `server/` code remains useful for reference and isolated local tests, but it is not the primary app runtime.

## Local workflow

```sh
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env.local
```

For a linked hosted project:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Then deploy the needed functions with `supabase functions deploy ...`.

## Important operational notes

- Keep hosted schema and local repo migrations in sync.
- Redeploy affected Edge Functions after changing shared logic under `functions/_shared/`.
- Keep browser code on the anon/publishable key only.
- Treat replay-prevention, validation, and deterministic puzzle selection as authoritative backend concerns here.
