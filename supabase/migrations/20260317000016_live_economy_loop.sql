alter table public.round_results
  add column if not exists pass_xp_delta integer not null default 0,
  add column if not exists rank_points_delta integer not null default 0,
  add column if not exists shard_delta integer not null default 0;

alter table public.player_stats
  add column if not exists last_daily_win_on date,
  add column if not exists daily_win_streak integer not null default 0;

create table if not exists public.quest_definitions (
  id text primary key,
  track text not null check (track in ('daily', 'weekly', 'seasonal')),
  title text not null,
  description text not null,
  objective_key text not null,
  target_value integer not null default 1,
  reward_json jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.player_quest_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id text not null references public.quest_definitions(id) on delete cascade,
  period_key text not null,
  progress integer not null default 0,
  completed_at timestamptz,
  reward_claimed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, quest_id, period_key)
);

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'set_quest_definitions_updated_at'
      and tgrelid = 'public.quest_definitions'::regclass
  ) then
    execute 'drop trigger set_quest_definitions_updated_at on public.quest_definitions';
  end if;
end
$$;

create trigger set_quest_definitions_updated_at
before update on public.quest_definitions
for each row execute procedure public.handle_updated_at();

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'set_player_quest_progress_updated_at'
      and tgrelid = 'public.player_quest_progress'::regclass
  ) then
    execute 'drop trigger set_player_quest_progress_updated_at on public.player_quest_progress';
  end if;
end
$$;

create trigger set_player_quest_progress_updated_at
before update on public.player_quest_progress
for each row execute procedure public.handle_updated_at();

alter table public.quest_definitions enable row level security;
alter table public.player_quest_progress enable row level security;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'quest_definitions'
      and policyname = 'quest definitions are readable by authenticated'
  ) then
    execute 'drop policy "quest definitions are readable by authenticated" on public.quest_definitions';
  end if;
end
$$;

create policy "quest definitions are readable by authenticated"
on public.quest_definitions
for select
to authenticated
using (true);

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'player_quest_progress'
      and policyname = 'quest progress is readable by owner'
  ) then
    execute 'drop policy "quest progress is readable by owner" on public.player_quest_progress';
  end if;
end
$$;

create policy "quest progress is readable by owner"
on public.player_quest_progress
for select
to authenticated
using (auth.uid() = user_id);

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'player_quest_progress'
      and policyname = 'quest progress is writable by owner'
  ) then
    execute 'drop policy "quest progress is writable by owner" on public.player_quest_progress';
  end if;
end
$$;

create policy "quest progress is writable by owner"
on public.player_quest_progress
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.quest_definitions (id, track, title, description, objective_key, target_value, reward_json, metadata, active)
values
  (
    'dq_play_3',
    'daily',
    'Play 3 Matches',
    'Finish three multiplayer matches in any queue.',
    'matches_played',
    3,
    jsonb_build_object('coins', 160, 'passXp', 120),
    '{}'::jsonb,
    true
  ),
  (
    'dq_top2',
    'daily',
    'Top 2 Finish',
    'Place 1st or 2nd in a match once.',
    'top_2_finishes',
    1,
    jsonb_build_object('coins', 120, 'passXp', 100, 'shards', 10),
    '{}'::jsonb,
    true
  ),
  (
    'dq_perfect_solve',
    'daily',
    'Perfect Solve',
    'Finish a live round with a full solve.',
    'perfect_solves',
    1,
    jsonb_build_object('coins', 100, 'passXp', 90),
    '{}'::jsonb,
    true
  ),
  (
    'wq_finish_20',
    'weekly',
    'Finish 20 Matches',
    'Keep queueing until twenty matches are logged this week.',
    'matches_played',
    20,
    jsonb_build_object('coins', 900, 'gems', 20, 'passXp', 500),
    '{}'::jsonb,
    true
  ),
  (
    'wq_ranked_5',
    'weekly',
    'Ranked Grinder',
    'Win five ranked matches this week.',
    'ranked_wins',
    5,
    jsonb_build_object('coins', 700, 'shards', 50, 'passXp', 420),
    '{}'::jsonb,
    true
  ),
  (
    'sq_gold',
    'seasonal',
    'Reach Gold',
    'Climb to Gold this season for a prestige unlock.',
    'reach_rank_points',
    1400,
    jsonb_build_object('gems', 60, 'shards', 120, 'itemId', 's_18'),
    jsonb_build_object('seasonKey', 'season-11'),
    true
  ),
  (
    'sq_pass_xp',
    'seasonal',
    'Earn 5000 Pass XP',
    'Stack pass XP from matches and missions all season long.',
    'pass_xp_earned',
    5000,
    jsonb_build_object('gems', 80, 'itemId', 's_20'),
    jsonb_build_object('seasonKey', 'season-11'),
    true
  )
on conflict (id) do update set
  track = excluded.track,
  title = excluded.title,
  description = excluded.description,
  objective_key = excluded.objective_key,
  target_value = excluded.target_value,
  reward_json = excluded.reward_json,
  metadata = excluded.metadata,
  active = excluded.active;
