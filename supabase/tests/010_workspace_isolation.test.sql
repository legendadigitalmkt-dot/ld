-- This test uses Supabase test helpers. Install once in the local test database:
-- select dbdev.install('basejump-supabase_test_helpers');
-- create extension if not exists "basejump-supabase_test_helpers" version '0.0.6';

begin;
create extension if not exists pgtap with schema extensions;

select plan(7);
select tests.create_supabase_user('ld_owner_a', 'owner-a@ld.test');
select tests.create_supabase_user('ld_member_a', 'member-a@ld.test');
select tests.create_supabase_user('ld_owner_b', 'owner-b@ld.test');

select tests.authenticate_as_service_role();

insert into public.workspaces(id,name,slug) values
('10000000-0000-0000-0000-000000000001','Workspace A','workspace-a'),
('20000000-0000-0000-0000-000000000002','Workspace B','workspace-b');

insert into public.workspace_members(workspace_id,user_id,role) values
('10000000-0000-0000-0000-000000000001', tests.get_supabase_uid('ld_owner_a'), 'owner'),
('10000000-0000-0000-0000-000000000001', tests.get_supabase_uid('ld_member_a'), 'sales'),
('20000000-0000-0000-0000-000000000002', tests.get_supabase_uid('ld_owner_b'), 'owner');

insert into public.contacts(id,workspace_id,name,owner_user_id) values
('11000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Lead A',tests.get_supabase_uid('ld_owner_a')),
('22000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Lead B',tests.get_supabase_uid('ld_owner_b'));

select tests.authenticate_as('ld_owner_a');
select results_eq('select count(*) from public.contacts', array[1::bigint], 'owner A sees only workspace A contacts');
select results_eq('select count(*) from public.workspace_members', array[2::bigint], 'owner A sees only workspace A members');
select lives_ok($$insert into public.contacts(workspace_id,name) values ('10000000-0000-0000-0000-000000000001','Allowed A')$$, 'owner A can write workspace A');
select throws_ok($$insert into public.contacts(workspace_id,name) values ('20000000-0000-0000-0000-000000000002','Forbidden B')$$, '42501', null, 'owner A cannot write workspace B');

select tests.authenticate_as('ld_member_a');
select results_eq('select count(*) from public.contacts', array[2::bigint], 'member A sees all contacts in A after owner insert');
select lives_ok($$insert into public.contacts(workspace_id,name) values ('10000000-0000-0000-0000-000000000001','Sales-created lead')$$, 'sales role can create CRM contact in own workspace');

select tests.authenticate_as('ld_owner_b');
select results_eq('select count(*) from public.contacts', array[1::bigint], 'owner B cannot see workspace A contacts');

select * from finish();
rollback;
