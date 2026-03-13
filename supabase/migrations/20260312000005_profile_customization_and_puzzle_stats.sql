alter table public.profiles
  add column if not exists avatar_id text not null default 'blue-spinner',
  add column if not exists facebook_handle text,
  add column if not exists tiktok_handle text;

create table if not exists public.player_puzzle_stats (
  user_id uuid not null references public.profiles(id) on delete cascade,
  puzzle_type text not null,
  matches_played integer not null default 0,
  wins integer not null default 0,
  total_progress integer not null default 0,
  total_solve_ms bigint not null default 0,
  best_solve_ms integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, puzzle_type)
);

create trigger set_player_puzzle_stats_updated_at
before update on public.player_puzzle_stats
for each row execute procedure public.handle_updated_at();

alter table public.player_puzzle_stats enable row level security;

create policy "player puzzle stats are readable by owner"
on public.player_puzzle_stats
for select
to authenticated
using (auth.uid() = user_id);
