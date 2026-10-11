begin;
create extension if not exists pgtap with schema extensions;
select plan(36);
-- Synthetic, rollback-only fixtures. Never run this suite on a hosted project.
insert into auth.users(id,email,email_confirmed_at,created_at) values
 ('11111111-1111-4111-8111-111111111001','p0-owner@foundation-gap.test',now(),now()),
 ('22222222-1111-4111-8111-111111111002','p0-customer@foundation-gap.test',now(),now()),
 ('33333333-1111-4111-8111-111111111003','p0-analyst@foundation-gap.test',now(),now()),
 ('44444444-1111-4111-8111-111111111004','p0-support@foundation-gap.test',now(),now());
insert into auth.users(id,email,email_confirmed_at,created_at)
select ('70000000-1111-4111-8111-'||lpad(n::text,12,'0'))::uuid,'member-'||n||'@foundation-gap.test',now(),now() from generate_series(1,27) n;
insert into auth.sessions(id,user_id,aal,created_at,updated_at) select id,id,'aal2',now(),now() from auth.users where id::text like '%-1111-4111-8111-%';
insert into auth.mfa_factors(id,user_id,factor_type,status,friendly_name,created_at,updated_at) select id,id,'totp','verified','Synthetic P0 fixture',now(),now() from auth.users where id::text like '%-1111-4111-8111-%';
insert into public.workspaces(id,name,slug) values
 ('10000000-1111-4111-8111-111111111001','P0 Owner','p0-owner'),
 ('20000000-1111-4111-8111-111111111002','P0 Customer','p0-customer'),
 ('30000000-1111-4111-8111-111111111003','P0 Other','p0-other');
insert into public.workspace_members(workspace_id,user_id,role) values
 ('10000000-1111-4111-8111-111111111001','11111111-1111-4111-8111-111111111001','owner'),
 ('10000000-1111-4111-8111-111111111001','33333333-1111-4111-8111-111111111003','viewer'),
 ('10000000-1111-4111-8111-111111111001','44444444-1111-4111-8111-111111111004','support'),
 ('20000000-1111-4111-8111-111111111002','22222222-1111-4111-8111-111111111002','owner'),
 ('30000000-1111-4111-8111-111111111003','22222222-1111-4111-8111-111111111002','owner');
insert into public.workspace_members(workspace_id,user_id,role) select '20000000-1111-4111-8111-111111111002',id,'sales' from auth.users where email like 'member-%@foundation-gap.test';
insert into public.contacts(workspace_id,name) values
 ('10000000-1111-4111-8111-111111111001','Owner private contact'),
 ('20000000-1111-4111-8111-111111111002','Customer private contact');
select control_plane.bootstrap_owner('10000000-1111-4111-8111-111111111001','11111111-1111-4111-8111-111111111001','Synthetic P0 fixture bootstrap approved');
insert into control_plane.platform_user_roles(user_id,role_code) values
 ('33333333-1111-4111-8111-111111111003','analyst'),('44444444-1111-4111-8111-111111111004','support_admin');
create function pg_temp.login_user(p_user uuid,p_aal text default 'aal2') returns void language sql as $$
 select set_config('request.jwt.claim.sub',p_user::text,true);
 select set_config('request.jwt.claims',jsonb_build_object('sub',p_user,'session_id',p_user,'aal',p_aal,'role','authenticated')::text,true);
$$;
select ok((select count(*)=2 and bool_and(not prosecdef) and bool_and(proconfig @> array['search_path=""']) and bool_and(not has_function_privilege('anon',p.oid,'EXECUTE')) and bool_and(not has_function_privilege('service_role',p.oid,'EXECUTE')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('platform_users_filtered','platform_workspace_members')),'new facades are invoker, pinned and anonymous/service denied');
select ok(not has_function_privilege('authenticated','control_plane.write_audit(text,text,text,jsonb,jsonb,text)','EXECUTE'),'audit helper stays uncallable');
select ok((select actor_roles is null and workspace_id is null from control_plane.admin_audit_logs where action='platform.owner_provisioned'),'unknown bootstrap role/context are not fabricated');
set local role authenticated;
select pg_temp.login_user('22222222-1111-4111-8111-111111111002');
select throws_ok($$select public.platform_users_filtered()$$,'42501',null,'ordinary owner cannot list filtered Auth users');
select throws_ok($$select public.platform_workspace_members('20000000-1111-4111-8111-111111111002')$$,'42501',null,'ordinary owner cannot use platform roster RPC even for own tenant');
select pg_temp.login_user('11111111-1111-4111-8111-111111111001','aal1');
select throws_ok($$select public.platform_users_filtered()$$,'42501',null,'new users RPC requires current MFA');
select throws_ok($$select public.platform_workspace_members('20000000-1111-4111-8111-111111111002')$$,'42501',null,'new roster RPC requires current MFA');
select pg_temp.login_user('11111111-1111-4111-8111-111111111001');
select is((public.platform_users_filtered('','all',1,'20000000-1111-4111-8111-111111111002')->>'total')::int,28,'workspace membership filter counts exact distinct users');
select is(jsonb_array_length(public.platform_users_filtered('','all',1,'20000000-1111-4111-8111-111111111002')->'items'),25,'filtered users first page is bounded');
select is(jsonb_array_length(public.platform_users_filtered('','all',2,'20000000-1111-4111-8111-111111111002')->'items'),3,'filtered users second page retains exact scope');
select is((public.platform_users_filtered('p0-customer','all',1,'30000000-1111-4111-8111-111111111003')->>'total')::int,1,'membership in multiple workspaces does not duplicate a user');
select is((public.platform_users_filtered('p0-owner','all',1,'20000000-1111-4111-8111-111111111002')->>'total')::int,0,'user query intersects workspace filter');
select is((public.platform_users_filtered('','all',1,'90000000-1111-4111-8111-111111111009')->>'total')::int,0,'unknown workspace filter returns empty rather than all users');
select is((public.platform_users('p0-customer','all',1)->>'total')::int,1,'legacy users facade remains compatible');
select ok(not ((public.platform_users_filtered('p0-customer')->'items'->0) ?| array['encrypted_password','recovery_token','raw_user_meta_data','access_token','refresh_token']),'filtered users expose no credential or mutable authorization payload');
select throws_ok($$select public.platform_users_filtered('','all',0)$$,'22023',null,'users validates pagination in database');
select throws_ok($$select public.platform_users_filtered('','deleted',1)$$,'22023',null,'users validates status in database');
select is((public.platform_workspace_members('20000000-1111-4111-8111-111111111002')->>'total')::int,28,'roster has exact membership total');
select is(jsonb_array_length(public.platform_workspace_members('20000000-1111-4111-8111-111111111002')->'items'),25,'roster first page bounded to 25');
select is(jsonb_array_length(public.platform_workspace_members('20000000-1111-4111-8111-111111111002',2)->'items'),3,'roster second page returns remaining members');
select is(public.platform_workspace_members('20000000-1111-4111-8111-111111111002')->'items'->0->>'role','owner','roster reports actual tenant membership role');
select ok(not ((public.platform_workspace_members('20000000-1111-4111-8111-111111111002')->'items'->0) ?| array['encrypted_password','sessions','contacts','deals','access_token']),'roster excludes Auth secrets and CRM data');
select is((select count(*)::int from public.contacts),1,'platform roster does not bypass CRM tenant RLS');
select throws_ok($$select public.platform_workspace_members(null)$$,'22023',null,'null workspace invalid');
select throws_ok($$select public.platform_workspace_members('90000000-1111-4111-8111-111111111009')$$,'22023',null,'nonexistent workspace invalid');
select throws_ok($$select public.platform_workspace_members('20000000-1111-4111-8111-111111111002',10001)$$,'22023',null,'roster validates page bound');
select pg_temp.login_user('33333333-1111-4111-8111-111111111003');
select throws_ok($$select public.platform_users_filtered()$$,'42501',null,'analyst cannot read users');
select throws_ok($$select public.platform_workspace_members('20000000-1111-4111-8111-111111111002')$$,'42501',null,'workspaces.read alone cannot disclose member identity');
select pg_temp.login_user('44444444-1111-4111-8111-111111111004');
select lives_ok($$select public.platform_workspace_members('20000000-1111-4111-8111-111111111002')$$,'support with both read permissions may consult roster');
reset role;
delete from control_plane.platform_role_permissions where role_code='support_admin' and permission_code='workspaces.read';
set local role authenticated;
select is(jsonb_array_length(public.platform_users_filtered()->'workspace_choices'),0,'users.read alone does not reveal workspace choices');
select throws_ok($$select public.platform_workspace_members('20000000-1111-4111-8111-111111111002')$$,'42501',null,'users.read alone cannot disclose workspace roster');
reset role;
select ok(exists(select 1 from control_plane.admin_audit_logs where action='workspace.viewed' and actor_user_id='11111111-1111-4111-8111-111111111001' and workspace_id='20000000-1111-4111-8111-111111111002' and actor_roles=array['platform_owner']::text[]),'workspace view snapshots actual actor roles and target UUID');
select ok(exists(select 1 from control_plane.admin_audit_logs where action='users.listed' and workspace_id='20000000-1111-4111-8111-111111111002'),'filtered user consultation records workspace context');
insert into control_plane.platform_user_roles(user_id,role_code) values ('11111111-1111-4111-8111-111111111001','viewer');
set local role authenticated;
select pg_temp.login_user('11111111-1111-4111-8111-111111111001');
do $$ begin perform public.platform_users_filtered(); end $$;
reset role;
delete from control_plane.platform_user_roles where user_id='11111111-1111-4111-8111-111111111001' and role_code='viewer';
select ok(exists(select 1 from control_plane.admin_audit_logs where action='users.listed' and actor_roles=array['platform_owner','viewer']::text[]),'historical role snapshot survives role removal');
set local role authenticated;
select ok(exists(select 1 from jsonb_array_elements(public.platform_audit()->'items') a where a ? 'actor_roles' and a ? 'workspace_id'),'audited facade exposes stored context');
set local role anon;
select throws_ok($$select public.platform_workspace_members('20000000-1111-4111-8111-111111111002')$$,'42501',null,'anonymous cannot call roster facade');
reset role;
select * from finish();
rollback;
