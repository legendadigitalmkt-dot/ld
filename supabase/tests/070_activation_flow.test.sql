begin;
create extension if not exists pgtap with schema extensions;
select plan(16);
insert into auth.users(id,email) values
('aaaaaaaa-9999-4999-8999-999999999991','activation-owner@ld.test'),
('aaaaaaaa-9999-4999-8999-999999999992','activation-viewer@ld.test');
insert into public.workspaces(id,name,slug) values
('10000000-9999-4999-8999-999999999991','Activation A','activation-test-a'),
('20000000-9999-4999-8999-999999999992','Activation B','activation-test-b');
insert into public.workspace_members(workspace_id,user_id,role) values
('10000000-9999-4999-8999-999999999991','aaaaaaaa-9999-4999-8999-999999999991','owner'),
('10000000-9999-4999-8999-999999999991','aaaaaaaa-9999-4999-8999-999999999992','viewer');
insert into public.contacts(id,workspace_id,name) values
('11000000-9999-4999-8999-999999999991','10000000-9999-4999-8999-999999999991','Existing contact');
set local role authenticated;
set local request.jwt.claim.sub='aaaaaaaa-9999-4999-8999-999999999991';
select lives_ok($$select public.create_lead_with_deal('10000000-9999-4999-8999-999999999991','First lead',null,'Manual','13000000-9999-4999-8999-999999999991')$$,'first step creates contact and opportunity');
select is((select count(*)::int from public.contacts where intake_key='13000000-9999-4999-8999-999999999991'),1,'one contact belongs to this intake');
select is((select count(*)::int from public.deals where contact_id=(select id from public.contacts where intake_key='13000000-9999-4999-8999-999999999991')),1,'opportunity belongs to the created contact');
select lives_ok($$select public.create_lead_with_deal('10000000-9999-4999-8999-999999999991','First lead',null,'Manual','13000000-9999-4999-8999-999999999991')$$,'retrying intake succeeds');
select is((select count(*)::int from public.deals where contact_id=(select id from public.contacts where intake_key='13000000-9999-4999-8999-999999999991')),1,'retry does not create another opportunity');
select is((public.contact_context('10000000-9999-4999-8999-999999999991',(select id from public.contacts where intake_key='13000000-9999-4999-8999-999999999991'))->'stats'->>'tasks')::int,0,'first task remains an explicit next step');
select lives_ok($$select public.create_workspace_task('10000000-9999-4999-8999-999999999991','Confirm scope','medium','2026-10-11 02:59:59.999+00',(select id from public.contacts where intake_key='13000000-9999-4999-8999-999999999991'),(select id from public.deals where contact_id=(select id from public.contacts where intake_key='13000000-9999-4999-8999-999999999991') limit 1))$$,'first task can be created with both linked records');
select ok((select count(*)=1 and bool_and(contact_id=(select id from public.contacts where intake_key='13000000-9999-4999-8999-999999999991')) and bool_and(assignee_user_id='aaaaaaaa-9999-4999-8999-999999999991') and bool_and(due_at='2026-10-11 02:59:59.999+00'::timestamptz) from public.tasks),'task preserves linkage, assignee and timezone-derived deadline');
select is((select count(*)::int from public.activities where type='task_created' and metadata->>'contact_id'=(select id::text from public.contacts where intake_key='13000000-9999-4999-8999-999999999991')),1,'first task is included in contact history');
select is((public.contact_context('10000000-9999-4999-8999-999999999991',(select id from public.contacts where intake_key='13000000-9999-4999-8999-999999999991'))->'stats'->>'tasks')::int,1,'completed onboarding reads the task from contact context');
select throws_ok($$select public.create_workspace_task('10000000-9999-4999-8999-999999999991','Wrong contact','medium',null,'11000000-9999-4999-8999-999999999991',(select id from public.deals where contact_id=(select id from public.contacts where intake_key='13000000-9999-4999-8999-999999999991') limit 1))$$,'22023',null,'task cannot link another contact to the selected deal');
select lives_ok($$insert into public.deals(workspace_id,contact_id,title,stage,value,probability) values('10000000-9999-4999-8999-999999999991','11000000-9999-4999-8999-999999999991','Existing contact opportunity','new',0,20)$$,'editor can create first opportunity for an existing contact');
set local request.jwt.claim.sub='aaaaaaaa-9999-4999-8999-999999999992';
select lives_ok($$select public.contact_context('10000000-9999-4999-8999-999999999991',(select id from public.contacts where intake_key='13000000-9999-4999-8999-999999999991'))$$,'viewer can inspect onboarding progress');
select throws_ok($$select public.create_workspace_task('10000000-9999-4999-8999-999999999991','Viewer task')$$,'42501',null,'viewer cannot create the first task');
select throws_ok($$select public.contact_context('20000000-9999-4999-8999-999999999992','11000000-9999-4999-8999-999999999991')$$,'42501',null,'other workspace context is not readable');
set local role anon;
select throws_ok($$select public.create_lead_with_deal('10000000-9999-4999-8999-999999999991','Anonymous lead')$$,'42501',null,'anonymous intake is denied');
select * from finish();
rollback;
