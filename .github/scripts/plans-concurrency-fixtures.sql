-- Committed synthetic fixtures ONLY in the disposable local CI database.
insert into auth.users(id,email,email_confirmed_at,created_at) values
 ('77777777-4040-4040-8040-404040404007','race@plans.invalid',now(),now());
insert into auth.sessions(id,user_id,aal,created_at,updated_at) values
 ('77777777-4040-4040-8040-404040404007','77777777-4040-4040-8040-404040404007','aal1',now(),now());
insert into public.workspaces(id,name,slug) values
 ('40000000-4040-4040-8040-404040404004','CI race committed','ci-race-committed'),
 ('50000000-4040-4040-8040-404040404005','CI race repeatable','ci-race-repeatable');
insert into public.workspace_members(workspace_id,user_id,role) select id,'77777777-4040-4040-8040-404040404007','owner' from public.workspaces where slug like 'ci-race-%';
insert into control_plane.plans(code,name,draft_config) values('ci-race','CI quota', '{"features":{"crm":true,"whatsapp":true,"growth_ai":true},"limits":{"contacts":1,"deals":null,"tasks":null,"members":2}}');
insert into control_plane.plan_versions(plan_id,version,name,description,config,published_by) select id,1,name,'CI only',draft_config,'77777777-4040-4040-8040-404040404007' from control_plane.plans where code='ci-race';
update control_plane.plans set status='active',latest_version=1,published_revision=1 where code='ci-race';
update control_plane.workspace_plan_assignments set plan_version_id=(select v.id from control_plane.plan_versions v join control_plane.plans p on p.id=v.plan_id where p.code='ci-race') where workspace_id in ('40000000-4040-4040-8040-404040404004','50000000-4040-4040-8040-404040404005');
