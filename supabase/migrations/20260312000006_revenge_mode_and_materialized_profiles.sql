do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'match_mode'
      and e.enumlabel = 'revenge'
  ) then
    alter type public.match_mode add value 'revenge';
  end if;
end
$$;

alter table public.profiles
  add column if not exists best_puzzle_type text,
  add column if not exists worst_puzzle_type text,
  add column if not exists rival_user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_profiles_rival_user_id
  on public.profiles(rival_user_id);

create or replace function public.join_lobby(
  p_user_id uuid,
  p_mode public.match_mode,
  p_region text default 'global'
)
returns table (
  lobby_id uuid,
  player_count integer,
  max_players integer
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_lobby_id uuid;
  v_seat_no integer;
  v_max_players integer;
  v_rival_user_id uuid;
begin
  insert into public.queue_entries (user_id, mode, region, status)
  values (p_user_id, p_mode, p_region, 'matched')
  on conflict (user_id, mode, status)
  do update set updated_at = timezone('utc', now());

  select rival_user_id
  into v_rival_user_id
  from public.profiles
  where id = p_user_id;

  select l.id, l.max_players
  into v_lobby_id, v_max_players
  from public.lobbies l
  where l.mode = p_mode
    and l.region = p_region
    and l.status = 'filling'
    and (
      select count(*)
      from public.lobby_players lp
      where lp.lobby_id = l.id
        and lp.left_at is null
    ) < l.max_players
    and (
      p_mode <> 'revenge'
      or v_rival_user_id is null
      or exists (
        select 1
        from public.lobby_players lp
        where lp.lobby_id = l.id
          and lp.left_at is null
          and lp.user_id = v_rival_user_id
      )
    )
  order by l.created_at
  limit 1
  for update skip locked;

  if v_lobby_id is null then
    select l.id, l.max_players
    into v_lobby_id, v_max_players
    from public.lobbies l
    where l.mode = p_mode
      and l.region = p_region
      and l.status = 'filling'
      and (
        select count(*)
        from public.lobby_players lp
        where lp.lobby_id = l.id
          and lp.left_at is null
      ) < l.max_players
    order by l.created_at
    limit 1
    for update skip locked;
  end if;

  if v_lobby_id is null then
    insert into public.lobbies (mode, region, status, max_players)
    values (
      p_mode,
      p_region,
      'filling',
      case when p_mode = 'revenge' then 2 else 4 end
    )
    returning id, max_players into v_lobby_id, v_max_players;
  end if;

  if not exists (
    select 1
    from public.lobby_players lp
    where lp.lobby_id = v_lobby_id
      and lp.user_id = p_user_id
      and lp.left_at is null
  ) then
    select gs
    into v_seat_no
    from generate_series(1, v_max_players) as gs
    where not exists (
      select 1
      from public.lobby_players lp
      where lp.lobby_id = v_lobby_id
        and lp.seat_no = gs
        and lp.left_at is null
    )
    order by gs
    limit 1;

    insert into public.lobby_players (lobby_id, user_id, seat_no, is_ready, next_round_vote)
    values (v_lobby_id, p_user_id, v_seat_no, false, null)
    on conflict (lobby_id, user_id)
    do update set
      left_at = null,
      is_ready = false,
      next_round_vote = null;
  end if;

  update public.lobbies
  set updated_at = timezone('utc', now())
  where id = v_lobby_id;

  return query
  select
    v_lobby_id,
    (
      select count(*)
      from public.lobby_players lp
      where lp.lobby_id = v_lobby_id
        and lp.left_at is null
    )::integer,
    v_max_players;
end;
$function$;
