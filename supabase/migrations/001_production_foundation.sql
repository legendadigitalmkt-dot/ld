-- LD Growth OS — Production Foundation
-- Multi-tenant schema, explicit grants, hardened RLS and tenant integrity.
-- Target: a NEW Supabase project.

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.member_role as enum ('owner','admin','sales','support','viewer');
create type public.contact_status as enum ('lead','customer','inactive');
create type public.deal_stage as enum ('new','contacted','qualified','proposal','negotiation','won','lost');
create type public.task_status as enum ('open','done');
create type public.task_priority as enum ('low','medium','high');
create type public.message_direction as enum ('in','out');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  segment text,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

-- Helpers live outside the exposed API schema. Every SECURITY DEFINER function
-- pins an empty search_path and schema-qualifies object names.
create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function private.workspace_role(target_workspace uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = target_workspace
    and wm.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function private.can_edit_workspace(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.workspace_role(target_workspace) in ('owner','admin','sales','support'), false);
$$;

create or replace function private.is_workspace_admin(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.workspace_role(target_workspace) in ('owner','admin'), false);
$$;

create or replace function private.workspace_has_user(target_workspace uuid, target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user is null or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = target_workspace and wm.user_id = target_user
  );
$$;

create or replace function private.shares_workspace_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = target_user
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public, anon;
revoke all on function private.workspace_role(uuid) from public, anon;
revoke all on function private.can_edit_workspace(uuid) from public, anon;
revoke all on function private.is_workspace_admin(uuid) from public, anon;
revoke all on function private.workspace_has_user(uuid, uuid) from public, anon;
revoke all on function private.shares_workspace_with(uuid) from public, anon;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.workspace_role(uuid) to authenticated;
grant execute on function private.can_edit_workspace(uuid) to authenticated;
grant execute on function private.is_workspace_admin(uuid) to authenticated;
grant execute on function private.workspace_has_user(uuid, uuid) to authenticated;
grant execute on function private.shares_workspace_with(uuid) to authenticated;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  phone text,
  email text,
  source text not null default 'Manual',
  status public.contact_status not null default 'lead',
  tags text[] not null default '{}',
  owner_user_id uuid references auth.users(id) on delete set null,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, workspace_id),
  constraint contacts_owner_must_be_member check (owner_user_id is null or private.workspace_has_user(workspace_id, owner_user_id))
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null,
  title text not null,
  stage public.deal_stage not null default 'new',
  value numeric(14,2) not null default 0 check (value >= 0),
  probability smallint not null default 20 check (probability between 0 and 100),
  owner_user_id uuid references auth.users(id) on delete set null,
  last_activity_at timestamptz not null default now(),
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, workspace_id),
  constraint deals_contact_same_workspace foreign key (contact_id, workspace_id) references public.contacts(id, workspace_id) on delete cascade,
  constraint deals_owner_must_be_member check (owner_user_id is null or private.workspace_has_user(workspace_id, owner_user_id))
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  contact_id uuid,
  deal_id uuid,
  assignee_user_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  status public.task_status not null default 'open',
  priority public.task_priority not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_contact_same_workspace foreign key (contact_id, workspace_id) references public.contacts(id, workspace_id) on delete cascade,
  constraint tasks_deal_same_workspace foreign key (deal_id, workspace_id) references public.deals(id, workspace_id) on delete cascade,
  constraint tasks_assignee_must_be_member check (assignee_user_id is null or private.workspace_has_user(workspace_id, assignee_user_id))
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null,
  channel text not null check (channel in ('whatsapp','instagram','webchat','email','manual')),
  external_thread_id text,
  status text not null default 'open' check (status in ('open','closed')),
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, workspace_id),
  unique(workspace_id, channel, external_thread_id),
  constraint conversations_contact_same_workspace foreign key (contact_id, workspace_id) references public.contacts(id, workspace_id) on delete cascade
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null,
  direction public.message_direction not null,
  author_name text,
  body text not null check (char_length(body) between 1 and 20000),
  external_message_id text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint messages_conversation_same_workspace foreign key (conversation_id, workspace_id) references public.conversations(id, workspace_id) on delete cascade
);

create unique index messages_external_id_unique on public.messages(workspace_id, external_message_id) where external_message_id is not null;

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  category text not null default 'general',
  content text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_creator_must_be_member check (created_by is null or private.workspace_has_user(workspace_id, created_by))
);

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  condition_json jsonb not null default '{}'::jsonb,
  action_type text not null,
  action_json jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  run_count bigint not null default 0,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  type text not null,
  text text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activities_actor_must_be_member check (actor_user_id is null or private.workspace_has_user(workspace_id, actor_user_id))
);

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  external_account_id text,
  status text not null default 'pending' check (status in ('pending','connected','error','disabled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, provider, external_account_id)
);

-- Invitation metadata only. The actual acceptance mutation is server-side with service role.
create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'viewer',
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint invite_sender_must_be_member check (private.workspace_has_user(workspace_id, invited_by))
);

create index workspace_members_user_idx on public.workspace_members(user_id, created_at);
create index contacts_workspace_created_idx on public.contacts(workspace_id, created_at desc);
create index contacts_workspace_phone_idx on public.contacts(workspace_id, phone);
create index deals_workspace_stage_idx on public.deals(workspace_id, stage, updated_at desc);
create index deals_contact_idx on public.deals(contact_id);
create index tasks_workspace_status_due_idx on public.tasks(workspace_id, status, due_at);
create index conversations_workspace_last_idx on public.conversations(workspace_id, last_message_at desc);
create index messages_conversation_sent_idx on public.messages(conversation_id, sent_at);
create index knowledge_workspace_idx on public.knowledge_entries(workspace_id, updated_at desc);
create index activities_workspace_created_idx on public.activities(workspace_id, created_at desc);
create index invites_workspace_email_idx on public.workspace_invites(workspace_id, lower(email));

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_updated_at before update on public.workspaces for each row execute function private.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger contacts_updated_at before update on public.contacts for each row execute function private.set_updated_at();
create trigger deals_updated_at before update on public.deals for each row execute function private.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function private.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute function private.set_updated_at();
create trigger knowledge_updated_at before update on public.knowledge_entries for each row execute function private.set_updated_at();
create trigger automations_updated_at before update on public.automations for each row execute function private.set_updated_at();
create trigger integrations_updated_at before update on public.integration_connections for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

-- Explicit least-privilege grants. RLS is the second authorization boundary.
revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, update, delete on public.deals to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert, update, delete on public.knowledge_entries to authenticated;
grant select, insert, update, delete on public.automations to authenticated;
grant select, insert on public.activities to authenticated;
grant select on public.integration_connections to authenticated;
grant select on public.workspace_invites to authenticated;

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_entries enable row level security;
alter table public.automations enable row level security;
alter table public.activities enable row level security;
alter table public.integration_connections enable row level security;
alter table public.workspace_invites enable row level security;

create policy "profiles read self or teammate" on public.profiles
for select to authenticated
using ((select auth.uid()) = id or (select private.shares_workspace_with(id)));
create policy "profiles update own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "members view workspace" on public.workspaces
for select to authenticated
using ((select private.is_workspace_member(id)));
create policy "admins update workspace" on public.workspaces
for update to authenticated
using ((select private.is_workspace_admin(id)))
with check ((select private.is_workspace_admin(id)));

create policy "members view memberships" on public.workspace_members
for select to authenticated
using ((select private.is_workspace_member(workspace_id)));

create policy "members read contacts" on public.contacts for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "editors insert contacts" on public.contacts for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)));
create policy "editors update contacts" on public.contacts for update to authenticated using ((select private.can_edit_workspace(workspace_id))) with check ((select private.can_edit_workspace(workspace_id)));
create policy "admins delete contacts" on public.contacts for delete to authenticated using ((select private.is_workspace_admin(workspace_id)));

create policy "members read deals" on public.deals for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "editors insert deals" on public.deals for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)));
create policy "editors update deals" on public.deals for update to authenticated using ((select private.can_edit_workspace(workspace_id))) with check ((select private.can_edit_workspace(workspace_id)));
create policy "admins delete deals" on public.deals for delete to authenticated using ((select private.is_workspace_admin(workspace_id)));

create policy "members read tasks" on public.tasks for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "editors insert tasks" on public.tasks for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)));
create policy "editors update tasks" on public.tasks for update to authenticated using ((select private.can_edit_workspace(workspace_id))) with check ((select private.can_edit_workspace(workspace_id)));
create policy "editors delete tasks" on public.tasks for delete to authenticated using ((select private.can_edit_workspace(workspace_id)));

create policy "members read conversations" on public.conversations for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "editors insert conversations" on public.conversations for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)));
create policy "editors update conversations" on public.conversations for update to authenticated using ((select private.can_edit_workspace(workspace_id))) with check ((select private.can_edit_workspace(workspace_id)));

create policy "members read messages" on public.messages for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "editors send outbound messages" on public.messages for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)) and direction = 'out');

create policy "members read knowledge" on public.knowledge_entries for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "editors insert knowledge" on public.knowledge_entries for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)));
create policy "editors update knowledge" on public.knowledge_entries for update to authenticated using ((select private.can_edit_workspace(workspace_id))) with check ((select private.can_edit_workspace(workspace_id)));
create policy "admins delete knowledge" on public.knowledge_entries for delete to authenticated using ((select private.is_workspace_admin(workspace_id)));

create policy "members read automations" on public.automations for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "admins insert automations" on public.automations for insert to authenticated with check ((select private.is_workspace_admin(workspace_id)));
create policy "admins update automations" on public.automations for update to authenticated using ((select private.is_workspace_admin(workspace_id))) with check ((select private.is_workspace_admin(workspace_id)));
create policy "admins delete automations" on public.automations for delete to authenticated using ((select private.is_workspace_admin(workspace_id)));

create policy "members read activities" on public.activities for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "editors insert own activities" on public.activities for insert to authenticated with check (
  (select private.can_edit_workspace(workspace_id)) and (actor_user_id is null or actor_user_id = (select auth.uid()))
);

create policy "admins read integrations" on public.integration_connections for select to authenticated using ((select private.is_workspace_admin(workspace_id)));
create policy "admins read invites" on public.workspace_invites for select to authenticated using ((select private.is_workspace_admin(workspace_id)));
