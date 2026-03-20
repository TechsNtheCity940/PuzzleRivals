create or replace function public.backfill_profile_activity_events(p_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_total integer := 0;
  v_inserted integer := 0;
begin
  insert into public.profile_activity_events (
    user_id,
    event_type,
    source_type,
    source_key,
    label,
    title,
    description,
    metadata,
    occurred_at,
    is_read
  )
  select
    rr.user_id,
    'match',
    'round_result',
    rr.round_id::text,
    concat(initcap(replace(coalesce(l.mode::text, 'live'), '_', ' ')), ' Match'),
    case
      when coalesce(rr.placement, 0) = 1 then concat(
        'Won a ',
        lower(initcap(replace(coalesce(l.mode::text, 'live'), '_', ' '))),
        ' ',
        coalesce(pc.label, initcap(replace(r.puzzle_type, '_', ' '))),
        ' round'
      )
      when rr.placement is not null then concat(
        'Finished #',
        rr.placement,
        ' in ',
        coalesce(pc.label, initcap(replace(r.puzzle_type, '_', ' ')))
      )
      when coalesce(rr.live_progress, 0) >= 100 then concat(
        'Solved ',
        coalesce(pc.label, initcap(replace(r.puzzle_type, '_', ' ')))
      )
      else concat(
        'Played ',
        coalesce(pc.label, initcap(replace(r.puzzle_type, '_', ' ')))
      )
    end,
    concat_ws(
      ' | ',
      nullif(concat_ws(
        ' | ',
        case when rr.placement is not null then concat('#', rr.placement, ' finish') end,
        case when coalesce(rr.xp_delta, 0) <> 0 then concat(case when rr.xp_delta > 0 then '+' else '' end, rr.xp_delta, ' XP') end,
        case when coalesce(rr.coin_delta, 0) <> 0 then concat(case when rr.coin_delta > 0 then '+' else '' end, rr.coin_delta, ' Coins') end,
        case when coalesce(rr.elo_delta, 0) <> 0 then concat(case when rr.elo_delta > 0 then '+' else '' end, rr.elo_delta, ' ELO') end,
        case when rr.placement is null and coalesce(rr.live_progress, 0) > 0 then concat(rr.live_progress, '% progress') end
      ), ''),
      case when r.round_no is not null then concat('Round ', r.round_no) end
    ),
    jsonb_build_object(
      'roundId', rr.round_id,
      'roundNo', r.round_no,
      'mode', l.mode,
      'puzzleType', r.puzzle_type,
      'placement', rr.placement,
      'liveProgress', rr.live_progress,
      'xpDelta', rr.xp_delta,
      'coinDelta', rr.coin_delta,
      'eloDelta', rr.elo_delta
    ),
    coalesce(r.finished_at, rr.updated_at, rr.created_at, timezone('utc', now())),
    false
  from public.round_results rr
  join public.rounds r on r.id = rr.round_id
  left join public.lobbies l on l.id = r.lobby_id
  left join public.puzzle_catalog pc on pc.type = r.puzzle_type and pc.active = true
  where p_user_id is null or rr.user_id = p_user_id
  on conflict (user_id, source_type, source_key) do nothing;

  get diagnostics v_inserted = row_count;
  v_inserted_total := v_inserted_total + v_inserted;

  insert into public.profile_activity_events (
    user_id,
    event_type,
    source_type,
    source_key,
    label,
    title,
    description,
    metadata,
    occurred_at,
    is_read
  )
  select
    p.user_id,
    'purchase',
    'purchase',
    p.id::text,
    case when p.status = 'captured' then 'Purchase' else 'Checkout' end,
    case
      when p.status = 'captured' then concat('Unlocked ', coalesce(prod.metadata ->> 'name', pi.product_id))
      when p.status = 'approved' then concat('Purchase approved for ', coalesce(prod.metadata ->> 'name', pi.product_id))
      when p.status = 'failed' then concat('Purchase failed for ', coalesce(prod.metadata ->> 'name', pi.product_id))
      else concat('Checkout started for ', coalesce(prod.metadata ->> 'name', pi.product_id))
    end,
    concat_ws(
      ' | ',
      case
        when p.currency = 'USD' then concat('$', to_char(coalesce(p.amount, 0)::numeric, 'FM999999990.00'))
        when p.currency = 'GEMS' then concat(coalesce(p.amount, 0)::int, ' Gems')
        when p.currency = 'COINS' then concat(coalesce(p.amount, 0)::int, ' Coins')
        else concat(p.currency, ' ', to_char(coalesce(p.amount, 0)::numeric, 'FM999999990.00'))
      end,
      coalesce(prod.kind, 'purchase'),
      p.status
    ),
    jsonb_build_object(
      'purchaseId', p.id,
      'productId', pi.product_id,
      'productKind', prod.kind,
      'status', p.status,
      'currency', p.currency,
      'amount', p.amount
    ),
    coalesce(p.captured_at, p.updated_at, p.created_at, timezone('utc', now())),
    false
  from public.purchases p
  join public.purchase_items pi on pi.purchase_id = p.id
  left join public.products prod on prod.id = pi.product_id
  where p_user_id is null or p.user_id = p_user_id
  on conflict (user_id, source_type, source_key) do nothing;

  get diagnostics v_inserted = row_count;
  v_inserted_total := v_inserted_total + v_inserted;

  insert into public.profile_activity_events (
    user_id,
    event_type,
    source_type,
    source_key,
    label,
    title,
    description,
    metadata,
    occurred_at,
    is_read
  )
  select
    p.id,
    'social',
    'social_link',
    concat('facebook:', btrim(p.facebook_handle)),
    'Social',
    'Facebook identity linked',
    concat(btrim(p.facebook_handle), ' is visible in your live rival profile.'),
    jsonb_build_object('platform', 'facebook', 'handle', btrim(p.facebook_handle)),
    coalesce(p.updated_at, p.created_at, timezone('utc', now())),
    false
  from public.profiles p
  where nullif(btrim(coalesce(p.facebook_handle, '')), '') is not null
    and (p_user_id is null or p.id = p_user_id)
  on conflict (user_id, source_type, source_key) do nothing;

  get diagnostics v_inserted = row_count;
  v_inserted_total := v_inserted_total + v_inserted;

  insert into public.profile_activity_events (
    user_id,
    event_type,
    source_type,
    source_key,
    label,
    title,
    description,
    metadata,
    occurred_at,
    is_read
  )
  select
    p.id,
    'social',
    'social_link',
    concat('tiktok:', btrim(p.tiktok_handle)),
    'Social',
    'TikTok identity linked',
    concat(btrim(p.tiktok_handle), ' is visible in your live rival profile.'),
    jsonb_build_object('platform', 'tiktok', 'handle', btrim(p.tiktok_handle)),
    coalesce(p.updated_at, p.created_at, timezone('utc', now())),
    false
  from public.profiles p
  where nullif(btrim(coalesce(p.tiktok_handle, '')), '') is not null
    and (p_user_id is null or p.id = p_user_id)
  on conflict (user_id, source_type, source_key) do nothing;

  get diagnostics v_inserted = row_count;
  v_inserted_total := v_inserted_total + v_inserted;

  return v_inserted_total;
end;
$$;

select public.backfill_profile_activity_events();
