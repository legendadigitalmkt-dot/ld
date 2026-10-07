begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select extensions.has_table('public', 'contact_channels', 'contact_channels exists');
select extensions.has_table('public', 'message_status_events', 'message_status_events exists');
select extensions.has_table('public', 'webhook_events', 'webhook_events exists');

select extensions.ok(
  (select relrowsecurity from pg_class where oid='public.contact_channels'::regclass),
  'contact_channels RLS enabled'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid='public.message_status_events'::regclass),
  'message_status_events RLS enabled'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid='public.webhook_events'::regclass),
  'webhook_events RLS enabled'
);

select extensions.ok(
  exists (
    select 1 from pg_constraint
    where conname = 'messages_workspace_external_message_unique'
      and conrelid = 'public.messages'::regclass
  ),
  'external WhatsApp message ids are unique per workspace'
);

select extensions.ok(
  exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='integration_provider_resource_unique'
  ),
  'WhatsApp phone-number resource lookup is uniquely indexed'
);

select extensions.results_eq(
  $$select count(*) from information_schema.role_table_grants
    where table_schema='public'
      and table_name='messages'
      and grantee='authenticated'
      and privilege_type='INSERT'$$,
  array[0::bigint],
  'authenticated clients cannot forge outbound message persistence'
);

select extensions.ok(
  exists (
    select 1 from pg_type
    where typname='message_delivery_status'
  ),
  'message delivery status enum exists'
);

select * from finish();
rollback;
