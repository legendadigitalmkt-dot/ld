begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'lead-owner@ld.test');

insert into public.workspaces(id, name, slug) values
  ('50000000-0000-4000-8000-000000000005', 'Lead Intake Workspace', 'lead-intake-workspace');

insert into public.workspace_members(workspace_id, user_id, role) values
  ('50000000-0000-4000-8000-000000000005', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'owner');

set local role authenticated;
set local request.jwt.claim.sub = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

select lives_ok(
  $$select * from public.create_lead_with_deal(
    '50000000-0000-4000-8000-000000000005',
    'Lead Transacional',
    '+5515999990000',
    'Manual',
    '60000000-0000-4000-8000-000000000006'
  )$$,
  'manual lead intake RPC succeeds'
);

select results_eq(
  $$select count(*) from public.contacts
    where workspace_id='50000000-0000-4000-8000-000000000005'$$,
  array[1::bigint],
  'lead intake creates one contact'
);

select results_eq(
  $$select count(*) from public.deals
    where workspace_id='50000000-0000-4000-8000-000000000005'$$,
  array[1::bigint],
  'lead intake creates one deal'
);

select results_eq(
  $$select stage::text from public.deals
    where workspace_id='50000000-0000-4000-8000-000000000005'$$,
  array['new'::text],
  'new deal starts in New stage'
);

select lives_ok(
  $$select * from public.create_lead_with_deal(
    '50000000-0000-4000-8000-000000000005',
    'Lead Transacional',
    '+5515999990000',
    'Manual',
    '60000000-0000-4000-8000-000000000006'
  )$$,
  'retry with same intake key succeeds idempotently'
);

select results_eq(
  $$select count(*) from public.contacts
    where workspace_id='50000000-0000-4000-8000-000000000005'$$,
  array[1::bigint],
  'retry does not duplicate contact'
);

select results_eq(
  $$select count(*) from public.deals
    where workspace_id='50000000-0000-4000-8000-000000000005'$$,
  array[1::bigint],
  'retry does not duplicate deal'
);

select * from finish();
rollback;
