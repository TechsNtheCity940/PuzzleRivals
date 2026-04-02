alter table public.profiles
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text,
  add column if not exists blocked_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_profiles_is_blocked
  on public.profiles(is_blocked)
  where is_blocked = true;
