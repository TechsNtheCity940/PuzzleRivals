create extension if not exists pgcrypto;

create type public.match_mode as enum ('ranked', 'casual', 'royale', 'challenge', 'daily');
create type public.lobby_status as enum ('filling', 'ready', 'practice', 'live', 'intermission', 'complete');
create type public.round_status as enum ('ready', 'practice', 'live', 'intermission', 'complete');
create type public.next_round_vote as enum ('continue', 'exit');
create type public.queue_status as enum ('searching', 'matched', 'cancelled');
create type public.purchase_status as enum ('created', 'approved', 'captured', 'failed', 'refunded');

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  rank text not null default 'gold',
  elo integer not null default 1650,
  level integer not null default 1,
  xp integer not null default 0,
  xp_to_next integer not null default 5000,
  coins integer not null default 0,
  gems integer not null default 0,
  is_vip boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.player_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  wins integer not null default 0,
  losses integer not null default 0,
  matches_played integer not null default 0,
  win_streak integer not null default 0,
  best_streak integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode public.match_mode not null,
  region text not null default 'global',
  status public.queue_status not null default 'searching',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, mode, status)
);

create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  mode public.match_mode not null,
  region text not null default 'global',
  status public.lobby_status not null default 'filling',
  max_players integer not null default 4,
  current_round integer not null default 0,
  selected_puzzle_type text,
  selected_difficulty integer,
  practice_ends_at timestamptz,
  live_ends_at timestamptz,
  intermission_ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lobby_players (
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  seat_no integer not null,
  is_ready boolean not null default false,
  next_round_vote public.next_round_vote,
  joined_at timestamptz not null default timezone('utc', now()),
  left_at timestamptz,
  primary key (lobby_id, user_id),
  unique (lobby_id, seat_no)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  round_no integer not null,
  puzzle_type text not null,
  difficulty integer not null,
  practice_seed bigint not null,
  live_seed bigint not null,
  status public.round_status not null default 'ready',
  practice_started_at timestamptz,
  live_started_at timestamptz,
  intermission_ends_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (lobby_id, round_no)
);

create table if not exists public.round_results (
  round_id uuid not null references public.rounds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  practice_progress integer not null default 0,
  live_progress integer not null default 0,
  solved_at_ms integer,
  placement integer,
  xp_delta integer not null default 0,
  coin_delta integer not null default 0,
  elo_delta integer not null default 0,
  submission_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (round_id, user_id)
);

create table if not exists public.products (
  id text primary key,
  kind text not null,
  price_usd numeric(10, 2),
  price_coins integer,
  price_gems integer,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  paypal_order_id text unique,
  status public.purchase_status not null default 'created',
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  captured_at timestamptz
);

create table if not exists public.purchase_items (
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id text not null references public.products(id),
  quantity integer not null default 1,
  unit_amount numeric(10, 2) not null,
  primary key (purchase_id, product_id)
);

create table if not exists public.paypal_webhook_events (
  id uuid primary key default gen_random_uuid(),
  paypal_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create index if not exists idx_queue_entries_mode_status_created_at
  on public.queue_entries(mode, status, created_at);

create index if not exists idx_lobbies_mode_status_created_at
  on public.lobbies(mode, status, created_at);

create index if not exists idx_lobby_players_user_id
  on public.lobby_players(user_id);

create index if not exists idx_rounds_lobby_id_round_no
  on public.rounds(lobby_id, round_no desc);

create index if not exists idx_round_results_user_id
  on public.round_results(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', 'Player-' || left(new.id::text, 8))
  )
  on conflict (id) do nothing;

  insert into public.player_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

create trigger set_player_stats_updated_at
before update on public.player_stats
for each row execute procedure public.handle_updated_at();

create trigger set_queue_entries_updated_at
before update on public.queue_entries
for each row execute procedure public.handle_updated_at();

create trigger set_lobbies_updated_at
before update on public.lobbies
for each row execute procedure public.handle_updated_at();

create trigger set_rounds_updated_at
before update on public.rounds
for each row execute procedure public.handle_updated_at();

create trigger set_round_results_updated_at
before update on public.round_results
for each row execute procedure public.handle_updated_at();

create trigger set_products_updated_at
before update on public.products
for each row execute procedure public.handle_updated_at();

create trigger set_purchases_updated_at
before update on public.purchases
for each row execute procedure public.handle_updated_at();
