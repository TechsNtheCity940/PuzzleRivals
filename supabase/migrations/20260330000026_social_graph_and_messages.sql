create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.direct_threads (
  id uuid primary key default gen_random_uuid(),
  pair_key text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.direct_thread_members (
  thread_id uuid not null references public.direct_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  last_read_at timestamptz,
  primary key (thread_id, user_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.direct_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  message text,
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (sender_id <> receiver_id)
);

create table if not exists public.friendships (
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid references public.direct_threads(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create index if not exists idx_user_presence_last_seen_at
  on public.user_presence(last_seen_at desc);

create index if not exists idx_direct_thread_members_user_id
  on public.direct_thread_members(user_id, thread_id);

create index if not exists idx_direct_messages_thread_created_at
  on public.direct_messages(thread_id, created_at desc);

create index if not exists idx_friend_requests_receiver_status_created_at
  on public.friend_requests(receiver_id, status, created_at desc);

create index if not exists idx_friend_requests_sender_status_created_at
  on public.friend_requests(sender_id, status, created_at desc);

create unique index if not exists idx_friend_requests_pending_pair
  on public.friend_requests(
    least(sender_id::text, receiver_id::text),
    greatest(sender_id::text, receiver_id::text)
  )
  where status = 'pending';

create index if not exists idx_friendships_friend_id
  on public.friendships(friend_id);

drop trigger if exists set_user_presence_updated_at on public.user_presence;
create trigger set_user_presence_updated_at
before update on public.user_presence
for each row execute procedure public.handle_updated_at();

drop trigger if exists set_direct_threads_updated_at on public.direct_threads;
create trigger set_direct_threads_updated_at
before update on public.direct_threads
for each row execute procedure public.handle_updated_at();

drop trigger if exists set_friend_requests_updated_at on public.friend_requests;
create trigger set_friend_requests_updated_at
before update on public.friend_requests
for each row execute procedure public.handle_updated_at();

create or replace function public.build_direct_pair_key(p_user_a uuid, p_user_b uuid)
returns text
language sql
immutable
as $$
  select case
    when p_user_a::text < p_user_b::text then p_user_a::text || ':' || p_user_b::text
    else p_user_b::text || ':' || p_user_a::text
  end;
$$;

create or replace function public.ensure_direct_thread(p_user_a uuid, p_user_b uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_pair_key text;
  v_thread_id uuid;
begin
  if p_user_a is null or p_user_b is null then
    raise exception 'Both users are required to open a direct thread.';
  end if;

  if p_user_a = p_user_b then
    raise exception 'Direct threads require two different users.';
  end if;

  if v_caller is null or (v_caller <> p_user_a and v_caller <> p_user_b) then
    raise exception 'You can only open direct threads that include your own profile.';
  end if;

  v_pair_key := public.build_direct_pair_key(p_user_a, p_user_b);

  insert into public.direct_threads (pair_key)
  values (v_pair_key)
  on conflict (pair_key) do nothing
  returning id into v_thread_id;

  if v_thread_id is null then
    select id
    into v_thread_id
    from public.direct_threads
    where pair_key = v_pair_key;
  end if;

  insert into public.direct_thread_members (thread_id, user_id, last_read_at)
  values
    (v_thread_id, p_user_a, timezone('utc', now())),
    (v_thread_id, p_user_b, timezone('utc', now()))
  on conflict (thread_id, user_id) do nothing;

  return v_thread_id;
end;
$$;

create or replace function public.remove_friend(p_friend_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'You must be signed in to remove a friend.';
  end if;

  delete from public.friendships
  where (user_id = v_user_id and friend_id = p_friend_id)
     or (user_id = p_friend_id and friend_id = v_user_id);

  update public.friend_requests
  set status = 'cancelled',
      responded_at = coalesce(responded_at, timezone('utc', now()))
  where status = 'pending'
    and (
      (sender_id = v_user_id and receiver_id = p_friend_id)
      or (sender_id = p_friend_id and receiver_id = v_user_id)
    );
end;
$$;

create or replace function public.touch_direct_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.direct_threads
  set updated_at = timezone('utc', now())
  where id = new.thread_id;

  update public.direct_thread_members
  set last_read_at = timezone('utc', now())
  where thread_id = new.thread_id
    and user_id = new.sender_id;

  return new;
end;
$$;

create or replace function public.handle_friend_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread_id uuid;
  v_effective_created_at timestamptz;
begin
  if new.status is distinct from old.status and new.status <> 'pending' then
    new.responded_at := coalesce(new.responded_at, timezone('utc', now()));
  end if;

  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    v_thread_id := public.ensure_direct_thread(new.sender_id, new.receiver_id);
    v_effective_created_at := coalesce(new.responded_at, timezone('utc', now()));

    insert into public.friendships (user_id, friend_id, thread_id, created_at)
    values
      (new.sender_id, new.receiver_id, v_thread_id, v_effective_created_at),
      (new.receiver_id, new.sender_id, v_thread_id, v_effective_created_at)
    on conflict (user_id, friend_id) do update
      set thread_id = excluded.thread_id;
  end if;

  return new;
end;
$$;

drop trigger if exists set_direct_threads_on_message on public.direct_messages;
create trigger set_direct_threads_on_message
after insert on public.direct_messages
for each row execute procedure public.touch_direct_thread_on_message();

drop trigger if exists handle_friend_request_status_change on public.friend_requests;
create trigger handle_friend_request_status_change
before update on public.friend_requests
for each row execute procedure public.handle_friend_request_status_change();

alter table public.user_presence enable row level security;
alter table public.direct_threads enable row level security;
alter table public.direct_thread_members enable row level security;
alter table public.direct_messages enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

drop policy if exists "user presence is readable by authenticated users" on public.user_presence;
create policy "user presence is readable by authenticated users"
on public.user_presence
for select
to authenticated
using (true);

drop policy if exists "user presence is insertable by owner" on public.user_presence;
create policy "user presence is insertable by owner"
on public.user_presence
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user presence is updatable by owner" on public.user_presence;
create policy "user presence is updatable by owner"
on public.user_presence
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "direct threads are readable by members" on public.direct_threads;
create policy "direct threads are readable by members"
on public.direct_threads
for select
to authenticated
using (
  exists (
    select 1
    from public.direct_thread_members members
    where members.thread_id = direct_threads.id
      and members.user_id = auth.uid()
  )
);

drop policy if exists "direct thread members are readable by members" on public.direct_thread_members;
create policy "direct thread members are readable by members"
on public.direct_thread_members
for select
to authenticated
using (
  exists (
    select 1
    from public.direct_thread_members members
    where members.thread_id = direct_thread_members.thread_id
      and members.user_id = auth.uid()
  )
);

drop policy if exists "direct thread members are updatable by owner" on public.direct_thread_members;
create policy "direct thread members are updatable by owner"
on public.direct_thread_members
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "direct messages are readable by members" on public.direct_messages;
create policy "direct messages are readable by members"
on public.direct_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.direct_thread_members members
    where members.thread_id = direct_messages.thread_id
      and members.user_id = auth.uid()
  )
);

drop policy if exists "direct messages are insertable by members" on public.direct_messages;
create policy "direct messages are insertable by members"
on public.direct_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.direct_thread_members members
    where members.thread_id = direct_messages.thread_id
      and members.user_id = auth.uid()
  )
);

drop policy if exists "friend requests are readable by participants" on public.friend_requests;
create policy "friend requests are readable by participants"
on public.friend_requests
for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "friend requests are insertable by sender" on public.friend_requests;
create policy "friend requests are insertable by sender"
on public.friend_requests
for insert
to authenticated
with check (auth.uid() = sender_id and sender_id <> receiver_id);

drop policy if exists "friend requests are updatable by participants" on public.friend_requests;
create policy "friend requests are updatable by participants"
on public.friend_requests
for update
to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id)
with check (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "friendships are readable by owner" on public.friendships;
create policy "friendships are readable by owner"
on public.friendships
for select
to authenticated
using (auth.uid() = user_id);

grant execute on function public.ensure_direct_thread(uuid, uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;