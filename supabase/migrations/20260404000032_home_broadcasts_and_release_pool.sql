create table if not exists public.site_broadcasts (
  slot text primary key,
  title text not null default '',
  message text not null default '',
  cta_label text,
  cta_href text,
  is_active boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_site_broadcasts_updated_at on public.site_broadcasts;
create trigger set_site_broadcasts_updated_at
before update on public.site_broadcasts
for each row execute procedure public.handle_updated_at();

alter table public.site_broadcasts enable row level security;

grant select on public.site_broadcasts to anon, authenticated;

drop policy if exists "active site broadcasts are readable by clients" on public.site_broadcasts;
create policy "active site broadcasts are readable by clients"
on public.site_broadcasts
for select
to anon, authenticated
using (is_active = true);

insert into public.site_broadcasts (
  slot,
  title,
  message,
  cta_label,
  cta_href,
  is_active
)
values (
  'home_top',
  'Arena Broadcast',
  'Season 1 beta access opens soon. Ranked boards, rewards, and social features are live for testing.',
  'View Arena',
  '/play',
  false
)
on conflict (slot) do nothing;

update public.puzzle_catalog
set active = false,
    updated_at = timezone('utc', now())
where type in (
  'chess_tactic',
  'checkers_tactic',
  'chess_endgame',
  'chess_opening',
  'chess_mate_net'
);
