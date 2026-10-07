begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

-- Seed auth identities while still executing as the test database owner.
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner-a@ld.test'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab', 'sales-a@ld.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'owner-b@ld.test');

insert into public.workspaces(id, name, slug) values
  ('10000000-0000-4000-8000-000000000001', 'Workspace A', 'workspace-a'),
  ('20000000-0000-4000-8000-000000000002', 'Workspace B', 'workspace-b');

insert into public.workspace_members(workspace_id, user_id, role) values
  ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner'),
  ('10000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab', 'sales'),
  ('20000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'owner');

insert into public.contacts(id, workspace_id, name, owner_user_id) values
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Lead A', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Lead B', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select results_eq(
  'select count(*) from public.contacts',
  array[1::bigint],
  'owner A sees only workspace A contacts'
);

select results_eq(
  'select count(*) from public.workspace_members',
  array[2::bigint],
  'owner A sees only workspace A memberships'
);

select lives_ok(
  $$insert into public.contacts(workspace_id, name, owner_user_id)
    values ('10000000-0000-4000-8000-000000000001', 'Allowed A', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'owner A can create contacts in workspace A'
);

select throws_ok(
  $$insert into public.contacts(workspace_id, name)
    values ('20000000-0000-4000-8000-000000000002', 'Forbidden B')$$,
  '42501',
  null,
  'owner A cannot create contacts in workspace B'
);

select throws_ok(
  $$insert into public.contacts(workspace_id, name, owner_user_id)
    values ('10000000-0000-4000-8000-000000000001', 'Cross-owner', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')$$,
  '23514',
  null,
  'workspace A contact cannot reference a workspace B owner'
);

set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab';

select results_eq(
  'select count(*) from public.contacts',
  array[2::bigint],
  'sales A sees contacts in workspace A'
);

select lives_ok(
  $$insert into public.contacts(workspace_id, name)
    values ('10000000-0000-4000-8000-000000000001', 'Sales-created lead')$$,
  'sales A can create a CRM contact in workspace A'
);

select results_eq(
  $delete from public.contacts
    where workspace_id = '10000000-0000-4000-8000-000000000001'
    returning 1$,
  $values (1) limit 0$,
  'sales A cannot delete CRM contacts'
);

set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select results_eq(
  'select count(*) from public.contacts',
  array[1::bigint],
  'owner B cannot see workspace A contacts'
);

select results_eq(
  $$select count(*) from public.workspaces where id = '10000000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'owner B cannot see workspace A metadata'
);

select * from finish();
rollback;
