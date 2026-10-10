-- Isolated synthetic fixtures; executed only by CI/local pgTAP, never against production.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,created_at,raw_user_meta_data) values
 ('11111111-2020-4010-8010-202010101001','owner@flags.test',now(),now(),'{}'),
 ('22222222-2020-4010-8010-202010101002','product@flags.test',now(),now(),'{}'),
 ('33333333-2020-4010-8010-202010101003','analyst@flags.test',now(),now(),'{}'),
 ('44444444-2020-4010-8010-202010101004','customer-a@flags.test',now(),now(),'{"platform_owner":true}'),
 ('55555555-2020-4010-8010-202010101005','customer-b@flags.test',now(),now(),'{}');
insert into auth.sessions(id,user_id,aal,created_at,updated_at) select id,id,'aal2',now(),now() from auth.users where email like '%@flags.test';
insert into auth.mfa_factors(id,user_id,factor_type,status,friendly_name,created_at,updated_at)
 select id,id,'totp','verified','Synthetic pgTAP factor',now(),now() from auth.users where email like '%@flags.test';
insert into public.workspaces(id,name,slug) values
 ('10000000-2020-4010-8010-202010101001','Flags Owner','flags-owner'),
 ('20000000-2020-4010-8010-202010101002','Flags A','flags-a'),
 ('30000000-2020-4010-8010-202010101003','Flags B','flags-b');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('10000000-2020-4010-8010-202010101001','11111111-2020-4010-8010-202010101001','owner'),
 ('10000000-2020-4010-8010-202010101001','22222222-2020-4010-8010-202010101002','viewer'),
 ('10000000-2020-4010-8010-202010101001','33333333-2020-4010-8010-202010101003','viewer'),
 ('20000000-2020-4010-8010-202010101002','44444444-2020-4010-8010-202010101004','owner'),
 ('30000000-2020-4010-8010-202010101003','55555555-2020-4010-8010-202010101005','owner');
insert into public.contacts(id,workspace_id,name) values
 ('60000000-2020-4010-8010-202010101001','20000000-2020-4010-8010-202010101002','Private A'),
 ('60000000-2020-4010-8010-202010101002','30000000-2020-4010-8010-202010101003','Private B');
insert into public.conversations(id,workspace_id,contact_id,channel) values
 ('70000000-2020-4010-8010-202010101001','20000000-2020-4010-8010-202010101002','60000000-2020-4010-8010-202010101001','whatsapp'),
 ('70000000-2020-4010-8010-202010101002','30000000-2020-4010-8010-202010101003','60000000-2020-4010-8010-202010101002','whatsapp');
insert into public.messages(workspace_id,conversation_id,direction,body) values
 ('20000000-2020-4010-8010-202010101002','70000000-2020-4010-8010-202010101001','in','Message A'),
 ('30000000-2020-4010-8010-202010101003','70000000-2020-4010-8010-202010101002','in','Message B');
select control_plane.bootstrap_owner('10000000-2020-4010-8010-202010101001','11111111-2020-4010-8010-202010101001','Synthetic operator approved provisioning');
insert into control_plane.platform_user_roles(user_id,role_code) values
 ('22222222-2020-4010-8010-202010101002','product_admin'),('33333333-2020-4010-8010-202010101003','analyst');
create function pg_temp.flags_login(p_user uuid,p_aal text default 'aal2') returns void language sql as $$
 select set_config('request.jwt.claim.sub',p_user::text,true);
 select set_config('request.jwt.claims',jsonb_build_object('sub',p_user,'session_id',p_user,'aal',p_aal,'role','authenticated')::text,true);
$$;
select is((select count(*)::int from control_plane.product_features),3,'catalog contains only implemented modules');
select ok(not has_table_privilege('authenticated','control_plane.feature_rules','SELECT,INSERT,UPDATE,DELETE'),'flag tables are not a client API');
select ok(not has_table_privilege('authenticated','control_plane.product_features','SELECT'),'catalog table stays private');
select ok(not has_function_privilege('authenticated','control_plane.resolve_module(uuid,text)','EXECUTE'),'raw resolver is ungranted');
select ok((select count(*)=3 and bool_and(not p.prosecdef) and bool_and(not has_function_privilege('anon',p.oid,'EXECUTE')) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('platform_product','platform_set_feature_rule','workspace_modules')),'all exposed product RPCs are invoker and deny anonymous');
select is((select count(*)::int from pg_policy where polname in ('CRM module access','WhatsApp module access') and not polpermissive),8,'feature fences intersect with tenant policies');
select ok((select bool_and(p.proconfig @> array['search_path=""']) from pg_proc p where p.pronamespace='control_plane'::regnamespace and p.prosecdef),'privileged functions pin search path');

set local role authenticated;
select pg_temp.flags_login('44444444-2020-4010-8010-202010101004');
select is(public.workspace_modules('20000000-2020-4010-8010-202010101002')->'crm'->>'enabled','true','existing CRM defaults to active');
select is(public.workspace_modules('20000000-2020-4010-8010-202010101002')->'growth_ai'->>'state','beta','AI beta preserves the current capability without provisioning a provider');
select is((select count(*)::int from public.contacts),1,'customer still reads only its contact');
select throws_ok($$select public.workspace_modules('30000000-2020-4010-8010-202010101003')$$,'42501',null,'customer cannot inspect another workspace flags');
select throws_ok($$select public.platform_product()$$,'42501',null,'workspace owner and user metadata do not grant product administration');
select throws_ok($$select public.platform_set_feature_rule('crm',null,'disabled',1,1,'Customer cannot administer flags',true)$$,'42501',null,'ordinary customer cannot mutate global flags');
select throws_ok($$select * from control_plane.feature_rules$$,'42501',null,'customer cannot read private rules');

select pg_temp.flags_login('11111111-2020-4010-8010-202010101001','aal1');
select throws_ok($$select public.platform_product()$$,'42501',null,'owner cannot read product before MFA');
select throws_ok($$select public.platform_set_feature_rule('crm',null,'disabled',1,1,'MFA is required for flag mutations',true)$$,'42501',null,'owner cannot mutate before MFA');
select pg_temp.flags_login('33333333-2020-4010-8010-202010101003');
select lives_ok($$select public.platform_product()$$,'analyst has product read access');
select throws_ok($$select public.platform_set_feature_rule('crm',null,'disabled',1,1,'Analyst must not edit availability',true)$$,'42501',null,'analyst cannot edit flags');
select pg_temp.flags_login('22222222-2020-4010-8010-202010101002');
select lives_ok($$select public.platform_product('20000000-2020-4010-8010-202010101002')$$,'product role can inspect workspace rules without CRM membership');
select throws_ok($$select public.workspace_modules('20000000-2020-4010-8010-202010101002')$$,'42501',null,'product role does not bypass customer membership');
select throws_ok($$select public.platform_users()$$,'42501',null,'product role gains no user administration');
select throws_ok($$select public.platform_set_role('33333333-2020-4010-8010-202010101003','super_admin',true,'Product role cannot escalate privileges',true)$$,'42501',null,'product role gains no role management');
select throws_ok($$select public.platform_product(null,repeat('a',81))$$,'22023',null,'catalog query is bounded');
select is((public.platform_product(null,'%')->>'total_workspaces')::int,0,'wildcards are treated literally');
select throws_ok($$select public.platform_product('99999999-2020-4010-8010-202010101009')$$,'22023',null,'unknown workspace is rejected');

select pg_temp.flags_login('11111111-2020-4010-8010-202010101001');
select throws_ok($$select public.platform_set_feature_rule('crm',null,'disabled',1,1,'No implicit confirmation permitted',false)$$,'22023',null,'confirmation is mandatory');
select throws_ok($$select public.platform_set_feature_rule('crm',null,'disabled',1,1,'short',true)$$,'22023',null,'reason is bounded');
select throws_ok($$select public.platform_set_feature_rule('crm',null,'inherit',1,1,'Global scope cannot inherit itself',true)$$,'22023',null,'global inheritance is invalid');
select throws_ok($$select public.platform_set_feature_rule('unknown',null,'disabled',1,1,'Only registered modules are accepted',true)$$,'22023',null,'unknown module is rejected');
select throws_ok($$select public.platform_set_feature_rule('crm',null,'enabled',1,1,'No-op edits are not persisted',true)$$,'22023',null,'no-op does not mutate revision');
select lives_ok($$select public.platform_set_feature_rule('crm','20000000-2020-4010-8010-202010101002','disabled',0,1,'Pause CRM for workspace A only',true)$$,'create an individual override');
select throws_ok($$select public.platform_set_feature_rule('crm','20000000-2020-4010-8010-202010101002','beta',0,1,'Stale first override must be rejected',true)$$,'40001',null,'a competing first override cannot overwrite the saved rule');
select is((public.platform_audit('feature.rule_changed')->>'total')::int,1,'failed edits append no mutation audit');
select is(public.platform_product('20000000-2020-4010-8010-202010101002')->'features'->0->'rule'->>'revision','1','workspace revision increments exactly once');

select pg_temp.flags_login('44444444-2020-4010-8010-202010101004');
select is(public.workspace_modules('20000000-2020-4010-8010-202010101002')->'crm'->>'enabled','false','override takes effect with the same session');
select is(public.workspace_modules('20000000-2020-4010-8010-202010101002')->'growth_ai'->>'source','dependency','AI cannot bypass paused CRM');
select is((select count(*)::int from public.contacts),0,'paused CRM denies contact reads via RLS');
select is(public.growth_overview('20000000-2020-4010-8010-202010101002')->'stats'->>'contacts','0','invoker summary cannot bypass feature RLS');
select is(public.contact_context('20000000-2020-4010-8010-202010101002','60000000-2020-4010-8010-202010101001'),null::jsonb,'contact RPC cannot read paused CRM data');
select throws_ok($$insert into public.contacts(workspace_id,name) values('20000000-2020-4010-8010-202010101002','Blocked write')$$,'42501',null,'paused CRM denies direct inserts');
select throws_ok($$select public.create_lead_with_deal('20000000-2020-4010-8010-202010101002','Blocked lead','5511991112222','manual','80000000-2020-4010-8010-202010101001')$$,'42501',null,'atomic lead intake cannot bypass feature RLS');
select is((select count(*)::int from public.conversations),1,'WhatsApp can remain active while CRM is paused');
select pg_temp.flags_login('55555555-2020-4010-8010-202010101005');
select is((select count(*)::int from public.contacts),1,'workspace A override does not affect workspace B');

select pg_temp.flags_login('11111111-2020-4010-8010-202010101001');
select lives_ok($$select public.platform_set_feature_rule('crm','20000000-2020-4010-8010-202010101002','beta',1,1,'Re-enable CRM in beta for workspace A',true)$$,'beta is an enabled state');
select pg_temp.flags_login('44444444-2020-4010-8010-202010101004');
select is(public.workspace_modules('20000000-2020-4010-8010-202010101002')->'crm'->>'enabled','true','beta restores access');
select is((select count(*)::int from public.contacts),1,'restored CRM retains the original record');
select pg_temp.flags_login('11111111-2020-4010-8010-202010101001');
select lives_ok($$select public.platform_set_feature_rule('crm','20000000-2020-4010-8010-202010101002','inherit',2,1,'Restore inheritance for workspace A',true)$$,'resetting to inheritance is versioned');
select is(public.platform_product('20000000-2020-4010-8010-202010101002')->'features'->0->'rule'->>'revision','3','inheritance keeps its revision rather than deleting audit state');
select lives_ok($$select public.platform_set_feature_rule('crm',null,'disabled',1,1,'Global pause of the operational module',true)$$,'global kill switch applies');
select lives_ok($$select public.platform_set_feature_rule('crm','30000000-2020-4010-8010-202010101003','enabled',0,2,'Prepare override without bypassing global pause',true)$$,'workspace rule can be prepared under a global pause');
select lives_ok($$select public.platform_product()$$,'Control Center stays accessible when operational CRM is paused');
select pg_temp.flags_login('55555555-2020-4010-8010-202010101005');
select is(public.workspace_modules('30000000-2020-4010-8010-202010101003')->'crm'->>'enabled','false','workspace enable cannot bypass global disabled');
select is(public.workspace_modules('30000000-2020-4010-8010-202010101003')->'crm'->>'source','global','global pause is explicit in effective state');
select is((select count(*)::int from public.contacts),0,'global pause intersects with a tenant override');
select pg_temp.flags_login('11111111-2020-4010-8010-202010101001');
select lives_ok($$select public.platform_set_feature_rule('crm',null,'enabled',2,2,'Restore global CRM availability',true)$$,'global reactivation is audited');
select throws_ok($$select public.platform_set_feature_rule('crm','20000000-2020-4010-8010-202010101002','disabled',3,1,'Do not apply a stale global preview',true)$$,'40001',null,'workspace edit also checks the displayed global revision');
select lives_ok($$select public.platform_set_feature_rule('whatsapp','20000000-2020-4010-8010-202010101002','disabled',0,1,'Pause WhatsApp use in workspace A',true)$$,'WhatsApp has an independent flag');
select pg_temp.flags_login('44444444-2020-4010-8010-202010101004');
select is((select count(*)::int from public.conversations),0,'paused WhatsApp hides conversations');
select is((select count(*)::int from public.messages),0,'paused WhatsApp hides message bodies');
select is((select count(*)::int from public.contacts),1,'WhatsApp pause preserves CRM access');

reset role;
select is((select count(*)::int from public.contacts where id in ('60000000-2020-4010-8010-202010101001','60000000-2020-4010-8010-202010101002')),2,'disabling features never removes business records');
select ok(exists(select 1 from control_plane.admin_audit_logs where action='feature.rule_changed' and actor_user_id='11111111-2020-4010-8010-202010101001' and session_id='11111111-2020-4010-8010-202010101001' and entity_id='crm:20000000-2020-4010-8010-202010101002' and before_data->>'state'='inherit' and after_data->>'state'='disabled' and reason='Pause CRM for workspace A only'),'audit preserves actor, session, scope, reason and before/after');
select throws_ok($$delete from control_plane.admin_audit_logs where action='feature.rule_changed'$$,'42501',null,'new product audit records remain append-only');
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
select lives_ok($$insert into public.messages(workspace_id,conversation_id,direction,body) values('20000000-2020-4010-8010-202010101002','70000000-2020-4010-8010-202010101001','in','Preserved inbound webhook')$$,'service webhook ingestion remains available during a pause');
select is((select count(*)::int from public.messages where workspace_id='20000000-2020-4010-8010-202010101002'),2,'inbound history is preserved');
reset role;
set local role authenticated;
select pg_temp.flags_login('11111111-2020-4010-8010-202010101001');
select lives_ok($$select public.platform_set_status('workspace','30000000-2020-4010-8010-202010101003','suspended','active','Suspend synthetic workspace B access',true)$$,'workspace suspension remains independent of flags');
select pg_temp.flags_login('55555555-2020-4010-8010-202010101005');
select throws_ok($$select public.workspace_modules('30000000-2020-4010-8010-202010101003')$$,'42501',null,'feature context respects workspace suspension');
select pg_temp.flags_login('22222222-2020-4010-8010-202010101002');
select lives_ok($$select public.platform_set_feature_rule('growth_ai',null,'disabled',1,1,'Product administrator pauses the AI module',true)$$,'product administrator can change its authorized domain');
reset role;
delete from auth.mfa_factors where user_id='22222222-2020-4010-8010-202010101002';
set local role authenticated;
select throws_ok($$select public.platform_product()$$,'42501',null,'same JWT cannot administer after MFA factor removal');
reset role;
select * from finish();
rollback;
