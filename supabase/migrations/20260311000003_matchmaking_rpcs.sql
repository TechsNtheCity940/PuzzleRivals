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
as $$
#variable_conflict use_column
declare
  v_lobby_id uuid;
  v_seat_no integer;
  v_max_players integer;
begin
  insert into public.queue_entries (user_id, mode, region, status)
  values (p_user_id, p_mode, p_region, 'matched')
  on conflict (user_id, mode, status)
  do update set updated_at = timezone('utc', now());

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

  if v_lobby_id is null then
    insert into public.lobbies (mode, region, status, max_players)
    values (p_mode, p_region, 'filling', 4)
    returning id into v_lobby_id;

    select l.max_players
    into v_max_players
    from public.lobbies l
    where l.id = v_lobby_id;
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
$$;

create or replace function public.mark_player_ready(
  p_user_id uuid,
  p_lobby_id uuid
)
returns table (
  lobby_id uuid,
  all_ready boolean,
  player_count integer
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_player_count integer;
  v_ready_count integer;
  v_max_players integer;
begin
  update public.lobby_players
  set is_ready = true
  where lobby_id = p_lobby_id
    and user_id = p_user_id
    and left_at is null;

  select max_players into v_max_players from public.lobbies where id = p_lobby_id;
  select count(*)::integer into v_player_count from public.lobby_players where lobby_id = p_lobby_id and left_at is null;
  select count(*)::integer into v_ready_count from public.lobby_players where lobby_id = p_lobby_id and left_at is null and is_ready = true;

  update public.lobbies
  set updated_at = timezone('utc', now())
  where id = p_lobby_id;

  return query
  select p_lobby_id, (v_player_count = v_max_players and v_ready_count = v_player_count), v_player_count;
end;
$$;

create or replace function public.submit_round_progress(
  p_user_id uuid,
  p_round_id uuid,
  p_stage text,
  p_progress integer,
  p_submission_hash text default null
)
returns table (
  round_id uuid,
  practice_progress integer,
  live_progress integer
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  insert into public.round_results (
    round_id,
    user_id,
    practice_progress,
    live_progress,
    submission_hash
  )
  values (
    p_round_id,
    p_user_id,
    case when p_stage = 'practice' then greatest(0, least(100, p_progress)) else 0 end,
    case when p_stage = 'live' then greatest(0, least(100, p_progress)) else 0 end,
    p_submission_hash
  )
  on conflict (round_id, user_id)
  do update set
    practice_progress = case when p_stage = 'practice' then greatest(public.round_results.practice_progress, excluded.practice_progress) else public.round_results.practice_progress end,
    live_progress = case when p_stage = 'live' then greatest(public.round_results.live_progress, excluded.live_progress) else public.round_results.live_progress end,
    submission_hash = coalesce(excluded.submission_hash, public.round_results.submission_hash),
    updated_at = timezone('utc', now());

  return query
  select rr.round_id, rr.practice_progress, rr.live_progress
  from public.round_results rr
  where rr.round_id = p_round_id
    and rr.user_id = p_user_id;
end;
$$;

create or replace function public.submit_round_solve(
  p_user_id uuid,
  p_round_id uuid,
  p_solved_at_ms integer,
  p_submission_hash text default null
)
returns table (
  round_id uuid,
  all_solved boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_lobby_id uuid;
  v_active_players integer;
  v_solved_players integer;
begin
  insert into public.round_results (
    round_id,
    user_id,
    live_progress,
    solved_at_ms,
    submission_hash
  )
  values (
    p_round_id,
    p_user_id,
    100,
    greatest(0, p_solved_at_ms),
    p_submission_hash
  )
  on conflict (round_id, user_id)
  do update set
    live_progress = 100,
    solved_at_ms = coalesce(public.round_results.solved_at_ms, excluded.solved_at_ms),
    submission_hash = coalesce(excluded.submission_hash, public.round_results.submission_hash),
    updated_at = timezone('utc', now());

  select lobby_id into v_lobby_id from public.rounds where id = p_round_id;
  select count(*)::integer into v_active_players from public.lobby_players where lobby_id = v_lobby_id and left_at is null;
  select count(*)::integer into v_solved_players from public.round_results where round_id = p_round_id and live_progress >= 100;

  return query
  select p_round_id, (v_active_players > 0 and v_active_players = v_solved_players);
end;
$$;

create or replace function public.vote_next_round(
  p_user_id uuid,
  p_lobby_id uuid,
  p_vote public.next_round_vote
)
returns table (
  lobby_id uuid,
  active_players integer,
  all_continue boolean,
  open_seats integer
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_active_players integer;
  v_continue_players integer;
  v_max_players integer;
begin
  if p_vote = 'exit' then
    update public.lobby_players
    set next_round_vote = p_vote,
        left_at = coalesce(left_at, timezone('utc', now()))
    where lobby_id = p_lobby_id
      and user_id = p_user_id
      and left_at is null;
  else
    update public.lobby_players
    set next_round_vote = p_vote
    where lobby_id = p_lobby_id
      and user_id = p_user_id
      and left_at is null;
  end if;

  select max_players into v_max_players from public.lobbies where id = p_lobby_id;
  select count(*)::integer into v_active_players from public.lobby_players where lobby_id = p_lobby_id and left_at is null;
  select count(*)::integer into v_continue_players from public.lobby_players where lobby_id = p_lobby_id and left_at is null and next_round_vote = 'continue';

  update public.lobbies
  set updated_at = timezone('utc', now())
  where id = p_lobby_id;

  return query
  select p_lobby_id, v_active_players, (v_active_players > 0 and v_continue_players = v_active_players), greatest(v_max_players - v_active_players, 0);
end;
$$;
