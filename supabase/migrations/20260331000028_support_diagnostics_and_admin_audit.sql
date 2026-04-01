alter table public.support_tickets
  add column if not exists client_context jsonb not null default '{}'::jsonb;

create table if not exists public.owner_admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_ticket_id uuid references public.support_tickets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_owner_admin_audit_log_created_at
  on public.owner_admin_audit_log(created_at desc);

create index if not exists idx_owner_admin_audit_log_actor_user_id
  on public.owner_admin_audit_log(actor_user_id, created_at desc);

create index if not exists idx_owner_admin_audit_log_target_user_id
  on public.owner_admin_audit_log(target_user_id, created_at desc);

create index if not exists idx_owner_admin_audit_log_target_ticket_id
  on public.owner_admin_audit_log(target_ticket_id, created_at desc);

alter table public.owner_admin_audit_log enable row level security;

grant select on public.owner_admin_audit_log to authenticated;

drop policy if exists "owner admin audit is readable by owner admin" on public.owner_admin_audit_log;
create policy "owner admin audit is readable by owner admin"
on public.owner_admin_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.app_role in ('owner', 'admin')
  )
);
