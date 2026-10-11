-- P0 gaps only. Historical audit fields remain NULL; no business/Auth changes.
-- Single statement keeps DDL, function replacements and grants atomic.
do $control_p0$
begin
set local lock_timeout='5s';
alter table control_plane.admin_audit_logs add column actor_roles text[],add column workspace_id uuid;
create or replace function control_plane.write_audit(p_action text,p_entity_type text,p_entity_id text,p_before jsonb,p_after jsonb,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null then raise exception 'Ator ausente.' using errcode='42501'; end if;
 insert into control_plane.admin_audit_logs(actor_user_id,actor_type,session_id,action,entity_type,entity_id,before_data,after_data,reason,actor_roles,workspace_id)
 values ((select auth.uid()),'admin',nullif(auth.jwt()->>'session_id','')::uuid,p_action,p_entity_type,p_entity_id,p_before,p_after,control_plane.valid_reason(p_reason),coalesce((select array_agg(role_code order by role_code) from control_plane.platform_user_roles where user_id=(select auth.uid())),array[]::text[]),case when p_entity_type='workspace' then p_entity_id::uuid else nullif(p_after->>'workspace_id','')::uuid end);
end $$;

create or replace function control_plane.audit_items(p_limit integer) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'actor',u.email,'actor_id',x.actor_user_id,'actor_type',x.actor_type,'actor_roles',x.actor_roles,'workspace_id',x.workspace_id,'action',x.action,'entity_type',x.entity_type,'entity_id',x.entity_id,'before',x.before_data,'after',x.after_data,'reason',x.reason,'created_at',x.created_at) order by x.created_at desc,x.id),'[]'::jsonb)
 from (select * from control_plane.admin_audit_logs order by created_at desc,id limit p_limit) x left join auth.users u on u.id=x.actor_user_id;
$$;

create or replace function control_plane.audit(p_query text,p_page integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pattern text; total bigint; items jsonb;
begin
 perform control_plane.assert_permission('audit.read');
 if p_query is null or char_length(p_query)>80 or p_page not between 1 and 10000 or p_page is null then raise exception 'Filtro inválido.' using errcode='22023'; end if;
 pattern := '%' || replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_') || '%';
 perform control_plane.write_audit('audit.viewed','audit',null,null,null,'Consulta paginada da trilha administrativa.');
 select count(*) into total from control_plane.admin_audit_logs a where p_query='' or a.action ilike pattern or a.entity_id=p_query;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'actor',u.email,'actor_id',a.actor_user_id,'actor_type',a.actor_type,'actor_roles',a.actor_roles,'workspace_id',a.workspace_id,'action',a.action,'entity_type',a.entity_type,'entity_id',a.entity_id,'before',a.before_data,'after',a.after_data,'reason',a.reason,'created_at',a.created_at) order by a.created_at desc,a.id),'[]'::jsonb) into items
 from (select * from control_plane.admin_audit_logs where p_query='' or action ilike pattern or entity_id=p_query order by created_at desc,id limit 25 offset (p_page-1)*25) a left join auth.users u on u.id=a.actor_user_id;
 return jsonb_build_object('items',items,'total',total,'page',p_page,'page_size',25);
end $$;

create function control_plane.users_filtered(p_query text,p_status text,p_page integer,p_workspace uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pattern text; total bigint; items jsonb; choices jsonb;
begin
 perform control_plane.assert_permission('users.read');
 if p_query is null or char_length(p_query)>80 or p_status not in ('all','active','suspended') or p_status is null or p_page not between 1 and 10000 or p_page is null then raise exception 'Filtro inválido.' using errcode='22023'; end if;
 pattern := '%' || replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_') || '%';
 select count(*) into total from auth.users u left join public.profiles p on p.id=u.id left join control_plane.platform_user_controls c on c.user_id=u.id where u.deleted_at is null and (p_query='' or u.email ilike pattern or p.full_name ilike pattern or u.id::text=p_query) and (p_status='all' or coalesce(c.status,'active')=p_status) and (p_workspace is null or exists(select 1 from public.workspace_members wm where wm.user_id=u.id and wm.workspace_id=p_workspace));
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'name',p.full_name,'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,'confirmed',u.email_confirmed_at is not null,'status',coalesce(c.status,'active'),
  'sessions',(select count(*) from auth.sessions s where s.user_id=u.id and (s.not_after is null or s.not_after>now())),
  'verified_mfa',exists(select 1 from auth.mfa_factors f where f.user_id=u.id and f.status='verified'),
  'memberships',(select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'role',m.role) order by w.name),'[]'::jsonb) from public.workspace_members m join public.workspaces w on w.id=m.workspace_id where m.user_id=u.id),
  'platform_roles',(select coalesce(jsonb_agg(ur.role_code order by ur.role_code),'[]'::jsonb) from control_plane.platform_user_roles ur where ur.user_id=u.id),
  'protected',exists(select 1 from control_plane.platform_user_roles ur where ur.user_id=u.id and ur.role_code='platform_owner')
 ) order by u.created_at desc,u.id),'[]'::jsonb) into items
 from (select a.* from auth.users a left join public.profiles pf on pf.id=a.id left join control_plane.platform_user_controls sc on sc.user_id=a.id where a.deleted_at is null and (p_query='' or a.email ilike pattern or pf.full_name ilike pattern or a.id::text=p_query) and (p_status='all' or coalesce(sc.status,'active')=p_status) and (p_workspace is null or exists(select 1 from public.workspace_members wm where wm.user_id=a.id and wm.workspace_id=p_workspace)) order by a.created_at desc,a.id limit 25 offset (p_page-1)*25) u left join public.profiles p on p.id=u.id left join control_plane.platform_user_controls c on c.user_id=u.id;
 if control_plane.has_permission('workspaces.read') then
 select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name) order by (w.id=p_workspace) desc nulls last,w.name,w.id),'[]'::jsonb) into choices from (select id,name from public.workspaces order by (id=p_workspace) desc nulls last,name,id limit 100) w;
 else choices:='[]'::jsonb; end if;
 perform control_plane.write_audit('users.listed','user',null,null,jsonb_build_object('returned',jsonb_array_length(items),'page',p_page,'workspace_id',p_workspace),'Consulta paginada de cadastros administrativos.');
 return jsonb_build_object('items',items,'total',total,'page',p_page,'page_size',25,'workspace_choices',choices,'workspace_choices_truncated',control_plane.has_permission('workspaces.read') and (select count(*)>100 from public.workspaces));
end $$;

create or replace function control_plane.users(p_query text,p_status text,p_page integer) returns jsonb
language plpgsql security definer set search_path='' as $$
begin return control_plane.users_filtered(p_query,p_status,p_page,null); end $$;


create function control_plane.workspace_members(p_workspace uuid,p_page integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare info jsonb; items jsonb; total bigint;
begin
 perform control_plane.assert_permission('workspaces.read');
 perform control_plane.assert_permission('users.read');
 if p_workspace is null or p_page is null or p_page not between 1 and 10000 then raise exception 'Filtro inválido.' using errcode='22023'; end if;
 select jsonb_build_object('id',w.id,'name',w.name,'slug',w.slug,'created_at',w.created_at,'status',coalesce(r.status,'active'),'workspace_type',coalesce(r.workspace_type,'customer')) into info
 from public.workspaces w left join control_plane.platform_workspace_registry r on r.workspace_id=w.id where w.id=p_workspace;
 if info is null then raise exception 'Workspace inexistente.' using errcode='22023'; end if;
 select count(*) into total from public.workspace_members where workspace_id=p_workspace;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'email',u.email,'name',p.full_name,'role',m.role) order by m.user_id),'[]'::jsonb) into items
 from (select user_id,role from public.workspace_members where workspace_id=p_workspace order by user_id limit 25 offset (p_page-1)*25) m
 left join auth.users u on u.id=m.user_id and u.deleted_at is null
 left join public.profiles p on p.id=u.id;
 perform control_plane.write_audit('workspace.viewed','workspace',p_workspace::text,null,jsonb_build_object('returned',jsonb_array_length(items),'page',p_page),'Consulta administrativa de metadados e membros do workspace, sem acesso ao CRM.');
 return jsonb_build_object('workspace',info,'items',items,'total',total,'page',p_page,'page_size',25);
end $$;


create function public.platform_users_filtered(p_query text default '',p_status text default 'all',p_page integer default 1,p_workspace_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select control_plane.users_filtered(p_query,p_status,p_page,p_workspace_id); $$;
create function public.platform_workspace_members(p_workspace_id uuid,p_page integer default 1) returns jsonb language sql security invoker set search_path='' as $$ select control_plane.workspace_members(p_workspace_id,p_page); $$;
revoke all on function control_plane.users_filtered(text,text,integer,uuid),control_plane.workspace_members(uuid,integer),public.platform_users_filtered(text,text,integer,uuid),public.platform_workspace_members(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function control_plane.users_filtered(text,text,integer,uuid),control_plane.workspace_members(uuid,integer),public.platform_users_filtered(text,text,integer,uuid),public.platform_workspace_members(uuid,integer) to authenticated;
notify pgrst, 'reload schema';

end
$control_p0$;
