create table if not exists public.profile_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('match', 'purchase', 'social')),
  source_type text not null,
  source_key text not null,
  label text not null,
  title text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, source_type, source_key)
);

create index if not exists idx_profile_activity_events_user_occurred_at
  on public.profile_activity_events(user_id, occurred_at desc);

create index if not exists idx_profile_activity_events_user_is_read
  on public.profile_activity_events(user_id, is_read, occurred_at desc);

alter table public.profile_activity_events enable row level security;

drop policy if exists "profile activity events are readable by owner" on public.profile_activity_events;
create policy "profile activity events are readable by owner"
on public.profile_activity_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "profile activity events are updatable by owner" on public.profile_activity_events;
create policy "profile activity events are updatable by owner"
on public.profile_activity_events
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists set_profile_activity_events_updated_at on public.profile_activity_events;
create trigger set_profile_activity_events_updated_at
before update on public.profile_activity_events
for each row execute procedure public.handle_updated_at();

create or replace function public.sync_profile_social_activity_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.facebook_handle is distinct from old.facebook_handle
    and nullif(btrim(coalesce(new.facebook_handle, '')), '') is not null then
    insert into public.profile_activity_events (
      user_id,
      event_type,
      source_type,
      source_key,
      label,
      title,
      description,
      metadata,
      occurred_at,
      is_read
    ) values (
      new.id,
      'social',
      'social_link',
      'facebook:' || btrim(new.facebook_handle),
      'Social',
      'Facebook identity linked',
      btrim(new.facebook_handle) || ' is visible in your live rival profile.',
      jsonb_build_object('platform', 'facebook', 'handle', btrim(new.facebook_handle)),
      coalesce(new.updated_at, timezone('utc', now())),
      false
    )
    on conflict (user_id, source_type, source_key) do update set
      label = excluded.label,
      title = excluded.title,
      description = excluded.description,
      metadata = excluded.metadata,
      occurred_at = excluded.occurred_at,
      is_read = false;
  end if;

  if new.tiktok_handle is distinct from old.tiktok_handle
    and nullif(btrim(coalesce(new.tiktok_handle, '')), '') is not null then
    insert into public.profile_activity_events (
      user_id,
      event_type,
      source_type,
      source_key,
      label,
      title,
      description,
      metadata,
      occurred_at,
      is_read
    ) values (
      new.id,
      'social',
      'social_link',
      'tiktok:' || btrim(new.tiktok_handle),
      'Social',
      'TikTok identity linked',
      btrim(new.tiktok_handle) || ' is visible in your live rival profile.',
      jsonb_build_object('platform', 'tiktok', 'handle', btrim(new.tiktok_handle)),
      coalesce(new.updated_at, timezone('utc', now())),
      false
    )
    on conflict (user_id, source_type, source_key) do update set
      label = excluded.label,
      title = excluded.title,
      description = excluded.description,
      metadata = excluded.metadata,
      occurred_at = excluded.occurred_at,
      is_read = false;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_profile_social_activity_events on public.profiles;
create trigger sync_profile_social_activity_events
after update on public.profiles
for each row execute procedure public.sync_profile_social_activity_events();
