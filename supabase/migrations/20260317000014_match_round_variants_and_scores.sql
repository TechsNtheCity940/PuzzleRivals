alter table public.round_results
  add column if not exists live_completions integer not null default 0,
  add column if not exists live_score integer not null default 0,
  add column if not exists best_solve_ms integer,
  add column if not exists current_live_seed bigint,
  add column if not exists current_variant_started_at_ms integer not null default 0;
