# Puzzle Rivals Arena

Competitive 4-player puzzle lobbies built with Vite, React, TypeScript, shadcn-ui, and Tailwind CSS.

## Current status

- Frontend gameplay flow is implemented
- Supabase schema, RLS, and Edge Function scaffold now exists in `supabase/`
- Fastify backend scaffold still exists in `server/` as the older local backend path
- Puzzle selection is now lobby-driven instead of player-selected
- Practice and live rounds use different generated versions of the same puzzle type
- Authoritative lobby state, server-side puzzle seed selection, Realtime lobby snapshots, and PayPal order/capture endpoints are scaffolded in the Supabase path
- The React client now targets Supabase auth, Edge Functions, and Realtime instead of the local Fastify `/api` + `/ws` flow

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

Run the frontend:

```sh
npm run dev
```

If you are working on the legacy Fastify backend too:

```sh
copy server\\.env.example server\\.env
npm run dev:server
```

## Supabase local workflow

Apply the database schema, RLS, and RPC migrations locally and serve Edge Functions with the Supabase CLI:

```sh
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env.local
```

For a linked hosted project, the database setup is:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

That now applies:

- schema tables and triggers
- row-level security policies
- matchmaking RPC functions

Then deploy the Edge Functions:

```sh
supabase functions deploy join-lobby
supabase functions deploy ready-lobby
supabase functions deploy sync-lobby
supabase functions deploy submit-progress
supabase functions deploy submit-solve
supabase functions deploy vote-next-round
```

Required project settings:

- Enable `Anonymous` auth in Supabase Authentication providers
- Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` with `supabase secrets set ...`
- Set frontend env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Verification

```sh
npm run build
npm run build:server
npm run test
```

## Supabase Edge Functions

- `join-lobby`
- `ready-lobby`
- `sync-lobby`
- `submit-progress`
- `submit-solve`
- `vote-next-round`

## Backend note

This repo now includes two backend paths:

- `supabase/` is the active path for production-facing auth, database, RLS, Edge Functions, and Realtime.
- `server/` is the older Fastify/SQLite implementation kept for reference while the Supabase cutover finishes.

See [docs/backend-launch-plan.md](./docs/backend-launch-plan.md) for:

- cheapest public-launch stack options
- backend responsibilities
- PayPal/domain/database/WebSocket checklist
- suggested first API endpoints
