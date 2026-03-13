alter table public.profiles
  add column if not exists theme_id text,
  add column if not exists frame_id text,
  add column if not exists hint_balance integer not null default 0,
  add column if not exists has_season_pass boolean not null default false,
  add column if not exists vip_expires_at timestamptz;

create table if not exists public.user_inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  is_equipped boolean not null default false,
  source text not null default 'purchase',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, product_id)
);

drop trigger if exists set_user_inventory_updated_at on public.user_inventory;
create trigger set_user_inventory_updated_at
before update on public.user_inventory
for each row execute procedure public.handle_updated_at();

alter table public.user_inventory enable row level security;

drop policy if exists "inventory is readable by owner" on public.user_inventory;
create policy "inventory is readable by owner"
on public.user_inventory
for select
to authenticated
using (auth.uid() = user_id);

insert into public.products (id, kind, price_usd, price_coins, price_gems, active, metadata)
values
  (
    's_1',
    'theme',
    null,
    null,
    120,
    true,
    jsonb_build_object(
      'name', 'Neon Circuit',
      'description', 'Electrified puzzle theme with glowing grid lines',
      'category', 'theme',
      'rarity', 3,
      'featured', true
    )
  ),
  (
    's_2',
    'frame',
    null,
    null,
    250,
    true,
    jsonb_build_object(
      'name', 'Void Frame',
      'description', 'A frame forged in the absence of light',
      'category', 'frame',
      'rarity', 4
    )
  ),
  (
    's_3',
    'avatar',
    null,
    5000,
    null,
    true,
    jsonb_build_object(
      'name', 'Geometric Avatar Pack',
      'description', '6 abstract geometric avatars',
      'category', 'avatar',
      'rarity', 2
    )
  ),
  (
    's_4',
    'hint_pack',
    null,
    2000,
    null,
    true,
    jsonb_build_object(
      'name', 'Hint Pack x10',
      'description', '10 puzzle hints for when you need an edge',
      'category', 'hint_pack',
      'rarity', 1,
      'hint_amount', 10
    )
  ),
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
      'rarity', 3
    )
  ),
  (
    's_7',
    'theme',
    null,
    null,
    80,
    true,
    jsonb_build_object(
      'name', 'Obsidian Skin',
      'description', 'Dark-on-dark puzzle board aesthetic',
      'category', 'theme',
      'rarity', 2
    )
  ),
  (
    's_8',
    'theme',
    null,
    3000,
    null,
    true,
    jsonb_build_object(
      'name', 'Minimalist Lines',
      'description', 'Ultra-clean wireframe theme',
      'category', 'theme',
      'rarity', 1
    )
  ),
  (
    's_9',
    'frame',
    null,
    null,
    180,
    true,
    jsonb_build_object(
      'name', 'Diamond Edge Frame',
      'description', 'Cut with precision, earned with skill',
      'category', 'frame',
      'rarity', 3
    )
  ),
  (
    's_10',
    'hint_pack',
    null,
    null,
    60,
    true,
    jsonb_build_object(
      'name', 'Pro Hint Pack x25',
      'description', '25 hints + bonus solve time',
      'category', 'hint_pack',
      'rarity', 2,
      'hint_amount', 25
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
      'description', 'Monthly VIP access with bonus gems and perks',
      'category', 'bundle',
      'rarity', 4,
      'vip_duration_days', 30,
      'vip_bonus_gems', 500
    )
  )
on conflict (id) do update set
  kind = excluded.kind,
  price_usd = excluded.price_usd,
  price_coins = excluded.price_coins,
  price_gems = excluded.price_gems,
  active = excluded.active,
  metadata = excluded.metadata;
