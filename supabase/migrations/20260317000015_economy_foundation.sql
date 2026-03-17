alter table public.profiles
  add column if not exists puzzle_shards integer not null default 0,
  add column if not exists rank_points integer not null default 0,
  add column if not exists pass_xp integer not null default 0;

update public.profiles
set rank_points = greatest(rank_points, elo)
where rank_points = 0
  and elo > 0;

insert into public.products (id, kind, price_usd, price_coins, price_gems, active, metadata)
values
  (
    's_11',
    'player_card',
    null,
    null,
    200,
    true,
    jsonb_build_object(
      'name', 'Static Shock Card',
      'description', 'Animated neon player card for leaderboard intros.',
      'category', 'player_card',
      'rarity', 4,
      'featured', true,
      'collection', 'Neon Rivals'
    )
  ),
  (
    's_12',
    'banner',
    null,
    4200,
    null,
    true,
    jsonb_build_object(
      'name', 'Aurora Grid Banner',
      'description', 'Lobby banner with aurora streaks and puzzle lattice cuts.',
      'category', 'banner',
      'rarity', 3,
      'collection', 'Neon Rivals'
    )
  ),
  (
    's_13',
    'emblem',
    null,
    2400,
    null,
    true,
    jsonb_build_object(
      'name', 'Word Master Emblem',
      'description', 'Equip a mastery emblem for vocabulary and riddle specialists.',
      'category', 'emblem',
      'rarity', 2,
      'collection', 'Mastery'
    )
  ),
  (
    's_14',
    'title',
    null,
    null,
    320,
    true,
    jsonb_build_object(
      'name', 'Founder Title',
      'description', 'A prestige profile title reserved for early rivals.',
      'category', 'title',
      'rarity', 5,
      'collection', 'Legacy'
    )
  ),
  (
    's_15',
    'bundle',
    12.99,
    null,
    null,
    true,
    jsonb_build_object(
      'name', 'Inferno Collection',
      'description', 'Avatar, banner, frame, and card from the Inferno identity line.',
      'category', 'bundle',
      'rarity', 4,
      'featured', true,
      'collection', 'Inferno',
      'bundle_coins', 4000,
      'bundle_gems', 120,
      'bundle_shards', 80,
      'bundle_pass_xp', 600,
      'included_item_ids', jsonb_build_array('s_16', 's_17', 's_19')
    )
  ),
  (
    's_16',
    'avatar',
    null,
    null,
    140,
    true,
    jsonb_build_object(
      'name', 'Storm Solver Avatar',
      'description', 'Static 2D rival portrait built around a charged puzzle spinner.',
      'category', 'avatar',
      'rarity', 3,
      'collection', 'Storm Matrix'
    )
  ),
  (
    's_17',
    'banner',
    null,
    null,
    160,
    true,
    jsonb_build_object(
      'name', 'Puzzle Vault Banner',
      'description', 'Premium profile banner styled like a sealed puzzle archive.',
      'category', 'banner',
      'rarity', 4,
      'collection', 'Puzzle Vault'
    )
  ),
  (
    's_18',
    'emblem',
    null,
    null,
    260,
    true,
    jsonb_build_object(
      'name', 'Season Victor Emblem',
      'description', 'Exclusive rank-chase emblem with seasonal prestige polish.',
      'category', 'emblem',
      'rarity', 5,
      'collection', 'Season Rewards'
    )
  ),
  (
    's_19',
    'frame',
    null,
    null,
    300,
    true,
    jsonb_build_object(
      'name', 'Voltage Pulse Frame',
      'description', 'Animated electric frame with charge arcs around the portrait.',
      'category', 'frame',
      'rarity', 5,
      'collection', 'Neon Rivals'
    )
  ),
  (
    's_20',
    'player_card',
    null,
    null,
    340,
    true,
    jsonb_build_object(
      'name', 'Holograph Grid Card',
      'description', 'Reactive player card that sharpens during intro reveals.',
      'category', 'player_card',
      'rarity', 5,
      'collection', 'Holograph'
    )
  )
on conflict (id) do update set
  kind = excluded.kind,
  price_usd = excluded.price_usd,
  price_coins = excluded.price_coins,
  price_gems = excluded.price_gems,
  active = excluded.active,
  metadata = excluded.metadata;
