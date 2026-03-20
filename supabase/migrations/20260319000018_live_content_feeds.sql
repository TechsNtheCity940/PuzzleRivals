create table if not exists public.daily_challenges (
  id text primary key,
  challenge_date date not null,
  puzzle_type text not null,
  puzzle_seed bigint not null,
  difficulty integer not null check (difficulty between 1 and 5),
  time_limit integer not null check (time_limit > 0),
  grid_size integer not null check (grid_size > 0),
  title text not null,
  description text not null,
  reward_json jsonb not null default '{}'::jsonb,
  completed_by integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tournaments (
  id text primary key,
  name text not null,
  puzzle_type text not null,
  entry_fee integer not null default 0,
  prize_pool integer not null default 0,
  max_players integer not null default 0,
  current_players integer not null default 0,
  starts_at timestamptz not null,
  status text not null check (status in ('upcoming', 'live', 'completed')),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.seasons (
  id text primary key,
  name text not null,
  season_number integer not null,
  starts_at date not null,
  ends_at date not null,
  current_tier integer not null default 1,
  max_tier integer not null default 40,
  is_premium boolean not null default false,
  tracks_json jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.puzzle_catalog (
  type text primary key,
  sort_order integer not null default 0,
  label text not null,
  icon text not null,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_daily_challenges_updated_at on public.daily_challenges;
create trigger set_daily_challenges_updated_at
before update on public.daily_challenges
for each row execute procedure public.handle_updated_at();

drop trigger if exists set_tournaments_updated_at on public.tournaments;
create trigger set_tournaments_updated_at
before update on public.tournaments
for each row execute procedure public.handle_updated_at();

drop trigger if exists set_seasons_updated_at on public.seasons;
create trigger set_seasons_updated_at
before update on public.seasons
for each row execute procedure public.handle_updated_at();

drop trigger if exists set_puzzle_catalog_updated_at on public.puzzle_catalog;
create trigger set_puzzle_catalog_updated_at
before update on public.puzzle_catalog
for each row execute procedure public.handle_updated_at();

create index if not exists idx_daily_challenges_active_date
  on public.daily_challenges(active, challenge_date desc);

create index if not exists idx_tournaments_active_status_starts_at
  on public.tournaments(active, status, starts_at desc);

create index if not exists idx_seasons_active_number
  on public.seasons(active, season_number desc);

alter table public.daily_challenges enable row level security;
alter table public.tournaments enable row level security;
alter table public.seasons enable row level security;
alter table public.puzzle_catalog enable row level security;

drop policy if exists "daily challenges are readable by clients" on public.daily_challenges;
create policy "daily challenges are readable by clients"
on public.daily_challenges
for select
to anon, authenticated
using (active = true);

drop policy if exists "tournaments are readable by clients" on public.tournaments;
create policy "tournaments are readable by clients"
on public.tournaments
for select
to anon, authenticated
using (active = true);

drop policy if exists "seasons are readable by clients" on public.seasons;
create policy "seasons are readable by clients"
on public.seasons
for select
to anon, authenticated
using (active = true);

drop policy if exists "puzzle catalog is readable by clients" on public.puzzle_catalog;
create policy "puzzle catalog is readable by clients"
on public.puzzle_catalog
for select
to anon, authenticated
using (active = true);

insert into public.puzzle_catalog (type, sort_order, label, icon, description, active)
values
  ('rotate_pipes', 1, 'Pipe Flow', 'Wrench', 'Rotate pipe tiles to connect the flow', true),
  ('number_grid', 2, 'Number Crunch', '123', 'Fill the grid with correct sums', true),
  ('pattern_match', 3, 'Pattern Eye', 'Eye', 'Find the matching pattern', true),
  ('word_scramble', 4, 'Word Blitz', 'ABC', 'Unscramble the letters', true),
  ('crossword_mini', 5, 'Crossword Clash', 'Clue', 'Solve clue-based mini crossword entries', true),
  ('tile_slide', 6, 'Tile Shift', 'Tile', 'Slide tiles into position', true),
  ('sudoku_mini', 7, 'Sudoku Sprint', 'Grid', '4x4 speed sudoku', true),
  ('word_search', 8, 'Word Hunt', 'Search', 'Find hidden words', true),
  ('matching_pairs', 9, 'Match Maker', 'Link', 'Match terms with their paired clue or meaning', true),
  ('spatial_reasoning', 10, 'Spatial Spin', 'Shape', 'Pick the rotated or mirrored shape that fits', true),
  ('maze', 11, 'Maze Rush', 'Maze', 'Navigate the maze fastest', true),
  ('pathfinder', 12, 'Pathfinder', 'Route', 'Trace the valid route through a blocked grid', true),
  ('memory_grid', 13, 'Memory Flash', 'Brain', 'Remember the pattern', true),
  ('riddle_choice', 14, 'Riddle Relay', 'Riddle', 'Solve rapid-fire riddles with multiple-choice answers', true),
  ('wordle_guess', 15, 'Word Strike', 'Word', 'Guess the hidden five-letter word using color feedback', true),
  ('chess_tactic', 16, 'Chess Shot', 'Knight', 'Pick the best tactical move from a chess position', true),
  ('checkers_tactic', 17, 'Checkers Trap', 'Checkers', 'Choose the strongest capture in a checkers setup', true),
  ('logic_sequence', 18, 'Logic Sequence', 'Sequence', 'Find the next term in a number or symbol pattern', true),
  ('trivia_blitz', 19, 'Trivia Blitz', 'Trivia', 'Rapid-fire general knowledge questions', true),
  ('geography_quiz', 20, 'Geo Sprint', 'Globe', 'Capitals, flags, and world geography', true),
  ('science_quiz', 21, 'Science Snap', 'Science', 'Quick science and technology questions', true),
  ('math_race', 22, 'Math Race', 'Math', 'Mental arithmetic and fast numeric logic', true),
  ('code_breaker', 23, 'Code Breaker', 'Code', 'Crack the right code from number clues', true),
  ('analogies', 24, 'Analogy Ace', 'Analogy', 'Match relationships between ideas and words', true),
  ('deduction_grid', 25, 'Deduction Grid', 'Deduction', 'Choose the clue that completes a logic grid', true),
  ('chess_endgame', 26, 'Chess Endgame', 'Rook', 'Find the winning plan in an endgame', true),
  ('chess_opening', 27, 'Chess Opening', 'Bishop', 'Choose the principled opening continuation', true),
  ('chess_mate_net', 28, 'Mate Net', 'Queen', 'Spot the move that spins a mating net', true),
  ('vocabulary_duel', 29, 'Vocab Duel', 'Book', 'Pick the strongest synonym or definition', true)
on conflict (type) do update set
  sort_order = excluded.sort_order,
  label = excluded.label,
  icon = excluded.icon,
  description = excluded.description,
  active = excluded.active;
insert into public.daily_challenges (
  id,
  challenge_date,
  puzzle_type,
  puzzle_seed,
  difficulty,
  time_limit,
  grid_size,
  title,
  description,
  reward_json,
  completed_by,
  active
)
values
  (
    'dc_1',
    '2026-03-11',
    'rotate_pipes',
    31126,
    3,
    90,
    5,
    'The 1% Puzzle',
    'Only 1% of players solve this pipe puzzle. Are you elite?',
    jsonb_build_object('xp', 500, 'coins', 2000, 'gems', 10),
    142,
    true
  ),
  (
    'dc_2',
    '2026-03-11',
    'memory_grid',
    31127,
    2,
    60,
    4,
    'Memory Streak',
    '3-day streak bonus active!',
    jsonb_build_object('xp', 300, 'coins', 800),
    1240,
    true
  )
on conflict (id) do update set
  challenge_date = excluded.challenge_date,
  puzzle_type = excluded.puzzle_type,
  puzzle_seed = excluded.puzzle_seed,
  difficulty = excluded.difficulty,
  time_limit = excluded.time_limit,
  grid_size = excluded.grid_size,
  title = excluded.title,
  description = excluded.description,
  reward_json = excluded.reward_json,
  completed_by = excluded.completed_by,
  active = excluded.active;

insert into public.tournaments (
  id,
  name,
  puzzle_type,
  entry_fee,
  prize_pool,
  max_players,
  current_players,
  starts_at,
  status,
  active
)
values
  ('t_1', 'Pipe Masters Open', 'rotate_pipes', 500, 15000, 64, 48, '2026-03-12T18:00:00Z', 'upcoming', true),
  ('t_2', 'Speed Grid Championship', 'number_grid', 1000, 30000, 32, 32, '2026-03-11T14:00:00Z', 'live', true),
  ('t_3', 'Pattern Blitz Weekly', 'pattern_match', 200, 5000, 128, 91, '2026-03-14T20:00:00Z', 'upcoming', true),
  ('t_4', 'Word War Invitational', 'word_scramble', 0, 8000, 256, 256, '2026-03-10T12:00:00Z', 'completed', true)
on conflict (id) do update set
  name = excluded.name,
  puzzle_type = excluded.puzzle_type,
  entry_fee = excluded.entry_fee,
  prize_pool = excluded.prize_pool,
  max_players = excluded.max_players,
  current_players = excluded.current_players,
  starts_at = excluded.starts_at,
  status = excluded.status,
  active = excluded.active;

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
  'season_11',
  'Echoes of Logic',
  11,
  '2026-02-01',
  '2026-04-30',
  14,
  40,
  false,
  (
    select jsonb_agg(
      jsonb_build_object(
        'tier', tier,
        'freeReward',
          case
            when (tier - 1) % 3 = 0 then jsonb_build_object(
              'type', 'coins',
              'amount', 500 * tier,
              'label', (500 * tier)::text || ' Coins'
            )
            when (tier - 1) % 3 = 1 then jsonb_build_object(
              'type', 'pass_xp',
              'amount', 180 * tier,
              'label', (180 * tier)::text || ' Pass XP'
            )
            when (tier - 1) % 5 = 0 then jsonb_build_object(
              'type', 'shards',
              'amount', 30 * tier,
              'label', (30 * tier)::text || ' Shards'
            )
            else null
          end,
        'premiumReward',
          case
            when (tier - 1) % 5 = 0 then jsonb_build_object(
              'type', 'item',
              'itemId', 's_' || (((tier + 9) % 20) + 1)::text,
              'label', 'Exclusive Item'
            )
            when (tier - 1) % 4 = 0 then jsonb_build_object(
              'type', 'shards',
              'amount', tier * 20,
              'label', (tier * 20)::text || ' Shards'
            )
            when (tier - 1) % 2 = 0 then jsonb_build_object(
              'type', 'gems',
              'amount', tier * 100,
              'label', (tier * 100)::text || ' Gems'
            )
            else jsonb_build_object(
              'type', 'coins',
              'amount', tier * 100,
              'label', (tier * 100)::text || ' Coins'
            )
          end,
        'isUnlocked', tier < 15
      )
      order by tier
    )
    from generate_series(1, 40) as tier
  ),
  jsonb_build_object('seasonKey', 'season-11', 'premiumProductId', 's_6'),
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
  active = excluded.active;
