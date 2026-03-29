create table if not exists public.neon_rivals_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_seed bigint not null,
  mode text not null,
  status text not null check (status in ('complete', 'failed')),
  objective_key text not null,
  objective_title text not null,
  objective_label text not null,
  score integer not null default 0,
  combo integer not null default 0,
  max_combo integer not null default 0,
  matched_tiles integer not null default 0,
  moves_left integer not null default 0,
  target_score integer not null default 0,
  objective_value integer not null default 0,
  objective_target integer not null default 0,
  target_color text,
  target_color_label text,
  duration_ms integer not null default 0,
  reward_json jsonb not null default '{}'::jsonb,
  quest_reward_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, session_seed, mode)
);

create index if not exists neon_rivals_runs_user_created_at_idx
  on public.neon_rivals_runs (user_id, created_at desc);

alter table public.neon_rivals_runs enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'neon_rivals_runs'
      and policyname = 'neon rivals runs are readable by owner'
  ) then
    execute 'drop policy "neon rivals runs are readable by owner" on public.neon_rivals_runs';
  end if;
end
$$;

create policy "neon rivals runs are readable by owner"
on public.neon_rivals_runs
for select
using (auth.uid() = user_id);
