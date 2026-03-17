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
as $function$
#variable_conflict use_column
declare
  v_player_count integer;
  v_ready_count integer;
  v_max_players integer;
begin
  update public.lobby_players
  set is_ready = true
  where lobby_players.lobby_id = p_lobby_id
    and lobby_players.user_id = p_user_id
    and lobby_players.left_at is null;

  select lobbies.max_players into v_max_players from public.lobbies where lobbies.id = p_lobby_id;
  select count(*)::integer into v_player_count from public.lobby_players where lobby_players.lobby_id = p_lobby_id and lobby_players.left_at is null;
  select count(*)::integer into v_ready_count from public.lobby_players where lobby_players.lobby_id = p_lobby_id and lobby_players.left_at is null and lobby_players.is_ready = true;

  update public.lobbies
  set updated_at = timezone('utc', now())
  where lobbies.id = p_lobby_id;

  return query
  select p_lobby_id, (v_player_count = v_max_players and v_ready_count = v_player_count), v_player_count;
end;
$function$;

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
as $function$
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
    where lobby_players.lobby_id = p_lobby_id
      and lobby_players.user_id = p_user_id
      and lobby_players.left_at is null;
  else
    update public.lobby_players
    set next_round_vote = p_vote
    where lobby_players.lobby_id = p_lobby_id
      and lobby_players.user_id = p_user_id
      and lobby_players.left_at is null;
  end if;

  select lobbies.max_players into v_max_players from public.lobbies where lobbies.id = p_lobby_id;
  select count(*)::integer into v_active_players from public.lobby_players where lobby_players.lobby_id = p_lobby_id and lobby_players.left_at is null;
  select count(*)::integer into v_continue_players from public.lobby_players where lobby_players.lobby_id = p_lobby_id and lobby_players.left_at is null and lobby_players.next_round_vote = 'continue';

  update public.lobbies
  set updated_at = timezone('utc', now())
  where lobbies.id = p_lobby_id;

  return query
  select p_lobby_id, v_active_players, (v_active_players > 0 and v_continue_players = v_active_players), greatest(v_max_players - v_active_players, 0);
end;
$function$;
