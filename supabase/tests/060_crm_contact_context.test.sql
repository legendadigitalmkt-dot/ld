begin;
create extension if not exists pgtap with schema extensions;
select plan(41);
insert into auth.users(id,email) values
('aaaaaaaa-8888-4888-8888-888888888881','crm-owner@ld.test'),
('aaaaaaaa-8888-4888-8888-888888888882','crm-viewer@ld.test'),
('aaaaaaaa-8888-4888-8888-888888888883','crm-sales@ld.test'),
('bbbbbbbb-8888-4888-8888-888888888884','crm-other@ld.test');
update public.profiles set full_name='CRM Operator' where id='aaaaaaaa-8888-4888-8888-888888888881';
insert into public.workspaces(id,name,slug,updated_at) values
('10000000-8888-4888-8888-888888888881','CRM A','crm-test-a','2026-01-01'),
('20000000-8888-4888-8888-888888888882','CRM B','crm-test-b','2026-01-01');
insert into public.workspace_members(workspace_id,user_id,role) values
('10000000-8888-4888-8888-888888888881','aaaaaaaa-8888-4888-8888-888888888881','owner'),
('10000000-8888-4888-8888-888888888881','aaaaaaaa-8888-4888-8888-888888888882','viewer'),
('10000000-8888-4888-8888-888888888881','aaaaaaaa-8888-4888-8888-888888888883','sales'),
('20000000-8888-4888-8888-888888888882','bbbbbbbb-8888-4888-8888-888888888884','owner');
insert into public.contacts(id,workspace_id,name,created_at,updated_at) values
('11000000-8888-4888-8888-888888888881','10000000-8888-4888-8888-888888888881','Contact A','2026-01-01','2026-01-01'),
('12000000-8888-4888-8888-888888888882','10000000-8888-4888-8888-888888888881','Unrelated A','2026-01-01','2026-01-01'),
('22000000-8888-4888-8888-888888888883','20000000-8888-4888-8888-888888888882','Contact B','2026-01-01','2026-01-01');
insert into public.deals(id,workspace_id,contact_id,title,value) values
('14000000-8888-4888-8888-888888888881','10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881','Linked deal',150.25);
insert into public.tasks(id,workspace_id,title,contact_id,deal_id,due_at) values
('15000000-8888-4888-8888-888888888881','10000000-8888-4888-8888-888888888881','Direct task','11000000-8888-4888-8888-888888888881',null,'2026-10-08 12:00:00+00'),
('16000000-8888-4888-8888-888888888882','10000000-8888-4888-8888-888888888881','Legacy deal task',null,'14000000-8888-4888-8888-888888888881',null);
insert into public.tasks(workspace_id,title,contact_id) select '10000000-8888-4888-8888-888888888881'::uuid,'Bulk CRM task '||i,'11000000-8888-4888-8888-888888888881'::uuid from generate_series(1,1001)i;
insert into public.conversations(id,workspace_id,contact_id,channel,external_thread_id) values
('17000000-8888-4888-8888-888888888881','10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881','whatsapp','5511999999999');
insert into public.contact_channels(workspace_id,contact_id,channel,external_id,display_value) values
('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881','whatsapp','5511999999999','+5511999999999');
insert into public.activities(workspace_id,type,text,metadata) values
('10000000-8888-4888-8888-888888888881','lead_created','Contact and deal',jsonb_build_object('contact_id','11000000-8888-4888-8888-888888888881','deal_id','14000000-8888-4888-8888-888888888881')),
('10000000-8888-4888-8888-888888888881','deal_stage_changed','Only deal',jsonb_build_object('deal_id','14000000-8888-4888-8888-888888888881')),
('10000000-8888-4888-8888-888888888881','task_status_changed','Only task',jsonb_build_object('task_id','16000000-8888-4888-8888-888888888882')),
('10000000-8888-4888-8888-888888888881','whatsapp_message_sent','Only conversation',jsonb_build_object('conversation_id','17000000-8888-4888-8888-888888888881')),
('10000000-8888-4888-8888-888888888881','lead_created','Unrelated contact',jsonb_build_object('contact_id','12000000-8888-4888-8888-888888888882')),
('20000000-8888-4888-8888-888888888882','lead_created','Foreign activity',jsonb_build_object('contact_id','11000000-8888-4888-8888-888888888881'));
insert into public.activities(workspace_id,type,text,metadata) select '10000000-8888-4888-8888-888888888881'::uuid,'test_event','History '||i,jsonb_build_object('contact_id','11000000-8888-4888-8888-888888888881') from generate_series(1,35)i;
set local role authenticated;
set local request.jwt.claim.sub='aaaaaaaa-8888-4888-8888-888888888881';
select ok((select company is null from public.contacts where id='11000000-8888-4888-8888-888888888881'),'old contacts remain readable with an empty company');
select is((public.contact_context('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881')->'stats'->>'tasks')::int,1003,'contact task count exceeds the API row cap and includes legacy links');
select is(jsonb_array_length(public.contact_context('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881')->'tasks'),20,'related task preview is bounded');
select is((public.contact_context('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881')->'stats'->>'history')::int,39,'timeline deduplicates associations and excludes unrelated contacts');
select is(jsonb_array_length(public.contact_context('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881')->'history'),30,'timeline page is bounded');
select is(jsonb_array_length(public.contact_context('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881',2)->'history'),9,'older timeline page contains remaining events');
select is((public.contact_context('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881')->'stats'->>'pipeline')::numeric,150.25::numeric,'contact pipeline preserves cents');
select is(public.contact_context('10000000-8888-4888-8888-888888888881','22000000-8888-4888-8888-888888888883'),null::jsonb,'foreign contact is not revealed inside own workspace');
select throws_ok($$select public.contact_context('20000000-8888-4888-8888-888888888882','22000000-8888-4888-8888-888888888883')$$,'42501',null,'foreign workspace profile denied');
select throws_ok($$select public.contact_context('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881',0)$$,'22023',null,'invalid history page denied');
select lives_ok($$select public.update_contact_profile('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881','2026-01-01','Ana A','Empresa A','ana@example.test','999','Indicação','customer',array['prioridade'],'aaaaaaaa-8888-4888-8888-888888888883')$$,'editor saves profile and responsible member');
select is((select company from public.contacts where id='11000000-8888-4888-8888-888888888881'),'Empresa A','company is persisted');
select is((select created_at from public.contacts where id='11000000-8888-4888-8888-888888888881'),'2026-01-01'::timestamptz,'creation date is preserved');
select is((select external_id from public.contact_channels where contact_id='11000000-8888-4888-8888-888888888881'),'5511999999999','phone edits do not change the WhatsApp identity');
select ok((select metadata->'changed_fields' @> '["company","owner_user_id"]'::jsonb from public.activities where type='contact_updated'),'audit records changed field names');
select lives_ok($$select public.update_contact_profile('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881',(select updated_at from public.contacts where id='11000000-8888-4888-8888-888888888881'),'Ana A','Empresa A','ana@example.test','999','Indicação','customer',array['prioridade'],'aaaaaaaa-8888-4888-8888-888888888883')$$,'unchanged profile is accepted');
select is((select count(*)::int from public.activities where type='contact_updated'),1,'unchanged save does not duplicate audit');
select throws_ok($$select public.update_contact_profile('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881','2026-01-01','Old overwrite',null,null,null,'Manual','lead','{}',null)$$,'40001',null,'stale profile cannot overwrite newer values');
select throws_ok($$select public.update_contact_profile('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881',now(),'Invalid email',null,'invalid',null,'Manual','lead','{}',null)$$,'22023',null,'database validates email independently');
select throws_ok($$select public.update_contact_profile('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881',now(),'Foreign owner',null,null,null,'Manual','lead','{}','bbbbbbbb-8888-4888-8888-888888888884')$$,'42501',null,'responsible user must belong to active workspace');
select throws_ok($$select public.update_contact_profile('10000000-8888-4888-8888-888888888881','22000000-8888-4888-8888-888888888883',now(),'Foreign contact',null,null,null,'Manual','lead','{}',null)$$,'42501',null,'foreign profile cannot be edited');
select throws_ok($$select public.update_contact_profile('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881',now(),'Bad tags',null,null,null,'Manual','lead',array['tag','tag'],null)$$,'22023',null,'duplicate tags cannot bypass validation');
select lives_ok($$select public.add_contact_note('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881','Retomar proposta.','18000000-8888-4888-8888-888888888881')$$,'editor can add note');
select lives_ok($$select public.add_contact_note('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881','Retomar proposta.','18000000-8888-4888-8888-888888888881')$$,'note retry with same key succeeds');
select is((select count(*)::int from public.activities where type='contact_note'),1,'note retry does not duplicate history');
select throws_ok($$select public.add_contact_note('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881','Different body','18000000-8888-4888-8888-888888888881')$$,'22023',null,'retry key cannot replace note content');
select throws_ok($$select public.add_contact_note('10000000-8888-4888-8888-888888888881','22000000-8888-4888-8888-888888888883','Foreign note','18000000-8888-4888-8888-888888888882')$$,'42501',null,'foreign note link denied');
select throws_ok($$select public.add_contact_note('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881','x','18000000-8888-4888-8888-888888888883')$$,'22023',null,'short note denied');
select lives_ok($$select public.update_workspace_profile('10000000-8888-4888-8888-888888888881','2026-01-01','CRM Renamed','Serviços','UTC')$$,'owner can update workspace settings');
select is((select slug from public.workspaces where id='10000000-8888-4888-8888-888888888881'),'crm-test-a','workspace slug stays stable');
select is((select due_at from public.tasks where id='15000000-8888-4888-8888-888888888881'),'2026-10-08 12:00:00+00'::timestamptz,'timezone changes preserve existing task instants');
select is((select count(*)::int from public.activities where type='workspace_profile_updated'),1,'workspace update is audited');
select throws_ok($$select public.update_workspace_profile('10000000-8888-4888-8888-888888888881','2026-01-01','Stale workspace',null,'UTC')$$,'40001',null,'stale workspace edit denied');
select throws_ok($$select public.update_workspace_profile('10000000-8888-4888-8888-888888888881',now(),'Invalid timezone',null,'Not/AZone')$$,'22023',null,'database rejects unknown timezone');
set local request.jwt.claim.sub='aaaaaaaa-8888-4888-8888-888888888883';
select throws_ok($$select public.update_workspace_profile('10000000-8888-4888-8888-888888888881',now(),'Sales settings',null,'UTC')$$,'42501',null,'sales cannot administer workspace');
set local request.jwt.claim.sub='aaaaaaaa-8888-4888-8888-888888888882';
select lives_ok($$select public.contact_context('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881')$$,'viewer can read contact context');
select throws_ok($$select public.add_contact_note('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881','Viewer note','18000000-8888-4888-8888-888888888884')$$,'42501',null,'viewer cannot add note');
select throws_ok($$select public.update_contact_profile('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881',now(),'Viewer write',null,null,null,'Manual','lead','{}',null)$$,'42501',null,'viewer cannot edit contact');
select ok((select count(*)=4 and bool_and(not p.prosecdef) and bool_and(not has_function_privilege('anon',p.oid,'EXECUTE')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('contact_context','update_contact_profile','add_contact_note','update_workspace_profile')),'new functions are invoker and not executable by anonymous callers');
set local role anon;
select throws_ok($$select public.contact_context('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881')$$,'42501',null,'anonymous context access denied');
reset role;
insert into public.workspace_members(workspace_id,user_id,role) values('20000000-8888-4888-8888-888888888882','aaaaaaaa-8888-4888-8888-888888888881','sales');
set local role authenticated;
set local request.jwt.claim.sub='aaaaaaaa-8888-4888-8888-888888888881';
select is((public.contact_context('10000000-8888-4888-8888-888888888881','11000000-8888-4888-8888-888888888881')->'stats'->>'history')::int,41,'explicit workspace filter holds even when caller belongs to both tenants');
select * from finish();
rollback;
