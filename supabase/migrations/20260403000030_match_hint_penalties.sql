alter table public.round_results
  add column if not exists live_score_raw integer not null default 0,
  add column if not exists hint_uses integer not null default 0,
  add column if not exists hint_penalty_total integer not null default 0,
  add column if not exists next_hint_available_at timestamptz;

update public.round_results
set live_score_raw = greatest(coalesce(live_score_raw, 0), coalesce(live_score, 0));
