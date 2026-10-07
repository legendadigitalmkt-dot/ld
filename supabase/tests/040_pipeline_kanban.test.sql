begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'pipeline-owner@ld.test'),
  ('22222222-2222-4222-8222-222222222222', 'pipeline-other@ld.test');

insert into public.workspaces(id, name, slug) values
  ('11111111-aaaa-4111-8111-111111111111', 'Pipeline A', 'pipeline-a'),
  ('22222222-bbbb-4222-8222-222222222222', 'Pipeline B', 'pipeline-b');

insert into public.workspace_members(workspace_id, user_id, role) values
  ('11111111-aaaa-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('22222222-bbbb-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'owner');

insert into public.contacts(id, workspace_id, name, owner_user_id) values
  ('11111111-cccc-4111-8111-111111111111', '11111111-aaaa-4111-8111-111111111111', 'Pipeline Lead', '11111111-1111-4111-8111-111111111111');

insert into public.deals(id, workspace_id, contact_id, title, owner_user_id, value) values
  ('11111111-dddd-4111-8111-111111111111', '11111111-aaaa-4111-8111-111111111111', '11111111-cccc-4111-8111-111111111111', 'Deal Pipeline', '11111111-1111-4111-8111-111111111111', 1000);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select lives_ok(
  $$select * from public.move_deal_stage(
    '11111111-aaaa-4111-8111-111111111111',
    '11111111-dddd-4111-8111-111111111111',
    'qualified'
  )$$,
  'owner can move deal in own workspace'
);

select results_eq(
  $$select stage::text from public.deals where id='11111111-dddd-4111-8111-111111111111'$$,
  array['qualified'::text],
  'stage persists as qualified'
);

select results_eq(
  $$select probability::int from public.deals where id='11111111-dddd-4111-8111-111111111111'$$,
  array[50],
  'qualified sets 50 percent probability'
);

select lives_ok(
  $$select * from public.update_deal_value(
    '11111111-aaaa-4111-8111-111111111111',
    '11111111-dddd-4111-8111-111111111111',
    2750.50
  )$$,
  'owner can update deal value'
);

select results_eq(
  $$select value::numeric from public.deals where id='11111111-dddd-4111-8111-111111111111'$$,
  array[2750.50::numeric],
  'deal value persists'
);

select lives_ok(
  $$select * from public.move_deal_stage(
    '11111111-aaaa-4111-8111-111111111111',
    '11111111-dddd-4111-8111-111111111111',
    'won'
  )$$,
  'deal can be marked won'
);

select results_eq(
  $$select probability::int from public.deals where id='11111111-dddd-4111-8111-111111111111'$$,
  array[100],
  'won sets probability to 100'
);

select ok(
  (select won_at is not null and lost_at is null from public.deals where id='11111111-dddd-4111-8111-111111111111'),
  'won sets won_at and clears lost_at'
);

select results_eq(
  $$select status::text from public.contacts where id='11111111-cccc-4111-8111-111111111111'$$,
  array['customer'::text],
  'won converts contact to customer'
);

select results_eq(
  $$select count(*) from public.activities
    where workspace_id='11111111-aaaa-4111-8111-111111111111'
      and type in ('deal_stage_changed','deal_value_changed')$$,
  array[3::bigint],
  'stage and value changes are audited'
);

select throws_ok(
  $$select * from public.move_deal_stage(
    '22222222-bbbb-4222-8222-222222222222',
    '11111111-dddd-4111-8111-111111111111',
    'lost'
  )$$,
  '42501',
  null,
  'cannot move deal through another workspace'
);

select throws_ok(
  $$select * from public.update_deal_value(
    '11111111-aaaa-4111-8111-111111111111',
    '11111111-dddd-4111-8111-111111111111',
    -1
  )$$,
  '22023',
  null,
  'negative deal value is rejected'
);

select * from finish();
rollback;
