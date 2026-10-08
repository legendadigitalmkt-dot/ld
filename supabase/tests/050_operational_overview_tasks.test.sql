begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users(id,email) values
('aaaaaaaa-7777-4777-8777-777777777771','overview-owner@ld.test'),
('aaaaaaaa-7777-4777-8777-777777777772','overview-viewer@ld.test'),
('bbbbbbbb-7777-4777-8777-777777777773','overview-other@ld.test');
insert into public.workspaces(id,name,slug) values
('10000000-7777-4777-8777-777777777771','Overview A','overview-test-a'),
('20000000-7777-4777-8777-777777777772','Overview B','overview-test-b');
insert into public.workspace_members(workspace_id,user_id,role) values
('10000000-7777-4777-8777-777777777771','aaaaaaaa-7777-4777-8777-777777777771','owner'),
('10000000-7777-4777-8777-777777777771','aaaaaaaa-7777-4777-8777-777777777772','viewer'),
('20000000-7777-4777-8777-777777777772','bbbbbbbb-7777-4777-8777-777777777773','owner');
insert into public.contacts(id,workspace_id,name) values
('11000000-7777-4777-8777-777777777771','10000000-7777-4777-8777-777777777771','Overview Lead A'),
('22000000-7777-4777-8777-777777777772','20000000-7777-4777-8777-777777777772','Overview Lead B');
insert into public.contacts(workspace_id,name) select '10000000-7777-4777-8777-777777777771'::uuid,'Bulk lead '||i from generate_series(1,1000) i;
insert into public.deals(workspace_id,contact_id,title,stage,value,probability,last_activity_at,won_at,lost_at) values
('10000000-7777-4777-8777-777777777771','11000000-7777-4777-8777-777777777771','Open 1','new',100,20,now()-interval '2 days',null,null),
('10000000-7777-4777-8777-777777777771','11000000-7777-4777-8777-777777777771','Open 2','proposal',500,50,now(),null,null),
('10000000-7777-4777-8777-777777777771','11000000-7777-4777-8777-777777777771','Open 3','negotiation',2000,80,now(),null,null),
('10000000-7777-4777-8777-777777777771','11000000-7777-4777-8777-777777777771','Won 1','won',100,100,now(),now()-interval '1 day',null),
('10000000-7777-4777-8777-777777777771','11000000-7777-4777-8777-777777777771','Won 2','won',300,100,now(),now()-interval '1 day',null),
('10000000-7777-4777-8777-777777777771','11000000-7777-4777-8777-777777777771','Lost','lost',200,0,now(),null,now()-interval '1 day'),
('20000000-7777-4777-8777-777777777772','22000000-7777-4777-8777-777777777772','Other tenant','won',999999,100,now(),now(),null);
insert into public.tasks(id,workspace_id,title,due_at) values
('13000000-7777-4777-8777-777777777771','10000000-7777-4777-8777-777777777771','Overdue task',now()-interval '1 day'),
('23000000-7777-4777-8777-777777777772','20000000-7777-4777-8777-777777777772','Other workspace task',now());

set local role authenticated;
set local request.jwt.claim.sub='aaaaaaaa-7777-4777-8777-777777777771';

select is((public.growth_overview('10000000-7777-4777-8777-777777777771')->'stats'->>'contacts')::int,1001,'aggregate counts beyond the API row cap');
select is((public.growth_overview('10000000-7777-4777-8777-777777777771')->'stats'->>'open_deals')::int,3,'only open deals count');
select is((public.growth_overview('10000000-7777-4777-8777-777777777771')->'stats'->>'pipeline')::numeric,2600::numeric,'open pipeline uses only own workspace');
select is((public.growth_overview('10000000-7777-4777-8777-777777777771')->'stats'->>'won')::numeric,400::numeric,'won total excludes other workspace');
select is((public.growth_overview('10000000-7777-4777-8777-777777777771')->'stats'->>'conversion')::numeric,66.7::numeric,'conversion uses won and lost closures');
select is((public.growth_overview('10000000-7777-4777-8777-777777777771')->'stats'->>'forecast')::numeric,1870::numeric,'forecast respects deal probabilities');
select is((public.growth_overview('10000000-7777-4777-8777-777777777771')->'stats'->>'overdue')::int,1,'overdue tasks are counted');
select is((public.growth_overview('10000000-7777-4777-8777-777777777771')->'stats'->>'idle')::int,1,'idle opportunities use 24 hours');
select is(jsonb_array_length(public.growth_overview('10000000-7777-4777-8777-777777777771')->'revenue'),30,'revenue chart contains each workspace day');
select throws_ok($$select public.growth_overview('20000000-7777-4777-8777-777777777772')$$,'42501',null,'foreign summary denied');
select throws_ok($$select public.growth_overview('10000000-7777-4777-8777-777777777771',999)$$,'22023',null,'unbounded period denied');
select throws_ok($$select public.create_workspace_task('20000000-7777-4777-8777-777777777772','Forbidden')$$,'42501',null,'foreign task creation denied');
select throws_ok($$select public.create_workspace_task('10000000-7777-4777-8777-777777777771','Wrong contact','medium',null,'22000000-7777-4777-8777-777777777772')$$,'42501',null,'foreign contact cannot be linked');
select throws_ok($$select public.create_workspace_task('10000000-7777-4777-8777-777777777771','x')$$,'22023',null,'invalid title denied');
select throws_ok($$select public.set_workspace_task_status('10000000-7777-4777-8777-777777777771','23000000-7777-4777-8777-777777777772','done')$$,'42501',null,'foreign task cannot be modified through own workspace');
select ok((select count(*)=3 and bool_and(not p.prosecdef) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('growth_overview','create_workspace_task','set_workspace_task_status')),'operational functions execute with caller permissions');

select lives_ok($$select public.create_workspace_task('10000000-7777-4777-8777-777777777771','Follow up','high',now(),'11000000-7777-4777-8777-777777777771')$$,'editor creates linked task');
select is((public.growth_overview('10000000-7777-4777-8777-777777777771')->'stats'->>'no_followup')::int,1000,'linked task removes the contact from missing next actions');
select lives_ok($$select public.set_workspace_task_status('10000000-7777-4777-8777-777777777771',(select id from public.tasks where title='Follow up'),'done')$$,'editor can complete task');
select is((public.growth_overview('10000000-7777-4777-8777-777777777771')->'stats'->>'no_followup')::int,1001,'completed tasks do not count as future actions');
select lives_ok($$select public.set_workspace_task_status('10000000-7777-4777-8777-777777777771',(select id from public.tasks where title='Follow up'),'open')$$,'editor can reopen task');
select is((select count(*)::int from public.activities where type in ('task_created','task_status_changed')),3,'task creation and status changes are audited atomically');

set local request.jwt.claim.sub='aaaaaaaa-7777-4777-8777-777777777772';
select lives_ok($$select public.growth_overview('10000000-7777-4777-8777-777777777771')$$,'viewer can read overview');
select throws_ok($$select public.create_workspace_task('10000000-7777-4777-8777-777777777771','Viewer write')$$,'42501',null,'viewer cannot create tasks');
select throws_ok($$select public.set_workspace_task_status('10000000-7777-4777-8777-777777777771','13000000-7777-4777-8777-777777777771','done')$$,'42501',null,'viewer cannot modify tasks');
set local role anon;
select throws_ok($$select public.growth_overview('10000000-7777-4777-8777-777777777771')$$,'42501',null,'anonymous callers cannot execute overview');
select * from finish();
rollback;
