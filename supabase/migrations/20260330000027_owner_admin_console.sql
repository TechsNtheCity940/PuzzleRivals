alter table public.profiles
  add column if not exists vip_access boolean not null default false;

create or replace function public.apply_owner_account_profile_perks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select lower(email)
    into v_email
  from auth.users
  where id = new.id;

  if v_email = 'judgemrogan@gmail.com' then
    new.app_role := 'owner';
    new.vip_access := true;
    new.has_season_pass := true;
    new.is_vip := true;
    new.vip_expires_at := greatest(coalesce(new.vip_expires_at, timezone('utc', now())), '2099-12-31T00:00:00Z'::timestamptz);
    new.coins := greatest(coalesce(new.coins, 0), 999999);
    new.gems := greatest(coalesce(new.gems, 0), 99999);
    new.puzzle_shards := greatest(coalesce(new.puzzle_shards, 0), 9999);
    new.rank_points := greatest(coalesce(new.rank_points, 0), 99999);
    new.pass_xp := greatest(coalesce(new.pass_xp, 0), 40000);
    new.hint_balance := greatest(coalesce(new.hint_balance, 0), 250);
    new.theme_id := coalesce(new.theme_id, 'puzzle_theme_electric');
    new.frame_id := coalesce(new.frame_id, 'frame_pulse');
    new.player_card_id := coalesce(new.player_card_id, 'card_neon_circuit');
    new.banner_id := coalesce(new.banner_id, 'banner_static_shock');
    new.emblem_id := coalesce(new.emblem_id, 'emblem_voltage');
  end if;

  return new;
end;
$$;

update public.profiles
set vip_access = true
where id in (
  select id
  from auth.users
  where lower(email) = 'judgemrogan@gmail.com'
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'bug' check (category in ('bug', 'complaint', 'support', 'feedback')),
  subject text not null check (char_length(btrim(subject)) between 3 and 160),
  body text not null check (char_length(btrim(body)) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  admin_notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create index if not exists idx_support_tickets_created_at
  on public.support_tickets(created_at desc);

create index if not exists idx_support_tickets_status_created_at
  on public.support_tickets(status, created_at desc);

create index if not exists idx_support_tickets_reporter_user_id
  on public.support_tickets(reporter_user_id, created_at desc);

drop trigger if exists set_support_tickets_updated_at on public.support_tickets;
create trigger set_support_tickets_updated_at
before update on public.support_tickets
for each row execute procedure public.handle_updated_at();

alter table public.support_tickets enable row level security;

grant select, insert, update on public.support_tickets to authenticated;

drop policy if exists "support tickets are insertable by reporter" on public.support_tickets;
create policy "support tickets are insertable by reporter"
on public.support_tickets
for insert
to authenticated
with check (reporter_user_id = auth.uid());

drop policy if exists "support tickets are readable by reporter" on public.support_tickets;
create policy "support tickets are readable by reporter"
on public.support_tickets
for select
to authenticated
using (reporter_user_id = auth.uid());

drop policy if exists "support tickets are readable by owner admin" on public.support_tickets;
create policy "support tickets are readable by owner admin"
on public.support_tickets
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role in ('owner', 'admin')
  )
);

drop policy if exists "support tickets are updatable by owner admin" on public.support_tickets;
create policy "support tickets are updatable by owner admin"
on public.support_tickets
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role in ('owner', 'admin')
  )
);
