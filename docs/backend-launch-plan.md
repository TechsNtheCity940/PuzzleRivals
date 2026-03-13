# Backend Launch Plan

## Current state

This project now includes a local Fastify backend scaffold with:

- in-memory authoritative 4-player lobbies
- server-side puzzle type selection and distinct practice/live seeds
- WebSocket lobby subscriptions
- PayPal order creation and capture endpoints

It is still not production-ready because the current scaffold does not yet include:

- persistent player accounts and progression
- database-backed lobby/match storage
- anti-cheat solve validation
- deployment/runtime secrets management
- frontend integration against the real API
- scaled WebSocket fan-out across instances

## Cheapest practical stack

Recommended lowest-friction launch stack:

- Frontend hosting: Cloudflare Pages
- Backend runtime: Cloudflare Workers
- Realtime lobby state: Durable Objects
- Database: D1 to start, or Neon/Supabase Postgres if relational features grow
- Payments: PayPal Checkout JavaScript SDK + Orders API
- Mobile wrapper: Capacitor

Why this is the cheapest practical path:

- one vendor can cover static hosting, backend functions, realtime coordination, and custom domains
- Durable Objects are purpose-built for room/lobby style state and WebSocket fan-out
- D1 is good enough for early user/profile/match metadata
- the paid Workers plan starts at a low monthly floor compared with many always-on VM hosts

## Alternative cheap stack

If you want a more conventional Node backend:

- Frontend hosting: Cloudflare Pages or Netlify
- Backend host: Railway
- Backend framework: Fastify or NestJS + Socket.IO
- Database: Supabase Postgres or Neon Postgres
- Cache/pubsub later: Upstash Redis

This is usually easier if you want a traditional Express/Fastify app, background jobs, and Socket.IO without adapting to the Workers runtime.

## Public-launch checklist

### 1. Host backend

Pick one:

- Cloudflare Workers + Durable Objects if you want the cheapest globally distributed realtime path
- Railway if you want the simplest traditional Node deployment

### 2. Add PayPal API keys

You need:

- sandbox `client_id`
- sandbox `client_secret`
- live `client_id`
- live `client_secret`

Keep them in server-side secrets only.

### 3. Connect domain

Suggested flow:

- point DNS to Cloudflare
- connect the production domain to the frontend
- attach API subdomain such as `api.yourdomain.com`

### 4. Configure database

Minimum production tables:

- users
- player_profiles
- inventories
- seasons
- match_lobbies
- matches
- match_players
- puzzle_seeds
- purchases

### 5. Enable WebSocket scaling

For the first public version:

- if using Cloudflare, keep lobby state in Durable Objects
- if using Railway/Node, start with Socket.IO and add Redis adapter only when you need multi-instance fan-out

### 6. Build mobile wrapper

Optional:

- Capacitor for iOS/Android packaging
- keep the game web-first until retention justifies native polish

## Backend responsibilities

The backend should own:

- creating 4-player lobbies
- choosing the shared puzzle type
- generating separate practice/live seeds
- storing match results
- validating solves
- awarding XP, coins, and ELO
- handling payments and entitlements

## AI puzzle generation roadmap

The frontend now supports seeded procedural puzzle selection, but a real backend should expand this into a proper generation service:

- infinite Sudoku seeds
- infinite maze/path puzzles
- adaptive difficulty per lobby skill band
- logic-template trick puzzles
- anti-repeat history per player or per region
- daily featured puzzle batches

## Suggested next implementation step

Build a backend service with these first endpoints:

- `POST /matchmaking/join`
- `GET /matchmaking/lobby/:id`
- `POST /matchmaking/lobby/:id/ready`
- `POST /matches/:id/progress`
- `POST /matches/:id/solve`
- `POST /payments/paypal/order`
- `POST /payments/paypal/capture`
