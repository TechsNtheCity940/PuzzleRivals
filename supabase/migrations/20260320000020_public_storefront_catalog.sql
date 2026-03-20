drop policy if exists "products are readable by authenticated users" on public.products;
drop policy if exists "products are readable by clients" on public.products;
create policy "products are readable by clients"
on public.products
for select
to anon, authenticated
using (active = true);

insert into public.products (id, kind, price_usd, price_coins, price_gems, active, metadata)
values
  (
    's_5',
    'bundle',
    4.99,
    null,
    null,
    true,
    jsonb_build_object(
      'name', 'Starter Bundle',
      'description', '5000 Coins + 50 Gems + Rare Frame',
      'category', 'bundle',
      'rarity', 2,
      'featured', true,
      'collection', 'Launch Core',
      'bundle_coins', 5000,
      'bundle_gems', 50,
      'included_item_ids', jsonb_build_array('s_2')
    )
  ),
  (
    's_6',
    'battle_pass',
    9.99,
    null,
    null,
    true,
    jsonb_build_object(
      'name', 'Season XI Battle Pass',
      'description', 'Unlock 40 tiers of exclusive rewards',
      'category', 'battle_pass',
      'rarity', 3,
      'featured', true,
      'collection', 'Echoes of Logic'
    )
  ),
  (
    'vip_monthly',
    'vip',
    7.99,
    null,
    null,
    true,
    jsonb_build_object(
      'name', 'VIP Membership',
      'description', 'Monthly VIP access with bonus gems and priority rival perks.',
      'category', 'bundle',
      'rarity', 4,
      'featured', true,
      'collection', 'Live Perks',
      'billing_label', 'Monthly',
      'vip_duration_days', 30,
      'vip_bonus_gems', 500,
      'perks', jsonb_build_array(
        '2x Coin earnings from matches',
        'Exclusive VIP badge and frame',
        'Priority matchmaking',
        'Ad-free experience',
        'Monthly 500 Gem bonus',
        'Exclusive VIP tournaments'
      )
    )
  )
on conflict (id) do update set
  kind = excluded.kind,
  price_usd = excluded.price_usd,
  price_coins = excluded.price_coins,
  price_gems = excluded.price_gems,
  active = excluded.active,
  metadata = excluded.metadata;
