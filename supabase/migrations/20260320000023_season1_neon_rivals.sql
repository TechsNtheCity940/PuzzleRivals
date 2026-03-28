update public.seasons
set active = false
where active = true
  and id <> 'season1_neon_rivals';

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
      'name', 'Season 1: Neon Rivals Battle Pass',
      'description', 'Unlock 40 tiers of Neon Rivals rewards, including the Neon Strategist avatar.',
      'category', 'battle_pass',
      'rarity', 4,
      'featured', true,
      'collection', 'Season 1: Neon Rivals',
      'seasonId', 'season1_neon_rivals'
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
    180,
    true,
    jsonb_build_object(
      'name', 'Neon Rival Avatar',
      'description', 'Season 1 hooded operator portrait with hot-pink glow and puzzle-arena sparks.',
      'category', 'avatar',
      'rarity', 4,
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
    null,
    false,
    jsonb_build_object(
      'name', 'Neon Strategist Avatar',
      'description', 'Premium season reward featuring the neon-gold chess strategist.',
      'category', 'avatar',
      'rarity', 6,
      'collection', 'Season 1: Neon Rivals',
      'rewardSource', 'season_pass',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'banner_season1_neon_rivals',
    'banner',
    null,
    null,
    null,
    false,
    jsonb_build_object(
      'name', 'Season 1 Banner',
      'description', 'Competitive ranked banner for Neon Rivals finishers.',
      'category', 'banner',
      'rarity', 5,
      'collection', 'Season 1: Neon Rivals',
      'rewardSource', 'ranked',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'ranked_card_season1_highrank',
    'player_card',
    null,
    null,
    null,
    false,
    jsonb_build_object(
      'name', 'Neon Rivals High-Rank Card',
      'description', 'Animated player card granted to top Neon Rivals finishers.',
      'category', 'player_card',
      'rarity', 6,
      'collection', 'Season 1: Neon Rivals',
      'animated', true,
      'rewardSource', 'ranked',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'frame_elite_obsidian',
    'frame',
    null,
    null,
    null,
    false,
    jsonb_build_object(
      'name', 'Obsidian Elite',
      'description', 'Ranked elite frame color for Platinum Neon Rivals finishers.',
      'category', 'frame',
      'rarity', 5,
      'collection', 'Season 1: Neon Rivals',
      'rewardSource', 'ranked',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'frame_elite_nova',
    'frame',
    null,
    null,
    null,
    false,
    jsonb_build_object(
      'name', 'Nova Elite',
      'description', 'Ranked elite frame color for Diamond Neon Rivals finishers.',
      'category', 'frame',
      'rarity', 5,
      'collection', 'Season 1: Neon Rivals',
      'rewardSource', 'ranked',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'frame_elite_inferno',
    'frame',
    null,
    null,
    null,
    false,
    jsonb_build_object(
      'name', 'Inferno Elite',
      'description', 'Ranked elite frame color for Master Neon Rivals finishers.',
      'category', 'frame',
      'rarity', 5,
      'collection', 'Season 1: Neon Rivals',
      'rewardSource', 'ranked',
      'seasonId', 'season1_neon_rivals'
    )
  ),
  (
    'frame_elite_aurora',
    'frame',
    null,
    null,
    null,
    false,
    jsonb_build_object(
      'name', 'Aurora Elite',
      'description', 'Ranked elite frame color for Grandmaster and Legend finishers.',
      'category', 'frame',
      'rarity', 6,
      'collection', 'Season 1: Neon Rivals',
      'rewardSource', 'ranked',
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
  14,
  40,
  false,
  (
    select jsonb_agg(
      jsonb_build_object(
        'tier', tier,
        'freeReward',
          case
            when tier = 3 then jsonb_build_object('type', 'item', 'itemId', 'puzzle_theme_electric', 'label', 'Electric Puzzle Theme')
            when tier = 10 then jsonb_build_object('type', 'item', 'itemId', 'banner_static_shock', 'label', 'Static Shock Banner')
            when tier = 16 then jsonb_build_object('type', 'shards', 'amount', 140, 'label', '140 Shards')
            when tier = 24 then jsonb_build_object('type', 'item', 'itemId', 'emblem_voltage', 'label', 'Voltage Emblem')
            when tier = 32 then jsonb_build_object('type', 'gems', 'amount', 240, 'label', '240 Gems')
            when tier = 40 then jsonb_build_object('type', 'coins', 'amount', 6000, 'label', '6000 Coins')
            when mod(tier, 5) = 0 then jsonb_build_object('type', 'gems', 'amount', tier * 12, 'label', (tier * 12)::text || ' Gems')
            when mod(tier, 2) = 0 then jsonb_build_object('type', 'coins', 'amount', tier * 350, 'label', (tier * 350)::text || ' Coins')
            else jsonb_build_object('type', 'pass_xp', 'amount', tier * 140, 'label', (tier * 140)::text || ' Pass XP')
          end,
        'premiumReward',
          case
            when tier = 1 then jsonb_build_object('type', 'item', 'itemId', 'puzzle_theme_electric', 'label', 'Electric Puzzle Theme')
            when tier = 4 then jsonb_build_object('type', 'item', 'itemId', 'card_neon_circuit', 'label', 'Neon Circuit Card')
            when tier = 8 then jsonb_build_object('type', 'item', 'itemId', 'banner_static_shock', 'label', 'Static Shock Banner')
            when tier = 12 then jsonb_build_object('type', 'item', 'itemId', 'frame_pulse', 'label', 'Pulse Frame')
            when tier = 20 then jsonb_build_object('type', 'item', 'itemId', 'avatar_season1_neon_strategist', 'label', 'Neon Strategist Avatar')
            when tier = 28 then jsonb_build_object('type', 'item', 'itemId', 'emblem_voltage', 'label', 'Voltage Emblem')
            when tier = 34 then jsonb_build_object('type', 'item', 'itemId', 'avatar_season1_neon_rival', 'label', 'Neon Rival Avatar')
            when tier = 40 then jsonb_build_object('type', 'item', 'itemId', 'ranked_card_season1_highrank', 'label', 'Animated High-Rank Card')
            when mod(tier, 3) = 0 then jsonb_build_object('type', 'shards', 'amount', tier * 18, 'label', (tier * 18)::text || ' Shards')
            else jsonb_build_object('type', 'gems', 'amount', tier * 14, 'label', (tier * 14)::text || ' Gems')
          end,
        'isUnlocked', tier <= 14
      )
      order by tier
    )
    from generate_series(1, 40) as tier
  ),
  jsonb_build_object(
    'seasonKey', 'season-1',
    'premiumProductId', 's_6',
    'themeName', 'Neon Rivals',
    'tagline', 'Electric. Competitive. Puzzle Arena.'
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

insert into public.quest_definitions (id, track, title, description, objective_key, target_value, reward_json, metadata, active)
values
  (
    'sq_gold',
    'seasonal',
    'Reach Gold',
    'Climb into Gold during Neon Rivals to claim the Voltage Emblem.',
    'reach_rank_points',
    1400,
    jsonb_build_object('gems', 60, 'shards', 120, 'itemId', 'emblem_voltage'),
    jsonb_build_object('seasonKey', 'season-1'),
    true
  ),
  (
    'sq_pass_xp',
    'seasonal',
    'Earn 5000 Pass XP',
    'Push your season lane forward to unlock the Neon Circuit card reward cache.',
    'pass_xp_earned',
    5000,
    jsonb_build_object('gems', 80, 'itemId', 'card_neon_circuit'),
    jsonb_build_object('seasonKey', 'season-1'),
    true
  ),
  (
    'sq_master_finish',
    'seasonal',
    'Finish Master or Higher',
    'End the season at Master, Grandmaster, or Legend for the season banner track.',
    'reach_rank_points',
    3200,
    jsonb_build_object('shards', 180, 'itemId', 'banner_season1_neon_rivals'),
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
