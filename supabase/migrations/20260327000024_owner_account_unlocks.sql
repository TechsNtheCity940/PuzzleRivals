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

drop trigger if exists apply_owner_account_profile_perks on public.profiles;
create trigger apply_owner_account_profile_perks
before insert or update on public.profiles
for each row execute function public.apply_owner_account_profile_perks();

update public.profiles
set username = username
where id in (
  select id
  from auth.users
  where lower(email) = 'judgemrogan@gmail.com'
);

insert into public.user_inventory (user_id, product_id, source, is_equipped)
select
  p.id,
  products.id,
  'owner_bootstrap',
  false
from public.profiles p
join auth.users users on users.id = p.id
join public.products products
  on products.active = true
 and products.kind in ('theme', 'frame', 'avatar', 'player_card', 'banner', 'emblem', 'title')
where lower(users.email) = 'judgemrogan@gmail.com'
on conflict (user_id, product_id)
do update set
  source = excluded.source,
  updated_at = timezone('utc', now());
