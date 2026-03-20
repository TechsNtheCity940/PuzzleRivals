drop policy if exists "profiles are readable by authenticated users" on public.profiles;
drop policy if exists "profiles are readable by clients" on public.profiles;
create policy "profiles are readable by clients"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "player stats are readable by owner" on public.player_stats;
drop policy if exists "player stats are readable by clients" on public.player_stats;
create policy "player stats are readable by clients"
on public.player_stats
for select
to anon, authenticated
using (true);
