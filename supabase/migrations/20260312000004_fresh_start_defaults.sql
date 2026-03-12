alter table public.profiles
  alter column rank set default 'bronze';

alter table public.profiles
  alter column elo set default 0;

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
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'Player') || '-' || left(replace(new.id::text, '-', ''), 6)
  )
  on conflict (id) do nothing;

  insert into public.player_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

update public.profiles
set
  rank = 'bronze',
  elo = 0,
  level = 1,
  xp = 0,
  xp_to_next = 5000,
  coins = 0,
  gems = 0,
  is_vip = false,
  updated_at = timezone('utc', now());

update public.player_stats
set
  wins = 0,
  losses = 0,
  matches_played = 0,
  win_streak = 0,
  best_streak = 0,
  updated_at = timezone('utc', now());

delete from public.round_results;
delete from public.rounds;
delete from public.lobby_players;
delete from public.lobbies;
delete from public.queue_entries;
