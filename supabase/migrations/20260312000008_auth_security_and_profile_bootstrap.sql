drop trigger if exists set_user_security_questions_updated_at on public.user_security_questions;

create table if not exists public.user_security_questions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  question_one text not null,
  answer_one_hash text not null,
  question_two text not null,
  answer_two_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_user_security_questions_updated_at
before update on public.user_security_questions
for each row execute procedure public.handle_updated_at();

alter table public.user_security_questions enable row level security;

drop policy if exists "profiles are insertable by owner" on public.profiles;
create policy "profiles are insertable by owner"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "player stats are insertable by owner" on public.player_stats;
create policy "player stats are insertable by owner"
on public.player_stats
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "security questions are readable by owner" on public.user_security_questions;
create policy "security questions are readable by owner"
on public.user_security_questions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "security questions are writable by owner" on public.user_security_questions;
create policy "security questions are writable by owner"
on public.user_security_questions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
