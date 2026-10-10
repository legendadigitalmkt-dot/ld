begin;
create extension if not exists pgtap with schema extensions;
select plan(87);

-- Synthetic fixtures only; the whole suite rolls back. No production UUIDs.
insert into auth.users(id,email,email_confirmed_at,created_at,raw_user_meta_data) values
 ('11111111-1010-4010-8010-101010101001','platform-owner@ld.test',now(),now(),'{}'),
 ('22222222-1010-4010-8010-101010101002','customer-owner@ld.test',now(),now(),'{"role":"platform_owner","platform_owner":true}'),
 ('33333333-1010-4010-8010-101010101003','platform-viewer@ld.test',now(),now(),'{}'),
 ('44444444-1010-4010-8010-101010101004','platform-candidate@ld.test',now(),now(),'{}'),
 ('55555555-1010-4010-8010-101010101005','unconfirmed@ld.test',null,now(),'{}');
insert into auth.sessions(id,user_id,aal,created_at,updated_at) select id,id,'aal2',now(),now() from auth.users where email like '%@ld.test' and id::text like '%-1010-%';
insert into auth.mfa_factors(id,user_id,factor_type,status,friendly_name) select id,id,'totp','verified','Synthetic pgTAP factor' from auth.users where email like '%@ld.test' and id::text like '%-1010-%';
insert into public.workspaces(id,name,slug) values
 ('10000000-1010-4010-8010-101010101001','Owner Test','control-owner-test'),
 ('20000000-1010-4010-8010-101010101002','Customer Test','control-customer-test');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('10000000-1010-4010-8010-101010101001','11111111-1010-4010-8010-101010101001','owner'),
 ('10000000-1010-4010-8010-101010101001','33333333-1010-4010-8010-101010101003','viewer'),
 ('10000000-1010-4010-8010-101010101001','44444444-1010-4010-8010-101010101004','admin'),
 ('10000000-1010-4010-8010-101010101001','55555555-1010-4010-8010-101010101005','viewer'),
 ('20000000-1010-4010-8010-101010101002','22222222-1010-4010-8010-101010101002','owner');
insert into public.contacts(workspace_id,name) values ('10000000-1010-4010-8010-101010101001','Owner Contact'),('20000000-1010-4010-8010-101010101002','Private Customer Contact');
create function pg_temp.login_user(p_user uuid,p_aal text default 'aal2') returns void language sql as $$
 select set_config('request.jwt.claim.sub',p_user::text,true);
 select set_config('request.jwt.claims',jsonb_build_object('sub',p_user,'session_id',p_user,'aal',p_aal,'role','authenticated')::text,true);
$$;

select is((select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='control_plane' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),8,'all private control tables force RLS');
select ok(not has_table_privilege('authenticated','control_plane.platform_user_roles','SELECT,INSERT,UPDATE,DELETE'),'clients cannot read or edit role assignments directly');
select ok(not has_table_privilege('authenticated','control_plane.admin_audit_logs','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'),'clients cannot forge or erase audit records');
select ok(not has_function_privilege('authenticated','control_plane.bootstrap_owner(uuid,uuid,text)','EXECUTE'),'bootstrap is operator only');
select ok(not has_function_privilege('authenticated','control_plane.write_audit(text,text,text,jsonb,jsonb,text)','EXECUTE'),'clients cannot forge audit via helper');
select ok((select count(*)=11 and bool_and(not p.prosecdef) and bool_and(not has_function_privilege('anon',p.oid,'EXECUTE')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('account_access','platform_context','platform_overview','platform_users','platform_workspaces','platform_audit','platform_roles','platform_settings','platform_set_status','platform_set_role','platform_save_settings')),'all exposed control functions are invoker and anonymous denied');
select ok((select bool_and(p.proconfig @> array['search_path=""']) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='control_plane' and p.prosecdef),'all privileged functions pin an empty search path');
select throws_ok($$select control_plane.bootstrap_owner('10000000-1010-4010-8010-101010101001','55555555-1010-4010-8010-101010101005','Initial approved provisioning')$$,'22023',null,'unconfirmed or non-owner bootstrap denied');
select lives_ok($$select control_plane.bootstrap_owner('10000000-1010-4010-8010-101010101001','11111111-1010-4010-8010-101010101001','Synthetic operator approved provisioning')$$,'operator explicitly provisions a confirmed owner');
select throws_ok($$select control_plane.bootstrap_owner('20000000-1010-4010-8010-101010101002','22222222-1010-4010-8010-101010101002','Second bootstrap is denied')$$,'22023',null,'a second owner workspace cannot be promoted');
select is((select count(*)::int from control_plane.admin_audit_logs where action='platform.owner_provisioned'),1,'bootstrap produces a single immutable audit');

set local role authenticated;
select pg_temp.login_user('22222222-1010-4010-8010-101010101002');
select is(public.platform_context()->>'eligible','false','CRM owner cannot become platform admin using user metadata');
select throws_ok($$select public.platform_overview()$$,'42501',null,'ordinary workspace owner cannot read admin overview');
select throws_ok($$select public.platform_users()$$,'42501',null,'ordinary owner cannot list Auth users');
select is((select count(*)::int from public.contacts),1,'ordinary owner only reads its CRM contact');
select throws_ok($$select * from control_plane.platform_user_roles$$,'42501',null,'direct private role table inaccessible');

select pg_temp.login_user('11111111-1010-4010-8010-101010101001','aal1');
select is(public.platform_context()->>'eligible','true','actual owner may reach MFA verification');
select is(public.platform_context()->>'mfa_verified','false','aal1 cannot enter console');
select is(jsonb_array_length(public.platform_context()->'permissions'),0,'pre-MFA context has no effective permissions');
select throws_ok($$select public.platform_users()$$,'42501',null,'admin API denied before MFA');
select pg_temp.login_user('11111111-1010-4010-8010-101010101001');
select is(public.platform_context()->>'mfa_verified','true','verified factor plus current aal2 session unlocks owner');
select is((select count(*)::int from public.contacts),1,'platform role does not override customer CRM RLS');
select lives_ok($$select public.platform_users()$$,'MFA owner can read allowlisted user metadata');
select is((public.platform_users('platform-owner','all',1)->>'total')::int,1,'user search bounded to matching fixture');
select ok(not ((public.platform_users('platform-owner')->'items'->0) ?| array['encrypted_password','recovery_token','refresh_token','access_token','raw_user_meta_data']),'admin user response excludes hashes and tokens');
select lives_ok($$select public.platform_workspaces()$$,'admin reads workspace metadata and counts');
select throws_ok($$select public.platform_users('', 'all',0)$$,'22023',null,'RPC validates page independently');
select throws_ok($$select public.platform_users(repeat('x',81))$$,'22023',null,'RPC caps query length');
select throws_ok($$select public.platform_set_role('11111111-1010-4010-8010-101010101001','viewer',true,'Self promotion is forbidden',true)$$,'42501',null,'self role changes denied');
select throws_ok($$select public.platform_set_role('33333333-1010-4010-8010-101010101003','platform_owner',true,'Owner role cannot be assigned',true)$$,'42501',null,'owner role cannot be granted via RPC');
select throws_ok($$select public.platform_set_role('22222222-1010-4010-8010-101010101002','viewer',true,'External customer must not be promoted',true)$$,'22023',null,'role target must belong to owner workspace');
select throws_ok($$select public.platform_set_role('55555555-1010-4010-8010-101010101005','viewer',true,'Unconfirmed member cannot be promoted',true)$$,'22023',null,'unconfirmed member cannot get a role');
select throws_ok($$select public.platform_set_role('33333333-1010-4010-8010-101010101003','viewer',true,'Confirmation must be explicit',false)$$,'22023',null,'grant needs explicit confirmation');
select lives_ok($$select public.platform_set_role('33333333-1010-4010-8010-101010101003','viewer',true,'Approved synthetic read-only access',true)$$,'owner can grant viewer to a confirmed member');
select pg_temp.login_user('33333333-1010-4010-8010-101010101003');
select lives_ok($$select public.platform_overview()$$,'viewer can read aggregate overview');
select is(public.platform_overview()->'audit','null'::jsonb,'viewer overview hides audit and actor emails');
select throws_ok($$select public.platform_users()$$,'42501',null,'viewer cannot list users');
select throws_ok($$select public.platform_audit()$$,'42501',null,'viewer cannot read audit');
select throws_ok($$select public.platform_set_role('44444444-1010-4010-8010-101010101004','super_admin',true,'Viewer cannot escalate privilege',true)$$,'42501',null,'viewer cannot grant elevated roles');
select pg_temp.login_user('11111111-1010-4010-8010-101010101001');
select lives_ok($$select public.platform_set_role('33333333-1010-4010-8010-101010101003','viewer',false,'Approved removal of temporary access',true)$$,'owner can revoke viewer');
select pg_temp.login_user('33333333-1010-4010-8010-101010101003');
select is(public.platform_context()->>'eligible','false','revocation applies immediately with the same JWT');
select throws_ok($$select public.platform_overview()$$,'42501',null,'revoked actor cannot keep using admin APIs');

select pg_temp.login_user('11111111-1010-4010-8010-101010101001');
select lives_ok($$select public.platform_set_role('44444444-1010-4010-8010-101010101004','security_admin',true,'Approved synthetic security operator',true)$$,'owner grants scoped security role');
select pg_temp.login_user('44444444-1010-4010-8010-101010101004');
select lives_ok($$select public.platform_audit()$$,'security administrator can inspect audit');
select lives_ok($$select public.platform_roles()$$,'security administrator can read role catalog');
select throws_ok($$select public.platform_set_role('33333333-1010-4010-8010-101010101003','super_admin',true,'Security cannot grant admin privilege',true)$$,'42501',null,'security administrator cannot grant roles');
select throws_ok($$select public.platform_set_status('workspace','20000000-1010-4010-8010-101010101002','suspended','active','Security lacks workspace suspension',true)$$,'42501',null,'user suspension permission does not imply workspace suspension');
select throws_ok($$select public.platform_save_settings(1,'Forbidden Platform','UTC','','Security lacks settings write privilege',true)$$,'42501',null,'settings read permission does not imply write');

select pg_temp.login_user('11111111-1010-4010-8010-101010101001');
select throws_ok($$select public.platform_set_status('user','11111111-1010-4010-8010-101010101001','suspended','active','Owner must never be suspended',true)$$,'42501',null,'owner/self suspension denied');
select throws_ok($$select public.platform_set_status('workspace','10000000-1010-4010-8010-101010101001','suspended','active','Owner workspace is protected',true)$$,'42501',null,'owner workspace suspension denied');
select throws_ok($$select public.platform_set_status('user','22222222-1010-4010-8010-101010101002','suspended','active','short',true)$$,'22023',null,'status change validates reason');
select throws_ok($$select public.platform_set_status('user','22222222-1010-4010-8010-101010101002','suspended','active','Explicit confirmation required',false)$$,'22023',null,'status change validates confirmation');
select lives_ok($$select public.platform_set_status('user','22222222-1010-4010-8010-101010101002','suspended','active','Synthetic access suspension for RLS test',true)$$,'owner suspends synthetic account');
select pg_temp.login_user('22222222-1010-4010-8010-101010101002');
select is(public.account_access(),false,'suspended identity rejected authoritatively');
select is((select count(*)::int from public.contacts),0,'suspended user cannot read CRM even with a valid JWT');
select throws_ok($$select public.growth_overview('20000000-1010-4010-8010-101010101002',30)$$,'42501',null,'suspension covers existing aggregate RPCs');
select pg_temp.login_user('11111111-1010-4010-8010-101010101001');
select throws_ok($$select public.platform_set_status('user','22222222-1010-4010-8010-101010101002','active','active','Stale screen cannot overwrite status',true)$$,'40001',null,'stale status update is rejected');
select lives_ok($$select public.platform_set_status('user','22222222-1010-4010-8010-101010101002','active','suspended','Synthetic account reactivation approved',true)$$,'reactivation restores account');
select pg_temp.login_user('22222222-1010-4010-8010-101010101002');
select is((select count(*)::int from public.contacts),1,'reactivation preserves contact data');
select pg_temp.login_user('11111111-1010-4010-8010-101010101001');
select lives_ok($$select public.platform_set_status('workspace','20000000-1010-4010-8010-101010101002','suspended','active','Synthetic workspace suspension approved',true)$$,'owner suspends synthetic customer workspace');
select pg_temp.login_user('22222222-1010-4010-8010-101010101002');
select is(public.account_access(),true,'workspace suspension does not disable the whole identity');
select is((select count(*)::int from public.contacts),0,'suspended workspace hides tenant contacts');
select throws_ok($$insert into public.contacts(workspace_id,name) values ('20000000-1010-4010-8010-101010101002','Blocked write')$$,'42501',null,'suspended workspace rejects CRM writes');
set local role service_role;
select is((select count(*)::int from public.contacts where workspace_id='20000000-1010-4010-8010-101010101002'),1,'service-role ingestion can still address suspended workspace');
select lives_ok($$insert into public.contacts(workspace_id,name,owner_user_id) values ('20000000-1010-4010-8010-101010101002','Synthetic webhook intake','22222222-1010-4010-8010-101010101002')$$,'service-role ingestion still writes valid tenant data');
reset role;
select ok(private.workspace_has_user('20000000-1010-4010-8010-101010101002','22222222-1010-4010-8010-101010101002'),'membership integrity helper remains valid during suspension');
set local role authenticated;
select pg_temp.login_user('11111111-1010-4010-8010-101010101001');
select lives_ok($$select public.platform_set_status('workspace','20000000-1010-4010-8010-101010101002','active','suspended','Synthetic workspace reactivation approved',true)$$,'owner reactivates customer workspace');

select lives_ok($$select public.platform_save_settings(1,'Test Platform','UTC','support@ld.test','Approved synthetic general settings change',true)$$,'allowlisted settings can be updated');
select is(public.platform_settings()->>'timezone','UTC','administrative timezone persists');
select is(public.platform_context()->'presentation'->>'display_name','Test Platform','safe presentation fields follow settings');
select throws_ok($$select public.platform_save_settings(1,'Stale Platform','UTC','','Stale settings must not overwrite data',true)$$,'40001',null,'stale settings revision is rejected');
select throws_ok($$select public.platform_save_settings(2,'Invalid Platform','Not/AZone','','Timezone independently validated',true)$$,'22023',null,'invalid timezone denied');
select throws_ok($$select public.platform_save_settings(2,'Invalid Platform','UTC','invalid','Email independently validated',true)$$,'22023',null,'invalid email denied');
select lives_ok($$select public.platform_audit()$$,'owner can read audit');
select throws_ok($$update control_plane.admin_audit_logs set reason='Client cannot rewrite history'$$,'42501',null,'client cannot rewrite audit');
reset role;
select ok((select before_data='{"status":"active"}'::jsonb and after_data='{"status":"suspended"}'::jsonb and actor_user_id='11111111-1010-4010-8010-101010101001' from control_plane.admin_audit_logs where action='user.suspended'),'status transition and actor are atomically audited');
select is((select count(*)::int from control_plane.admin_audit_logs where action='settings.changed'),1,'failed settings writes leave no partial audit entries');
select is((select count(*)::int from control_plane.admin_audit_logs where action='role.granted'),2,'denied grants leave no role audit or mutation');
select throws_ok($$delete from control_plane.admin_audit_logs$$,'42501',null,'even the operator cannot casually delete audit');
select throws_ok($$update control_plane.admin_audit_logs set reason='Operator cannot rewrite history'$$,'42501',null,'append-only trigger guards operator updates');

update auth.sessions set aal='aal1' where user_id='11111111-1010-4010-8010-101010101001';
set local role authenticated;
select pg_temp.login_user('11111111-1010-4010-8010-101010101001');
select throws_ok($$select public.platform_users()$$,'42501',null,'JWT aal2 cannot bypass a current aal1 session');
reset role;
update auth.sessions set aal='aal2',not_after=now()-interval '1 minute' where user_id='11111111-1010-4010-8010-101010101001';
set local role authenticated;
select is(public.platform_context()->>'eligible','false','expired server session invalidates cached JWT');
reset role;
update auth.sessions set not_after=null where user_id='11111111-1010-4010-8010-101010101001';
update auth.mfa_factors set status='unverified' where user_id='11111111-1010-4010-8010-101010101001';
set local role authenticated;
select throws_ok($$select public.platform_users()$$,'42501',null,'removing verified MFA invalidates cached aal2');
reset role;
update auth.mfa_factors set status='verified' where user_id='11111111-1010-4010-8010-101010101001';
update auth.users set banned_until=now()+interval '1 day' where id='11111111-1010-4010-8010-101010101001';
set local role authenticated;
select is(public.account_access(),false,'Auth bans remain authoritative');
reset role;
update auth.users set banned_until=null where id='11111111-1010-4010-8010-101010101001';
delete from auth.sessions where user_id='11111111-1010-4010-8010-101010101001';
set local role authenticated;
select is(public.platform_context()->>'eligible','false','deleted session denies admin access with same JWT');
set local role anon;
select throws_ok($$select public.platform_context()$$,'42501',null,'anonymous context RPC denied');
select throws_ok($$select public.platform_users()$$,'42501',null,'anonymous user list RPC denied');
reset role;
select * from finish();
rollback;
