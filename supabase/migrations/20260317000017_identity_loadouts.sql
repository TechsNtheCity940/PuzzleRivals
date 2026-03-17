alter table public.profiles
  add column if not exists player_card_id text references public.products(id),
  add column if not exists banner_id text references public.products(id),
  add column if not exists emblem_id text references public.products(id),
  add column if not exists title_id text references public.products(id);
