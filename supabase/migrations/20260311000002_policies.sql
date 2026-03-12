alter table public.profiles enable row level security;
alter table public.player_stats enable row level security;
alter table public.queue_entries enable row level security;
alter table public.lobbies enable row level security;
alter table public.lobby_players enable row level security;
alter table public.rounds enable row level security;
alter table public.round_results enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.paypal_webhook_events enable row level security;

create policy "profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles are updatable by owner"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "player stats are readable by owner"
on public.player_stats
for select
to authenticated
using (auth.uid() = user_id);

create policy "queue entries are readable by owner"
on public.queue_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "queue entries are writable by owner"
on public.queue_entries
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "lobbies are readable by members"
on public.lobbies
for select
to authenticated
using (
  exists (
    select 1
    from public.lobby_players lp
    where lp.lobby_id = lobbies.id
      and lp.user_id = auth.uid()
      and lp.left_at is null
  )
);

create policy "lobby players are readable by members"
on public.lobby_players
for select
to authenticated
using (
  exists (
    select 1
    from public.lobby_players lp
    where lp.lobby_id = lobby_players.lobby_id
      and lp.user_id = auth.uid()
      and lp.left_at is null
  )
);

create policy "rounds are readable by lobby members"
on public.rounds
for select
to authenticated
using (
  exists (
    select 1
    from public.lobby_players lp
    where lp.lobby_id = rounds.lobby_id
      and lp.user_id = auth.uid()
      and lp.left_at is null
  )
);

create policy "round results are readable by owner"
on public.round_results
for select
to authenticated
using (auth.uid() = user_id);

create policy "products are readable by authenticated users"
on public.products
for select
to authenticated
using (active = true);

create policy "purchases are readable by owner"
on public.purchases
for select
to authenticated
using (auth.uid() = user_id);

create policy "purchase items are readable by purchase owner"
on public.purchase_items
for select
to authenticated
using (
  exists (
    select 1
    from public.purchases p
    where p.id = purchase_items.purchase_id
      and p.user_id = auth.uid()
  )
);

create policy "webhook events are never readable by clients"
on public.paypal_webhook_events
for select
to authenticated
using (false);
