update public.products
set active = false
where kind = 'bundle'
  and metadata ->> 'seasonId' = 'season1_neon_rivals'
  and id like 'season1_tier_skip_%';

insert into public.products (id, kind, price_usd, price_coins, price_gems, active, metadata)
values
  (
    's_6',
    'battle_pass',
    9.99,
    null,
    null,
    true,
    jsonb_build_object(
      'name', 'Season 1 Season Pass',
      'description', 'Unlock the full Season 1 Neon Rivals lane, including both premium avatars, prestige frames, banners, hints, and currency rewards.',
      'category', 'battle_pass',
      'rarity', 4,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'season1_tier_skip_1',
    'bundle',
    1.49,
    null,
    null,
    true,
    jsonb_build_object(
      'name', 'Season Tier Skip x1',
      'description', 'Instantly adds 1 Season 1 tier worth of pass XP.',
      'category', 'bundle',
      'rarity', 2,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals',
      'bundle_pass_xp', 500
    )
  ),
  (
    'season1_tier_skip_5',
    'bundle',
    5.99,
    null,
    null,
    true,
    jsonb_build_object(
      'name', 'Season Tier Skip x5',
      'description', 'Push 5 season pass tiers immediately without changing match balance.',
      'category', 'bundle',
      'rarity', 3,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals',
      'bundle_pass_xp', 2500
    )
  ),
  (
    'season1_tier_skip_10',
    'bundle',
    9.99,
    null,
    null,
    true,
    jsonb_build_object(
      'name', 'Season Tier Skip x10',
      'description', 'Fast-track 10 season pass tiers for players who want the full cosmetic lane early.',
      'category', 'bundle',
      'rarity', 4,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals',
      'bundle_pass_xp', 5000
    )
  ),
  (
    'puzzle_theme_electric',
    'theme',
    null,
    null,
    180,
    true,
    jsonb_build_object(
      'name', 'Electric Puzzle Theme',
      'description', 'Dark navy shell art with cyan, magenta, and violet charge rails across the puzzle board.',
      'category', 'theme',
      'rarity', 4,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'card_neon_circuit',
    'player_card',
    null,
    null,
    220,
    true,
    jsonb_build_object(
      'name', 'Neon Circuit Card',
      'description', 'Season 1 player card with electric trace lines and a high-voltage shimmer.',
      'category', 'player_card',
      'rarity', 4,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'animated', true,
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'banner_static_shock',
    'banner',
    null,
    5400,
    null,
    true,
    jsonb_build_object(
      'name', 'Static Shock Banner',
      'description', 'Arena banner with angular storm arcs and electric cyan edge bloom.',
      'category', 'banner',
      'rarity', 4,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'animated', true,
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'emblem_voltage',
    'emblem',
    null,
    null,
    260,
    true,
    jsonb_build_object(
      'name', 'Voltage Emblem',
      'description', 'Prestige emblem forged around a split neon bolt.',
      'category', 'emblem',
      'rarity', 5,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'frame_pulse',
    'frame',
    null,
    null,
    300,
    true,
    jsonb_build_object(
      'name', 'Pulse Frame',
      'description', 'Electric frame with timed glow surges and edge arcs around the portrait.',
      'category', 'frame',
      'rarity', 5,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'animated', true,
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'avatar_season1_neon_rival',
    'avatar',
    null,
    null,
    320,
    true,
    jsonb_build_object(
      'name', 'Neon Rival Avatar',
      'description', 'Season 1 lead rival portrait with hot-pink glow, luminous eyes, and arena sparks.',
      'category', 'avatar',
      'rarity', 6,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'avatar_season1_neon_strategist',
    'avatar',
    null,
    null,
    320,
    true,
    jsonb_build_object(
      'name', 'Neon Strategist Avatar',
      'description', 'Season 1 premium strategist portrait with gold light accents and command-board energy.',
      'category', 'avatar',
      'rarity', 6,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'banner_season1_neon_rivals',
    'banner',
    null,
    null,
    260,
    true,
    jsonb_build_object(
      'name', 'Season 1 Banner',
      'description', 'The grandmaster-season banner for Neon Rivals identity decks.',
      'category', 'banner',
      'rarity', 5,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'ranked_card_season1_highrank',
    'player_card',
    null,
    null,
    360,
    true,
    jsonb_build_object(
      'name', 'Neon Rivals High-Rank Card',
      'description', 'Animated prestige card that anchors the Season 1 identity deck.',
      'category', 'player_card',
      'rarity', 6,
      'collection', 'Season 1: Neon Rivals',
      'animated', true,
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'frame_elite_obsidian',
    'frame',
    null,
    null,
    240,
    true,
    jsonb_build_object(
      'name', 'Obsidian Elite Frame',
      'description', 'Prestige frame with obsidian glow rails.',
      'category', 'frame',
      'rarity', 5,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'frame_elite_nova',
    'frame',
    null,
    null,
    260,
    true,
    jsonb_build_object(
      'name', 'Nova Elite Frame',
      'description', 'Prestige frame with nova-blue edge bloom.',
      'category', 'frame',
      'rarity', 5,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'frame_elite_inferno',
    'frame',
    null,
    null,
    280,
    true,
    jsonb_build_object(
      'name', 'Inferno Elite Frame',
      'description', 'Prestige frame with inferno pulse highlights.',
      'category', 'frame',
      'rarity', 5,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'frame_elite_aurora',
    'frame',
    null,
    null,
    340,
    true,
    jsonb_build_object(
      'name', 'Aurora Elite Frame',
      'description', 'Top-end elite frame with aurora charge flow.',
      'category', 'frame',
      'rarity', 6,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
    )
  )
on conflict (id) do update set
  kind = excluded.kind,
  price_usd = excluded.price_usd,
  price_coins = excluded.price_coins,
  price_gems = excluded.price_gems,
  active = excluded.active,
  metadata = excluded.metadata,
  updated_at = timezone('utc', now());

update public.quest_definitions
set active = false
where track = 'seasonal'
  and coalesce(metadata ->> 'seasonKey', '') <> 'season-1';

insert into public.quest_definitions (
  id,
  track,
  title,
  description,
  objective_key,
  target_value,
  reward_json,
  metadata,
  active
)
values
  (
    'sq_ranked_finish',
    'seasonal',
    'Finish 5 Ranked Battles',
    'Finish five ranked Arena battles to bank extra Season 1 pass XP and coins.',
    'matches_played',
    5,
    jsonb_build_object('coins', 1200, 'passXp', 350),
    jsonb_build_object('seasonKey', 'season-1'),
    true
  ),
  (
    'sq_ranked_wins',
    'seasonal',
    'Win 3 Ranked Matches',
    'String together ranked wins to accelerate your season-pass progress.',
    'ranked_wins',
    3,
    jsonb_build_object('coins', 900, 'shards', 90, 'passXp', 260),
    jsonb_build_object('seasonKey', 'season-1'),
    true
  ),
  (
    'sq_pass_climb',
    'seasonal',
    'Earn 5000 Pass XP',
    'Climb the full Neon Rivals season lane and lock in another premium milestone.',
    'pass_xp_earned',
    5000,
    jsonb_build_object('coins', 1800, 'passXp', 500, 'itemId', 'card_neon_circuit'),
    jsonb_build_object('seasonKey', 'season-1'),
    true
  )
on conflict (id) do update set
  track = excluded.track,
  title = excluded.title,
  description = excluded.description,
  objective_key = excluded.objective_key,
  target_value = excluded.target_value,
  reward_json = excluded.reward_json,
  metadata = excluded.metadata,
  active = excluded.active,
  updated_at = timezone('utc', now());

insert into public.seasons (
  id,
  name,
  season_number,
  starts_at,
  ends_at,
  current_tier,
  max_tier,
  is_premium,
  tracks_json,
  metadata,
  active
)
values (
  'season1_neon_rivals',
  'Neon Rivals',
  1,
  '2026-03-20',
  '2026-06-20',
  1,
  40,
  false,
  (
    select jsonb_agg(
      jsonb_build_object(
        'tier', tier,
        'freeReward',
          case
            when mod(tier, 5) = 0 then jsonb_build_object('type', 'hints', 'amount', case when tier >= 30 then 3 when tier >= 15 then 2 else 1 end, 'label', case when tier >= 30 then '3 Hints' when tier >= 15 then '2 Hints' else '1 Hint' end)
            else jsonb_build_object('type', 'coins', 'amount', 250 + (tier * 95), 'label', (250 + (tier * 95))::text || ' Coins')
          end,
        'premiumReward',
          case
            when tier = 1 then jsonb_build_object('type', 'item', 'itemId', 'puzzle_theme_electric', 'label', 'Electric Puzzle Theme')
            when tier = 4 then jsonb_build_object('type', 'item', 'itemId', 'card_neon_circuit', 'label', 'Neon Circuit Card')
            when tier = 7 then jsonb_build_object('type', 'item', 'itemId', 'banner_static_shock', 'label', 'Static Shock Banner')
            when tier = 10 then jsonb_build_object('type', 'item', 'itemId', 'frame_pulse', 'label', 'Pulse Frame')
            when tier = 13 then jsonb_build_object('type', 'item', 'itemId', 'emblem_voltage', 'label', 'Voltage Emblem')
            when tier = 16 then jsonb_build_object('type', 'item', 'itemId', 'frame_elite_obsidian', 'label', 'Obsidian Elite Frame')
            when tier = 22 then jsonb_build_object('type', 'item', 'itemId', 'frame_elite_nova', 'label', 'Nova Elite Frame')
            when tier = 28 then jsonb_build_object('type', 'item', 'itemId', 'frame_elite_inferno', 'label', 'Inferno Elite Frame')
            when tier = 36 then jsonb_build_object('type', 'item', 'itemId', 'avatar_season1_neon_strategist', 'label', 'Neon Strategist Avatar')
            when tier = 37 then jsonb_build_object('type', 'item', 'itemId', 'frame_elite_aurora', 'label', 'Aurora Elite Frame')
            when tier = 38 then jsonb_build_object('type', 'item', 'itemId', 'banner_season1_neon_rivals', 'label', 'Season 1 Banner')
            when tier = 39 then jsonb_build_object('type', 'item', 'itemId', 'ranked_card_season1_highrank', 'label', 'Neon Rivals High-Rank Card')
            when tier = 40 then jsonb_build_object('type', 'item', 'itemId', 'avatar_season1_neon_rival', 'label', 'Neon Rival Avatar')
            when mod(tier, 5) = 0 then jsonb_build_object('type', 'hints', 'amount', case when tier >= 30 then 4 when tier >= 15 then 3 else 2 end, 'label', case when tier >= 30 then '4 Hints' when tier >= 15 then '3 Hints' else '2 Hints' end)
            when mod(tier, 2) = 0 then jsonb_build_object('type', 'pass_xp', 'amount', 120 + (tier * 20), 'label', (120 + (tier * 20))::text || ' Pass XP')
            else jsonb_build_object('type', 'coins', 'amount', 600 + (tier * 120), 'label', (600 + (tier * 120))::text || ' Coins')
          end,
        'isUnlocked', false
      )
      order by tier
    )
    from generate_series(1, 40) as tier
  ),
  jsonb_build_object(
    'seasonKey', 'season-1',
    'premiumProductId', 's_6',
    'themeName', 'Neon Rivals',
    'tagline', 'Random puzzle battles, premium cosmetics, and non-pay-to-win progression.',
    'tierSkipProductIds', jsonb_build_array('season1_tier_skip_1', 'season1_tier_skip_5', 'season1_tier_skip_10')
  ),
  true
)
on conflict (id) do update set
  name = excluded.name,
  season_number = excluded.season_number,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  current_tier = excluded.current_tier,
  max_tier = excluded.max_tier,
  is_premium = excluded.is_premium,
  tracks_json = excluded.tracks_json,
  metadata = excluded.metadata,
  active = excluded.active,
  updated_at = timezone('utc', now());
