create type public.message_delivery_status as enum ('pending','sent','delivered','read','failed','deleted');

alter table public.integration_connections
  add column external_resource_id text,
  add column connected_at timestamptz,
  add column last_error text;

create unique index integration_provider_resource_unique
  on public.integration_connections(provider, external_resource_id)
  where external_resource_id is not null;

alter table public.messages
  add column message_type text not null default 'text',
  add column delivery_status public.message_delivery_status,
  add column status_updated_at timestamptz,
  add column sender_wa_id text,
  add column recipient_wa_id text,
  add column reply_to_external_message_id text,
  add column error_code text,
  add column error_message text,
  add column metadata jsonb not null default '{}'::jsonb;

drop index if exists public.messages_external_id_unique;
alter table public.messages
  add constraint messages_workspace_external_message_unique
  unique (workspace_id, external_message_id);

create table public.contact_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  contact_id uuid not null,
  channel text not null check (channel in ('whatsapp')),
  external_id text not null,
  display_value text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, channel, external_id),
  constraint contact_channels_contact_same_workspace
    foreign key (contact_id, workspace_id)
    references public.contacts(id, workspace_id)
    on delete cascade
);

create table public.message_status_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  external_message_id text not null,
  status public.message_delivery_status not null,
  occurred_at timestamptz not null,
  recipient_wa_id text,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(message_id, status, occurred_at)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  external_resource_id text,
  event_type text not null,
  payload_hash text not null,
  processing_status text not null default 'processing'
    check (processing_status in ('processing','processed','ignored','failed')),
  metadata jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  unique(provider, event_key)
);

create index contact_channels_contact_workspace_idx on public.contact_channels(contact_id, workspace_id);
create index message_status_events_workspace_created_idx on public.message_status_events(workspace_id, created_at desc);
create index message_status_events_external_message_idx on public.message_status_events(workspace_id, external_message_id);
create index webhook_events_workspace_received_idx on public.webhook_events(workspace_id, received_at desc);
create index webhook_events_resource_received_idx on public.webhook_events(provider, external_resource_id, received_at desc);

create index if not exists activities_actor_user_id_idx on public.activities(actor_user_id);
create index if not exists automations_workspace_id_idx on public.automations(workspace_id);
create index if not exists contacts_owner_user_id_idx on public.contacts(owner_user_id);
create index if not exists conversations_contact_workspace_idx on public.conversations(contact_id, workspace_id);
create index if not exists deals_contact_workspace_idx on public.deals(contact_id, workspace_id);
create index if not exists deals_owner_user_id_idx on public.deals(owner_user_id);
create index if not exists knowledge_created_by_idx on public.knowledge_entries(created_by);
create index if not exists messages_conversation_workspace_idx on public.messages(conversation_id, workspace_id);
create index if not exists tasks_assignee_user_id_idx on public.tasks(assignee_user_id);
create index if not exists tasks_contact_workspace_idx on public.tasks(contact_id, workspace_id);
create index if not exists tasks_deal_workspace_idx on public.tasks(deal_id, workspace_id);
create index if not exists workspace_invites_invited_by_idx on public.workspace_invites(invited_by);

create trigger contact_channels_updated_at
before update on public.contact_channels
for each row execute function private.set_updated_at();

alter table public.contact_channels enable row level security;
alter table public.message_status_events enable row level security;
alter table public.webhook_events enable row level security;

revoke all on table public.contact_channels, public.message_status_events, public.webhook_events from anon, authenticated;
grant select on public.contact_channels to authenticated;
grant select on public.message_status_events to authenticated;
grant select on public.webhook_events to authenticated;

create policy "members read contact channels" on public.contact_channels
for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "members read message status" on public.message_status_events
for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "admins read webhook events" on public.webhook_events
for select to authenticated
using (workspace_id is not null and (select private.is_workspace_admin(workspace_id)));

revoke insert on public.messages from authenticated;
