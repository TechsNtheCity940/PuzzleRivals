# Puzzle Rivals Arena

Competitive 4-player puzzle lobbies built with Vite, React, TypeScript, shadcn-ui, and Tailwind CSS.

## Current status

- The production-facing gameplay path is Supabase-first.
- The React client uses Supabase auth, Edge Functions, and Realtime for matchmaking and live lobby updates.
- Puzzle selection is lobby-driven instead of player-selected.
- Practice and live rounds use distinct generated versions of the same puzzle type.
- The active Supabase path now includes authoritative lobby state, deterministic puzzle seed selection, replay-prevention weighting, Realtime lobby snapshots, and PayPal order/capture functions.
- `server/` still exists as a legacy Fastify/SQLite scaffold for reference, isolated local testing, and tooling, but it is no longer the primary app backend.

## Local development

```sh
npm install
copy .env.example .env
```

Set the frontend Supabase env vars in `.env`:

```sh
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Important:
- `VITE_SUPABASE_ANON_KEY` must be the public anon/publishable browser key from Supabase Settings > API.
- Do not use `SUPABASE_SERVICE_ROLE_KEY` or any `sb_secret_...` key in browser env vars.
- `VITE_SUPABASE_PUBLISHABLE_KEY` is also supported as an alias.

Run the frontend:

```sh
npm run dev
```

If you need Vite to proxy legacy `/api` and `/ws` traffic to the Fastify scaffold while debugging that path, set `VITE_ENABLE_LEGACY_SERVER_PROXY=true` before starting the frontend.

If you are explicitly working on the legacy Fastify scaffold too:

```sh
copy server\.env.example server\.env
npm run dev:legacy-server
```

## Supabase local workflow

Apply the database schema, RLS, and migrations locally and serve Edge Functions with the Supabase CLI:

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

That applies:
- schema tables and triggers
- row-level security policies
- gameplay, economy, and auth-supporting schema changes from the repo migrations

Then deploy the Edge Functions you need:

```sh
supabase functions deploy join-lobby
supabase functions deploy ready-lobby
supabase functions deploy sync-lobby
supabase functions deploy submit-progress
supabase functions deploy submit-solve
supabase functions deploy vote-next-round
supabase functions deploy create-paypal-order
supabase functions deploy capture-paypal-order
supabase functions deploy purchase-store-item
supabase functions deploy equip-store-item
supabase functions deploy set-security-questions
supabase functions deploy get-security-questions
supabase functions deploy reset-password-with-security-questions
```

Required project settings:
- Enable `Anonymous` auth in Supabase Authentication providers.
- Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` with `supabase secrets set ...`.
- Set frontend env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Verification

Primary verification for the active app path:

```sh
npm run build
npm run test
```

Optional legacy verification if you changed `server/`:

```sh
npm run build:legacy-server
npm run test:legacy-server
```

Run both active and legacy checks together only when you intentionally need both paths:

```sh
npm run test:all
```

## Supabase Edge Functions

- `join-lobby`
- `ready-lobby`
- `sync-lobby`
- `submit-progress`
- `submit-solve`
- `vote-next-round`
- `create-paypal-order`
- `capture-paypal-order`
- `purchase-store-item`
- `equip-store-item`
- `set-security-questions`
- `get-security-questions`
- `reset-password-with-security-questions`

## Backend note

This repo still contains two backend implementations, but they are not equal in priority:

- `supabase/` is the active backend path for production-facing auth, database, RLS, Edge Functions, and Realtime.
- `server/` is the older Fastify/SQLite scaffold kept as a legacy reference and isolated local test surface.

See [docs/backend-launch-plan.md](./docs/backend-launch-plan.md) for the current backend architecture, deployment checklist, and verification guidance.



