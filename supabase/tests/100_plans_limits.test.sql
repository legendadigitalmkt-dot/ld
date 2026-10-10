-- Synthetic, transactional fixtures. CI/local only; never run on production.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,created_at,raw_user_meta_data) values
 ('11111111-3030-4030-8030-303030303001','owner@plans.test',now(),now(),'{}'),
 ('22222222-3030-4030-8030-303030303002','product@plans.test',now(),now(),'{}'),
 ('33333333-3030-4030-8030-303030303003','analyst@plans.test',now(),now(),'{}'),
 ('44444444-3030-4030-8030-303030303004','a@plans.test',now(),now(),'{"platform_owner":true}'),
 ('55555555-3030-4030-8030-303030303005','b@plans.test',now(),now(),'{}'),
 ('66666666-3030-4030-8030-303030303006','invite@plans.test',now(),now(),'{}');
insert into auth.sessions(id,user_id,aal,created_at,updated_at) select id,id,'aal2',now(),now() from auth.users where email like '%@plans.test';
insert into auth.mfa_factors(id,user_id,factor_type,status,friendly_name,created_at,updated_at) select id,id,'totp','verified','Synthetic plan test',now(),now() from auth.users where email like '%@plans.test';
insert into public.workspaces(id,name,slug) values
 ('10000000-3030-4030-8030-303030303001','Plan Owner','plan-owner'),
 ('20000000-3030-4030-8030-303030303002','Plan A','plan-a'),
 ('30000000-3030-4030-8030-303030303003','Plan B','plan-b');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('10000000-3030-4030-8030-303030303001','11111111-3030-4030-8030-303030303001','owner'),
 ('10000000-3030-4030-8030-303030303001','22222222-3030-4030-8030-303030303002','viewer'),
 ('10000000-3030-4030-8030-303030303001','33333333-3030-4030-8030-303030303003','viewer'),
 ('20000000-3030-4030-8030-303030303002','44444444-3030-4030-8030-303030303004','owner'),
 ('30000000-3030-4030-8030-303030303003','55555555-3030-4030-8030-303030303005','owner');
select control_plane.bootstrap_owner('10000000-3030-4030-8030-303030303001','11111111-3030-4030-8030-303030303001','Synthetic plan operator bootstrap');
insert into control_plane.platform_user_roles(user_id,role_code) values ('22222222-3030-4030-8030-303030303002','product_admin'),('33333333-3030-4030-8030-303030303003','analyst');
create function pg_temp.plan_login(u uuid,aal text default 'aal2') returns void language sql as $$select set_config('request.jwt.claim.sub',u::text,true);select set_config('request.jwt.claims',jsonb_build_object('sub',u,'session_id',u,'aal',aal,'role','authenticated')::text,true);$$;
create function pg_temp.config(c integer default 2,m integer default 1,w boolean default false) returns jsonb language sql as $$select jsonb_build_object('features',jsonb_build_object('crm',true,'whatsapp',w,'growth_ai',true),'limits',jsonb_build_object('contacts',c,'deals',0,'tasks',1,'members',m));$$;
-- Fixture lookup helpers exist only in this rolled-back CI transaction.
create function pg_temp.plan_id() returns uuid language sql security definer set search_path='' as $$select id from control_plane.plans where code='quota-test';$$;
create function pg_temp.version_id(n bigint) returns uuid language sql security definer set search_path='' as $$select v.id from control_plane.plan_versions v join control_plane.plans p on p.id=v.plan_id where p.code='quota-test' and v.version=n;$$;
create function pg_temp.slot_id() returns uuid language sql security definer set search_path='' as $$select id from control_plane.member_slot_reservations where email_hash=md5('invite@plans.test');$$;
select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where relnamespace='control_plane'::regnamespace and relname in ('plans','plan_versions','workspace_usage','workspace_plan_assignments','member_slot_reservations')),'all new tables force RLS');
select ok(not has_table_privilege('authenticated','control_plane.plans','SELECT,INSERT,UPDATE,DELETE'),'plan catalog is not a direct API');
select ok(not has_table_privilege('authenticated','control_plane.workspace_usage','SELECT,UPDATE'),'usage counters cannot be forged');
select ok(not has_function_privilege('authenticated','control_plane.usage_snapshot(uuid)','EXECUTE'),'raw usage helper is ungranted');
select ok((select count(*)=8 and bool_and(not prosecdef) and bool_and(not has_function_privilege('anon',oid,'EXECUTE')) from pg_proc where pronamespace='public'::regnamespace and proname in ('workspace_plan','platform_plans','platform_save_plan','platform_publish_plan','platform_assign_plan','reserve_member_slot','complete_member_slot','cancel_member_slot')),'all new exposed functions are invoker and deny anon');
select ok((select bool_and(proconfig @> array['search_path=""']) from pg_proc where pronamespace='control_plane'::regnamespace and prosecdef),'definers pin search path');
set local role authenticated;
select pg_temp.plan_login('44444444-3030-4030-8030-303030303004');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->'plan','null'::jsonb,'new workspaces retain the unassigned policy');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->'used'->>'members','1','usage is initialized and tracks membership');
select throws_ok($$select public.workspace_plan('30000000-3030-4030-8030-303030303003')$$,'42501',null,'cross-tenant usage is denied');
select throws_ok($$select public.platform_plans()$$,'42501',null,'ordinary owner and editable metadata grant no plan administration');
select throws_ok($$select public.platform_save_plan(null,'quota-test','Quota','', 'draft',pg_temp.config(),0,'Cannot create customer plans',true)$$,'42501',null,'customer cannot write catalog');
select pg_temp.plan_login('11111111-3030-4030-8030-303030303001','aal1');
select throws_ok($$select public.platform_plans()$$,'42501',null,'plans require MFA');
select throws_ok($$select public.platform_save_plan(null,'quota-test','Quota','', 'draft',pg_temp.config(),0,'No MFA bypass on write',true)$$,'42501',null,'writes require MFA');
select pg_temp.plan_login('33333333-3030-4030-8030-303030303003');
select lives_ok($$select public.platform_plans()$$,'analyst reads catalog');
select throws_ok($$select public.platform_save_plan(null,'quota-test','Quota','', 'draft',pg_temp.config(),0,'Analyst cannot write a plan',true)$$,'42501',null,'analyst is read only');
select pg_temp.plan_login('22222222-3030-4030-8030-303030303002');
select throws_ok($$select public.platform_users()$$,'42501',null,'product access grants no user administration');
select throws_ok($$select public.workspace_plan('20000000-3030-4030-8030-303030303002')$$,'42501',null,'platform product role grants no customer membership');
select lives_ok($$select public.platform_plans('20000000-3030-4030-8030-303030303002')$$,'authorized product role sees only aggregate plan usage');
select throws_ok($$select public.platform_plans(null,repeat('a',81))$$,'22023',null,'catalog queries are bounded');
select is((public.platform_plans(null,'')->>'total')::int,0,'no commercial plans are seeded');
select throws_ok($$select public.platform_save_plan(null,'quota-test','Quota','','active',pg_temp.config(),0,'New plans start in draft',true)$$,'22023',null,'cannot activate an unpublished plan');
select throws_ok($$select public.platform_save_plan(null,'quota-test','Quota','','draft',pg_temp.config(),0,'Confirmation must be explicit',false)$$,'22023',null,'confirmation is required');
select throws_ok($$select public.platform_save_plan(null,'quota-test','Quota','','draft',pg_temp.config(),0,'short',true)$$,'22023',null,'reason is validated');
select throws_ok($$select public.platform_save_plan(null,'quota-test','Quota','','draft',pg_temp.config(-1),0,'Negative quotas are rejected',true)$$,'22023',null,'negative quota denied');
select throws_ok($$select public.platform_save_plan(null,'quota-test','Quota','','draft',jsonb_set(pg_temp.config(),'{limits,contacts}','1.5'),0,'Fractional quota is invalid',true)$$,'22023',null,'fractional quota denied');
select throws_ok($$select public.platform_save_plan(null,'quota-test','Quota','','draft',pg_temp.config()||'{"unknown":true}',0,'Unknown keys cannot grant features',true)$$,'22023',null,'unknown config key denied');
select throws_ok($$select public.platform_save_plan(null,'quota-test','Quota','','draft',jsonb_set(pg_temp.config(),'{features,crm}','false'),0,'AI needs the CRM capability',true)$$,'22023',null,'dependency validated');
select lives_ok($$select public.platform_save_plan(null,'quota-test','Quota','','draft',pg_temp.config(),0,'Approved synthetic plan draft',true)$$,'create a versioned draft');
select throws_ok($$select public.platform_publish_plan(pg_temp.plan_id(),0,'Stale publication cannot overwrite',true)$$,'40001',null,'publication checks revision');
select lives_ok($$select public.platform_publish_plan(pg_temp.plan_id(),1,'Publish synthetic plan version one',true)$$,'publish immutable first version');
select throws_ok($$select public.platform_publish_plan(pg_temp.plan_id(),2,'No duplicate publication of same draft',true)$$,'22023',null,'no-op publication denied');
select throws_ok($$select public.platform_save_plan(pg_temp.plan_id(),'quota-test','Changed','','active',pg_temp.config(),1,'Stale draft must be rejected',true)$$,'40001',null,'draft edit checks revision');
select throws_ok($$select public.platform_assign_plan('10000000-3030-4030-8030-303030303001',pg_temp.version_id(1),1,'Internal owner workspace is protected',true)$$,'42501',null,'owner workspace cannot get a commercial plan');
select lives_ok($$select public.platform_assign_plan('20000000-3030-4030-8030-303030303002',pg_temp.version_id(1),1,'Assign published version to synthetic A',true)$$,'assign published version explicitly');
select throws_ok($$select public.platform_assign_plan('20000000-3030-4030-8030-303030303002',null,1,'Stale assignment must not remove plan',true)$$,'40001',null,'assignment checks current revision');
select pg_temp.plan_login('44444444-3030-4030-8030-303030303004');
select is(public.workspace_modules('20000000-3030-4030-8030-303030303002')->'whatsapp'->>'source','plan','plan inclusion intersects with feature flags');
select is(public.workspace_modules('20000000-3030-4030-8030-303030303002')->'whatsapp'->>'enabled','false','workspace flag cannot grant excluded module');
select lives_ok($$insert into public.contacts(id,workspace_id,name) values('60000000-3030-4030-8030-303030303006','20000000-3030-4030-8030-303030303002','A contact')$$,'contact below quota is created');
select throws_ok($$select public.create_lead_with_deal('20000000-3030-4030-8030-303030303002','Atomic quota lead',null,'manual','90000000-3030-4030-8030-303030303009')$$,'PGL01',null,'atomic lead rolls back when deal capacity is zero');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->'used'->>'contacts','1','rolled-back intake restores contact counter');
select is((select count(*)::int from public.contacts),1,'failed intake adds no orphan contact');
select lives_ok($$insert into public.contacts(workspace_id,name) values('20000000-3030-4030-8030-303030303002','Second contact')$$,'final available contact slot succeeds');
select throws_ok($$insert into public.contacts(workspace_id,name) values('20000000-3030-4030-8030-303030303002','Over quota')$$,'PGL01',null,'direct API inserts cannot bypass quota');
select lives_ok($$update public.contacts set name='Edited at quota' where id='60000000-3030-4030-8030-303030303006'$$,'quota does not block edits to existing data');
select lives_ok($$delete from public.contacts where name='Second contact'$$,'delete releases capacity');
select throws_ok($$insert into public.contacts(workspace_id,name) values('20000000-3030-4030-8030-303030303002','Bulk one'),('20000000-3030-4030-8030-303030303002','Bulk two')$$,'PGL01',null,'multirow overflow rolls back whole statement');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->'used'->>'contacts','1','bulk rollback preserves exact counter');
select lives_ok($$select public.create_workspace_task('20000000-3030-4030-8030-303030303002','First task')$$,'task RPC obeys capacity');
select throws_ok($$select public.create_workspace_task('20000000-3030-4030-8030-303030303002','Second task')$$,'PGL01',null,'task RPC cannot exceed plan');
select lives_ok($$update public.tasks set status='done'$$,'task can be completed at capacity');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->'used'->>'tasks','1','completed task remains stored usage');
select throws_ok($$select public.reserve_member_slot('20000000-3030-4030-8030-303030303002','invite@plans.test','viewer')$$,'PGL01',null,'seat capacity is enforced before external invitation');
select pg_temp.plan_login('22222222-3030-4030-8030-303030303002');
select lives_ok($$select public.platform_save_plan(pg_temp.plan_id(),'quota-test','Quota v2','','active',pg_temp.config(3,2,true),2,'Draft changes do not affect assigned version',true)$$,'edit draft separately');
select lives_ok($$select public.platform_publish_plan(pg_temp.plan_id(),3,'Publish synthetic version two',true)$$,'publish version two');
select pg_temp.plan_login('44444444-3030-4030-8030-303030303004');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->'plan'->>'version','1','publication does not silently migrate customers');
select is(public.workspace_modules('20000000-3030-4030-8030-303030303002')->'whatsapp'->>'enabled','false','published changes leave old inclusion intact');
select pg_temp.plan_login('22222222-3030-4030-8030-303030303002');
select lives_ok($$select public.platform_save_plan(pg_temp.plan_id(),'quota-test','Quota v2','','archived',pg_temp.config(3,2,true),4,'Retire plan for new assignments only',true)$$,'archive retains published snapshots');
select throws_ok($$select public.platform_assign_plan('20000000-3030-4030-8030-303030303002',pg_temp.version_id(2),2,'Archived plans reject new assignments',true)$$,'22023',null,'archived plan cannot be newly assigned');
select lives_ok($$select public.platform_save_plan(pg_temp.plan_id(),'quota-test','Quota v2','','active',pg_temp.config(3,2,true),5,'Restore active catalog eligibility',true)$$,'reactivate published catalog');
select lives_ok($$select public.platform_assign_plan('20000000-3030-4030-8030-303030303002',pg_temp.version_id(2),2,'Explicitly migrate synthetic workspace A',true)$$,'explicit version change applies');
select pg_temp.plan_login('44444444-3030-4030-8030-303030303004');
select is(public.workspace_modules('20000000-3030-4030-8030-303030303002')->'whatsapp'->>'enabled','true','new assigned inclusion restores module');
select lives_ok($$select public.reserve_member_slot('20000000-3030-4030-8030-303030303002','invite@plans.test','viewer')$$,'reserve last seat before invitation');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->>'reserved_members','1','reserved capacity is visible separately');
select throws_ok($$select public.reserve_member_slot('20000000-3030-4030-8030-303030303002','other@plans.test','viewer')$$,'PGL01',null,'reservation prevents a competing invitation from overbooking');
select throws_ok($$select public.complete_member_slot(pg_temp.slot_id(),'55555555-3030-4030-8030-303030303005')$$,'22023',null,'reservation cannot authorize another email');
select pg_temp.plan_login('55555555-3030-4030-8030-303030303005');
select throws_ok($$select public.complete_member_slot(pg_temp.slot_id(),'66666666-3030-4030-8030-303030303006')$$,'42501',null,'other workspace cannot steal reservation');
select lives_ok($$insert into public.contacts(workspace_id,name) values('30000000-3030-4030-8030-303030303003','Unassigned B')$$,'unassigned workspace retains prior behavior');
select pg_temp.plan_login('44444444-3030-4030-8030-303030303004');
select lives_ok($$select public.cancel_member_slot(pg_temp.slot_id())$$,'own pending reservation can be canceled');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->>'reserved_members','0','cancel releases seat');
select lives_ok($$select public.reserve_member_slot('20000000-3030-4030-8030-303030303002','invite@plans.test','viewer')$$,'a released seat can be reserved again');
select pg_temp.plan_login('22222222-3030-4030-8030-303030303002');
select lives_ok($$select public.platform_save_plan(pg_temp.plan_id(),'quota-test','Downgrade','','active',pg_temp.config(0,0,true),6,'Publish lower ceilings without deleting records',true)$$,'save downgrade configuration');
select lives_ok($$select public.platform_publish_plan(pg_temp.plan_id(),7,'Publish downgrade version three',true)$$,'publish downgrade');
select lives_ok($$select public.platform_assign_plan('20000000-3030-4030-8030-303030303002',pg_temp.version_id(3),3,'Preserve existing and in-flight authorized data',true)$$,'downgrade preserves existing usage');
select pg_temp.plan_login('44444444-3030-4030-8030-303030303004');
select lives_ok($$select public.complete_member_slot(pg_temp.slot_id(),'66666666-3030-4030-8030-303030303006')$$,'already granted seat completes even after concurrent downgrade');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->'used'->>'members','2','completion increments actual member stock once');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->>'reserved_members','0','completion clears reservation');
select throws_ok($$select public.reserve_member_slot('20000000-3030-4030-8030-303030303002','new@plans.test','viewer')$$,'PGL01',null,'downgrade blocks subsequent seat grants');
select throws_ok($$insert into public.contacts(workspace_id,name) values('20000000-3030-4030-8030-303030303002','No new overage')$$,'PGL01',null,'overage cannot grow through customer writes');
select is((select count(*)::int from public.contacts),1,'overage keeps original CRM data');
reset role;
select throws_ok($$update control_plane.plan_versions set name='Tampered'$$,'42501',null,'published versions cannot be rewritten');
select throws_ok($$delete from control_plane.plan_versions$$,'42501',null,'published history cannot be removed');
select ok(exists(select 1 from control_plane.admin_audit_logs where action='workspace.plan_assigned' and actor_user_id='22222222-3030-4030-8030-303030303002' and session_id='22222222-3030-4030-8030-303030303002' and before_data->'plan'->>'version'='2' and after_data->'plan'->>'version'='3'),'assignment audit records actor/session and exact versions');
select set_config('request.jwt.claim.sub','',true);select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select lives_ok($$insert into public.contacts(workspace_id,name) values('20000000-3030-4030-8030-303030303002','Preserved webhook intake')$$,'trusted inbound ingestion is retained over quota');
select throws_ok($$insert into public.workspace_members(workspace_id,user_id) values('20000000-3030-4030-8030-303030303002','55555555-3030-4030-8030-303030303005')$$,'PGL01',null,'service membership write cannot bypass seat capacity');
reset role;set local role authenticated;
select pg_temp.plan_login('44444444-3030-4030-8030-303030303004');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->'used'->>'contacts','2','inbound overage is accurately counted');
select pg_temp.plan_login('22222222-3030-4030-8030-303030303002');
select lives_ok($$select public.platform_assign_plan('20000000-3030-4030-8030-303030303002',null,4,'Remove synthetic commercial assignment',true)$$,'unassignment returns to current baseline');
select pg_temp.plan_login('44444444-3030-4030-8030-303030303004');
select is(public.workspace_plan('20000000-3030-4030-8030-303030303002')->'plan','null'::jsonb,'unassignment keeps revisioned history');
reset role;
delete from auth.mfa_factors where user_id='22222222-3030-4030-8030-303030303002';
set local role authenticated;
select pg_temp.plan_login('22222222-3030-4030-8030-303030303002');
select throws_ok($$select public.platform_plans()$$,'42501',null,'MFA removal immediately denies same-session plan administration');
reset role;
select * from finish();
rollback;
