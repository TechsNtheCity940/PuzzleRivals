create table if not exists public.bot_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  difficulty text not null default 'easy',
  pace_factor numeric(4,2) not null default 0.92,
  practice_peak_progress integer not null default 72,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_bot_profiles_difficulty
  on public.bot_profiles(difficulty);

drop trigger if exists set_bot_profiles_updated_at on public.bot_profiles;
create trigger set_bot_profiles_updated_at
before update on public.bot_profiles
for each row execute procedure public.handle_updated_at();
