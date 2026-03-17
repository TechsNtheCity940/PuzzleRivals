alter table public.profiles
  add column if not exists app_role text not null default 'player';

update public.profiles
set app_role = 'player'
where app_role is null
   or app_role = '';

alter table public.profiles
  drop constraint if exists profiles_app_role_check;

alter table public.profiles
  add constraint profiles_app_role_check
  check (app_role in ('player', 'admin', 'owner'));

create index if not exists idx_profiles_app_role
  on public.profiles(app_role);
