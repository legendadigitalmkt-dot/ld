-- Growth OS Control Plane Foundation. No real account or workspace is promoted.
-- Control metadata is private; CRM tenant data and portal legacy tables stay put.
create schema control_plane;
revoke all on schema control_plane from public, anon, authenticated, service_role;
grant usage on schema control_plane to authenticated;

create table control_plane.platform_roles (
 code text primary key, label text not null, description text not null
);
create table control_plane.platform_permissions (
 code text primary key, domain text not null, description text not null
);
create table control_plane.platform_role_permissions (
 role_code text not null references control_plane.platform_roles(code) on delete restrict,
 permission_code text not null references control_plane.platform_permissions(code) on delete restrict,
 primary key(role_code,permission_code)
);
create index platform_role_permissions_permission_idx on control_plane.platform_role_permissions(permission_code);
create table control_plane.platform_workspace_registry (
 workspace_id uuid primary key references public.workspaces(id) on delete restrict,
 workspace_type text not null default 'customer' check(workspace_type in ('customer','platform_owner')),
 status text not null default 'active' check(status in ('active','suspended')),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 check(workspace_type <> 'platform_owner' or status = 'active')
);
create unique index one_platform_owner_workspace on control_plane.platform_workspace_registry(workspace_type) where workspace_type='platform_owner';
create index platform_workspace_updated_by_idx on control_plane.platform_workspace_registry(updated_by);
create table control_plane.platform_user_roles (
 user_id uuid not null references auth.users(id) on delete cascade,
 role_code text not null references control_plane.platform_roles(code) on delete restrict,
 granted_by uuid references auth.users(id) on delete set null,
 granted_at timestamptz not null default now(),
 primary key(user_id,role_code)
);
create index platform_user_roles_role_idx on control_plane.platform_user_roles(role_code);
create index platform_user_roles_granted_by_idx on control_plane.platform_user_roles(granted_by);
create table control_plane.platform_user_controls (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'active' check(status in ('active','suspended')),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
create index platform_user_controls_updated_by_idx on control_plane.platform_user_controls(updated_by);
create table control_plane.platform_settings (
 singleton boolean primary key default true check(singleton),
 display_name text not null default 'Growth OS' check(char_length(display_name) between 2 and 80),
 timezone text not null default 'America/Sao_Paulo',
 support_email text check(support_email is null or (char_length(support_email)<=254 and support_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 revision bigint not null default 1 check(revision>0),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
create index platform_settings_updated_by_idx on control_plane.platform_settings(updated_by);
insert into control_plane.platform_settings(singleton) values(true);
create table control_plane.admin_audit_logs (
 id uuid primary key default gen_random_uuid(),
 -- Preserve attribution even if an Auth account/session is removed in the future.
 actor_user_id uuid,
 actor_type text not null check(actor_type in ('admin','system')),
 session_id uuid,
 action text not null check(char_length(action) between 3 and 80),
 entity_type text not null check(entity_type in ('overview','user','workspace','role','settings','audit')),
 entity_id text check(char_length(entity_id)<=128),
 before_data jsonb,
 after_data jsonb,
 reason text not null check(char_length(reason) between 10 and 500),
 created_at timestamptz not null default now()
);
create index admin_audit_logs_time_idx on control_plane.admin_audit_logs(created_at desc,id);
create index admin_audit_logs_actor_idx on control_plane.admin_audit_logs(actor_user_id,created_at desc);
create index admin_audit_logs_action_idx on control_plane.admin_audit_logs(action,created_at desc);

insert into control_plane.platform_roles(code,label,description) values
 ('platform_owner','Platform Owner','Titular da plataforma; provisionamento explícito pela infraestrutura.'),
 ('super_admin','Super Admin','Operação administrativa da plataforma, sem conceder papéis.'),
 ('product_admin','Produto','Papel reservado ao domínio de produto; overview da fundação.'),
 ('billing_admin','Billing','Papel reservado ao domínio de cobrança; overview da fundação.'),
 ('sales_admin','Comercial','Papel reservado ao domínio comercial; overview da fundação.'),
 ('marketing_admin','Marketing','Papel reservado ao domínio de aquisição; overview da fundação.'),
 ('support_admin','Suporte','Leitura dos cadastros administrativos para suporte.'),
 ('security_admin','Segurança','Auditoria, cadastros e suspensão de acesso.'),
 ('content_admin','Conteúdo','Papel reservado ao domínio de conteúdo; overview da fundação.'),
 ('analyst','Analista','Overview e inventário de workspaces, sem dados de contatos.'),
 ('viewer','Leitura','Somente overview da fundação.');
insert into control_plane.platform_permissions(code,domain,description) values
 ('platform.access','platform','Abrir o Control Center com sessão e MFA válidos.'),
 ('overview.read','platform','Consultar os números administrativos agregados.'),
 ('users.read','users','Consultar cadastros, vínculos e contagens de sessões, sem tokens.'),
 ('users.suspend','users','Suspender ou reativar acesso ao software, com motivo.'),
 ('workspaces.read','workspaces','Consultar metadados e contagens operacionais; sem entrar como cliente.'),
 ('workspaces.suspend','workspaces','Suspender ou reativar acesso a um workspace, com motivo.'),
 ('roles.read','security','Consultar o catálogo e as concessões administrativas.'),
 ('roles.manage','security','Conceder e revogar papéis não proprietários, com confirmação e motivo.'),
 ('audit.read','security','Consultar a trilha administrativa imutável.'),
 ('settings.read','settings','Consultar configurações gerais sem segredos.'),
 ('system.settings','settings','Editar nome, fuso e e-mail de suporte com controle de versão.');
insert into control_plane.platform_role_permissions(role_code,permission_code)
select r.code,p.code from control_plane.platform_roles r cross join control_plane.platform_permissions p
where r.code='platform_owner'
 or (r.code='super_admin' and p.code<>'roles.manage')
 or p.code in ('platform.access','overview.read')
 or (r.code='security_admin' and p.code in ('users.read','users.suspend','workspaces.read','roles.read','audit.read','settings.read'))
 or (r.code='support_admin' and p.code in ('users.read','workspaces.read','settings.read'))
 or (r.code='analyst' and p.code='workspaces.read');

-- No table grants/policies: the private RPC implementations are the only boundary.
do $$ declare t text; begin
 foreach t in array array['platform_roles','platform_permissions','platform_role_permissions','platform_workspace_registry','platform_user_roles','platform_user_controls','platform_settings','admin_audit_logs'] loop
  execute format('alter table control_plane.%I enable row level security',t);
  execute format('alter table control_plane.%I force row level security',t);
  execute format('revoke all on table control_plane.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;

create function control_plane.account_active() returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists (
  select 1 from auth.users u where u.id=(select auth.uid()) and u.deleted_at is null
   and (u.banned_until is null or u.banned_until<=now())
   and not exists(select 1 from control_plane.platform_user_controls c where c.user_id=u.id and c.status='suspended')
 );
$$;
create function control_plane.workspace_active(p_workspace uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select control_plane.account_active() and not exists (
  select 1 from control_plane.platform_workspace_registry r where r.workspace_id=p_workspace and r.status='suspended'
 );
$$;
create function control_plane.eligible() returns boolean
language sql stable security definer set search_path='' as $$
 select control_plane.account_active()
 and coalesce(auth.jwt()->>'session_id','') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
 and exists(select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=(select auth.uid()) and (s.not_after is null or s.not_after>now()))
 and exists(select 1 from auth.users u where u.id=(select auth.uid()) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false))
 and exists(select 1 from control_plane.platform_workspace_registry r join public.workspace_members m on m.workspace_id=r.workspace_id where r.workspace_type='platform_owner' and r.status='active' and m.user_id=(select auth.uid()))
 and exists(select 1 from control_plane.platform_user_roles ur join control_plane.platform_role_permissions rp on rp.role_code=ur.role_code where ur.user_id=(select auth.uid()) and rp.permission_code='platform.access');
$$;
create function control_plane.mfa_verified() returns boolean
language sql stable security definer set search_path='' as $$
 select control_plane.eligible() and coalesce(auth.jwt()->>'aal','aal1')='aal2'
 and exists(select 1 from auth.sessions s where s.id::text=auth.jwt()->>'session_id' and s.user_id=(select auth.uid()) and s.aal='aal2')
 and exists(select 1 from auth.mfa_factors f where f.user_id=(select auth.uid()) and f.status='verified');
$$;
create function control_plane.has_permission(p_permission text) returns boolean
language sql stable security definer set search_path='' as $$
 select control_plane.mfa_verified() and exists (
  select 1 from control_plane.platform_user_roles ur join control_plane.platform_role_permissions rp on rp.role_code=ur.role_code
  where ur.user_id=(select auth.uid()) and rp.permission_code=p_permission
 );
$$;
create function control_plane.assert_permission(p_permission text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not control_plane.has_permission(p_permission) then raise exception 'Acesso administrativo não autorizado.' using errcode='42501'; end if;
end $$;
create function control_plane.valid_reason(p_reason text) returns text
language plpgsql immutable security invoker set search_path='' as $$
begin
 if p_reason is null or char_length(btrim(p_reason)) not between 10 and 500 then raise exception 'Motivo inválido.' using errcode='22023'; end if;
 return btrim(p_reason);
end $$;
create function control_plane.write_audit(p_action text,p_entity_type text,p_entity_id text,p_before jsonb,p_after jsonb,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null then raise exception 'Ator ausente.' using errcode='42501'; end if;
 insert into control_plane.admin_audit_logs(actor_user_id,actor_type,session_id,action,entity_type,entity_id,before_data,after_data,reason)
 values ((select auth.uid()),'admin',nullif(auth.jwt()->>'session_id','')::uuid,p_action,p_entity_type,p_entity_id,p_before,p_after,control_plane.valid_reason(p_reason));
end $$;
create function control_plane.audit_immutable() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception 'A trilha administrativa é append-only.' using errcode='42501'; end $$;
create trigger audit_immutable before update or delete on control_plane.admin_audit_logs for each row execute function control_plane.audit_immutable();

-- Provision once, only by the database operator AFTER explicit approval.
-- Real UUIDs are supplied out-of-band, never guessed from name or metadata.
create function control_plane.bootstrap_owner(p_workspace uuid,p_user uuid,p_reason text) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtext('growth-os.platform-bootstrap'));
 if exists(select 1 from control_plane.platform_workspace_registry where workspace_type='platform_owner') then raise exception 'O proprietário da plataforma já foi provisionado.' using errcode='22023'; end if;
 if not exists(select 1 from public.workspace_members m join auth.users u on u.id=m.user_id where m.workspace_id=p_workspace and m.user_id=p_user and m.role='owner' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())) then raise exception 'Identidade ou vínculo proprietário inválido.' using errcode='22023'; end if;
 if exists(select 1 from control_plane.platform_user_controls c where c.user_id=p_user and c.status='suspended') then raise exception 'Conta suspensa.' using errcode='22023'; end if;
 insert into control_plane.platform_workspace_registry(workspace_id,workspace_type,status) values(p_workspace,'platform_owner','active');
 insert into control_plane.platform_user_roles(user_id,role_code) values(p_user,'platform_owner');
 insert into control_plane.admin_audit_logs(actor_type,action,entity_type,entity_id,after_data,reason)
 values('system','platform.owner_provisioned','workspace',p_workspace::text,jsonb_build_object('workspace_type','platform_owner','user_id',p_user,'role','platform_owner'),control_plane.valid_reason(p_reason));
end $$;

create function control_plane.context() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not control_plane.eligible() then return jsonb_build_object('eligible',false,'mfa_verified',false,'roles','[]'::jsonb,'permissions','[]'::jsonb); end if;
 select jsonb_build_object('eligible',true,'mfa_verified',control_plane.mfa_verified(),'user_id',(select auth.uid()),
  'owner_workspace',(select jsonb_build_object('id',w.id,'name',w.name,'workspace_type',r.workspace_type) from control_plane.platform_workspace_registry r join public.workspaces w on w.id=r.workspace_id where r.workspace_type='platform_owner'),
  'presentation',(select jsonb_build_object('display_name',display_name,'timezone',timezone) from control_plane.platform_settings where singleton),
  'roles',(select coalesce(jsonb_agg(ur.role_code order by ur.role_code),'[]'::jsonb) from control_plane.platform_user_roles ur where ur.user_id=(select auth.uid())),
  'permissions',case when control_plane.mfa_verified() then (select coalesce(jsonb_agg(code order by code),'[]'::jsonb) from (select distinct rp.permission_code as code from control_plane.platform_user_roles ur join control_plane.platform_role_permissions rp on rp.role_code=ur.role_code where ur.user_id=(select auth.uid())) x) else '[]'::jsonb end
 ) into result;
 return result;
end $$;
create function control_plane.audit_items(p_limit integer) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'actor',u.email,'actor_id',x.actor_user_id,'actor_type',x.actor_type,'action',x.action,'entity_type',x.entity_type,'entity_id',x.entity_id,'before',x.before_data,'after',x.after_data,'reason',x.reason,'created_at',x.created_at) order by x.created_at desc,x.id),'[]'::jsonb)
 from (select * from control_plane.admin_audit_logs order by created_at desc,id limit p_limit) x left join auth.users u on u.id=x.actor_user_id;
$$;
create function control_plane.overview() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform control_plane.assert_permission('overview.read');
 perform control_plane.write_audit('overview.viewed','overview',null,null,null,'Consulta dos indicadores administrativos da fundação.');
 return jsonb_build_object('as_of',now(),'users',(select count(*) from auth.users where deleted_at is null),
  'new_users_7d',(select count(*) from auth.users where deleted_at is null and created_at>=now()-interval '7 days'),
  'workspaces',(select count(*) from public.workspaces),'suspended_users',(select count(*) from control_plane.platform_user_controls where status='suspended'),
  'suspended_workspaces',(select count(*) from control_plane.platform_workspace_registry where status='suspended'),
  'platform_admins',(select count(distinct user_id) from control_plane.platform_user_roles),
  'audit',case when control_plane.has_permission('audit.read') then control_plane.audit_items(8) else null end);
end $$;
create function control_plane.users(p_query text,p_status text,p_page integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pattern text; total bigint; items jsonb;
begin
 perform control_plane.assert_permission('users.read');
 if p_query is null or char_length(p_query)>80 or p_status not in ('all','active','suspended') or p_status is null or p_page not between 1 and 10000 or p_page is null then raise exception 'Filtro inválido.' using errcode='22023'; end if;
 pattern := '%' || replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_') || '%';
 select count(*) into total from auth.users u left join public.profiles p on p.id=u.id left join control_plane.platform_user_controls c on c.user_id=u.id where u.deleted_at is null and (p_query='' or u.email ilike pattern or p.full_name ilike pattern or u.id::text=p_query) and (p_status='all' or coalesce(c.status,'active')=p_status);
 select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'name',p.full_name,'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,'confirmed',u.email_confirmed_at is not null,'status',coalesce(c.status,'active'),
  'sessions',(select count(*) from auth.sessions s where s.user_id=u.id and (s.not_after is null or s.not_after>now())),
  'verified_mfa',exists(select 1 from auth.mfa_factors f where f.user_id=u.id and f.status='verified'),
  'memberships',(select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'role',m.role) order by w.name),'[]'::jsonb) from public.workspace_members m join public.workspaces w on w.id=m.workspace_id where m.user_id=u.id),
  'platform_roles',(select coalesce(jsonb_agg(ur.role_code order by ur.role_code),'[]'::jsonb) from control_plane.platform_user_roles ur where ur.user_id=u.id),
  'protected',exists(select 1 from control_plane.platform_user_roles ur where ur.user_id=u.id and ur.role_code='platform_owner')
 ) order by u.created_at desc,u.id),'[]'::jsonb) into items
 from (select a.* from auth.users a left join public.profiles pf on pf.id=a.id left join control_plane.platform_user_controls sc on sc.user_id=a.id where a.deleted_at is null and (p_query='' or a.email ilike pattern or pf.full_name ilike pattern or a.id::text=p_query) and (p_status='all' or coalesce(sc.status,'active')=p_status) order by a.created_at desc,a.id limit 25 offset (p_page-1)*25) u left join public.profiles p on p.id=u.id left join control_plane.platform_user_controls c on c.user_id=u.id;
 perform control_plane.write_audit('users.listed','user',null,null,jsonb_build_object('returned',jsonb_array_length(items),'page',p_page),'Consulta paginada de cadastros administrativos.');
 return jsonb_build_object('items',items,'total',total,'page',p_page,'page_size',25);
end $$;
create function control_plane.workspaces(p_query text,p_status text,p_page integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pattern text; total bigint; items jsonb;
begin
 perform control_plane.assert_permission('workspaces.read');
 if p_query is null or char_length(p_query)>80 or p_status not in ('all','active','suspended') or p_status is null or p_page not between 1 and 10000 or p_page is null then raise exception 'Filtro inválido.' using errcode='22023'; end if;
 pattern := '%' || replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_') || '%';
 select count(*) into total from public.workspaces w left join control_plane.platform_workspace_registry r on r.workspace_id=w.id where (p_query='' or w.name ilike pattern or w.slug ilike pattern or w.id::text=p_query) and (p_status='all' or coalesce(r.status,'active')=p_status);
 select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'slug',w.slug,'created_at',w.created_at,'status',coalesce(r.status,'active'),'workspace_type',coalesce(r.workspace_type,'customer'),
  'members',(select count(*) from public.workspace_members m where m.workspace_id=w.id),
  'contacts',(select count(*) from public.contacts c where c.workspace_id=w.id),
  'deals',(select count(*) from public.deals d where d.workspace_id=w.id),
  'open_tasks',(select count(*) from public.tasks t where t.workspace_id=w.id and t.status='open'),
  'owners',case when control_plane.has_permission('users.read') then (select coalesce(jsonb_agg(u.email order by u.email),'[]'::jsonb) from public.workspace_members m join auth.users u on u.id=m.user_id where m.workspace_id=w.id and m.role='owner') else '[]'::jsonb end,
  'integrations',(select coalesce(jsonb_agg(jsonb_build_object('provider',i.provider,'status',i.status) order by i.provider),'[]'::jsonb) from public.integration_connections i where i.workspace_id=w.id)
 ) order by w.created_at desc,w.id),'[]'::jsonb) into items
 from (select a.* from public.workspaces a left join control_plane.platform_workspace_registry pr on pr.workspace_id=a.id where (p_query='' or a.name ilike pattern or a.slug ilike pattern or a.id::text=p_query) and (p_status='all' or coalesce(pr.status,'active')=p_status) order by a.created_at desc,a.id limit 25 offset (p_page-1)*25) w left join control_plane.platform_workspace_registry r on r.workspace_id=w.id;
 perform control_plane.write_audit('workspaces.listed','workspace',null,null,jsonb_build_object('returned',jsonb_array_length(items),'page',p_page),'Consulta de metadados e contagens dos workspaces.');
 return jsonb_build_object('items',items,'total',total,'page',p_page,'page_size',25);
end $$;
create function control_plane.audit(p_query text,p_page integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pattern text; total bigint; items jsonb;
begin
 perform control_plane.assert_permission('audit.read');
 if p_query is null or char_length(p_query)>80 or p_page not between 1 and 10000 or p_page is null then raise exception 'Filtro inválido.' using errcode='22023'; end if;
 pattern := '%' || replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_') || '%';
 perform control_plane.write_audit('audit.viewed','audit',null,null,null,'Consulta paginada da trilha administrativa.');
 select count(*) into total from control_plane.admin_audit_logs a where p_query='' or a.action ilike pattern or a.entity_id=p_query;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'actor',u.email,'actor_id',a.actor_user_id,'actor_type',a.actor_type,'action',a.action,'entity_type',a.entity_type,'entity_id',a.entity_id,'before',a.before_data,'after',a.after_data,'reason',a.reason,'created_at',a.created_at) order by a.created_at desc,a.id),'[]'::jsonb) into items
 from (select * from control_plane.admin_audit_logs where p_query='' or action ilike pattern or entity_id=p_query order by created_at desc,id limit 25 offset (p_page-1)*25) a left join auth.users u on u.id=a.actor_user_id;
 return jsonb_build_object('items',items,'total',total,'page',p_page,'page_size',25);
end $$;
create function control_plane.roles() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform control_plane.assert_permission('roles.read');
 perform control_plane.write_audit('roles.viewed','role',null,null,null,'Consulta do catálogo e das concessões administrativas.');
 return jsonb_build_object('catalog',(select jsonb_agg(jsonb_build_object('code',r.code,'label',r.label,'description',r.description,'permissions',(select coalesce(jsonb_agg(rp.permission_code order by rp.permission_code),'[]'::jsonb) from control_plane.platform_role_permissions rp where rp.role_code=r.code)) order by r.code) from control_plane.platform_roles r),
 'members',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'roles',(select coalesce(jsonb_agg(ur.role_code order by ur.role_code),'[]'::jsonb) from control_plane.platform_user_roles ur where ur.user_id=u.id)) order by u.email),'[]'::jsonb) from auth.users u join public.workspace_members m on m.user_id=u.id join control_plane.platform_workspace_registry r on r.workspace_id=m.workspace_id where r.workspace_type='platform_owner' and u.deleted_at is null));
end $$;
create function control_plane.settings() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform control_plane.assert_permission('settings.read');
 perform control_plane.write_audit('settings.viewed','settings',null,null,null,'Consulta das configurações gerais sem segredos.');
 return (select jsonb_build_object('display_name',s.display_name,'timezone',s.timezone,'support_email',s.support_email,'revision',s.revision,'updated_at',s.updated_at) from control_plane.platform_settings s where singleton);
end $$;

create function control_plane.set_status(p_entity text,p_id uuid,p_status text,p_expected_status text,p_reason text,p_confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare old_status text; reason text;
begin
 if p_entity not in ('user','workspace') or p_entity is null then raise exception 'Entidade inválida.' using errcode='22023'; end if;
 perform control_plane.assert_permission(case when p_entity='user' then 'users.suspend' else 'workspaces.suspend' end);
 reason:=control_plane.valid_reason(p_reason);
 if p_confirmed is distinct from true or p_id is null or p_status not in ('active','suspended') or p_status is null or p_expected_status not in ('active','suspended') or p_expected_status is null then raise exception 'Confirmação ou status inválido.' using errcode='22023'; end if;
 if p_entity='user' then
  perform 1 from auth.users where id=p_id and deleted_at is null for update;
  if not found then raise exception 'Cadastro inexistente.' using errcode='22023'; end if;
  if p_id=(select auth.uid()) or exists(select 1 from control_plane.platform_user_roles where user_id=p_id and role_code='platform_owner') then raise exception 'Conta protegida.' using errcode='42501'; end if;
  old_status:=coalesce((select status from control_plane.platform_user_controls where user_id=p_id),'active');
  if old_status<>p_expected_status or old_status=p_status then raise exception 'Status alterado.' using errcode='40001'; end if;
  insert into control_plane.platform_user_controls(user_id,status,updated_by) values(p_id,p_status,(select auth.uid())) on conflict(user_id) do update set status=excluded.status,updated_by=excluded.updated_by,updated_at=now();
 else
  perform 1 from public.workspaces where id=p_id for update;
  if not found then raise exception 'Workspace inexistente.' using errcode='22023'; end if;
  if exists(select 1 from control_plane.platform_workspace_registry where workspace_id=p_id and workspace_type='platform_owner') then raise exception 'Workspace proprietário protegido.' using errcode='42501'; end if;
  old_status:=coalesce((select status from control_plane.platform_workspace_registry where workspace_id=p_id),'active');
  if old_status<>p_expected_status or old_status=p_status then raise exception 'Status alterado.' using errcode='40001'; end if;
  insert into control_plane.platform_workspace_registry(workspace_id,status,updated_by) values(p_id,p_status,(select auth.uid())) on conflict(workspace_id) do update set status=excluded.status,updated_by=excluded.updated_by,updated_at=now();
 end if;
 perform control_plane.write_audit(p_entity||case when p_status='suspended' then '.suspended' else '.reactivated' end,p_entity,p_id::text,jsonb_build_object('status',old_status),jsonb_build_object('status',p_status),reason);
end $$;
create function control_plane.set_role(p_user uuid,p_role text,p_enabled boolean,p_reason text,p_confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare had_role boolean; reason text;
begin
 perform control_plane.assert_permission('roles.manage');
 reason:=control_plane.valid_reason(p_reason);
 if p_confirmed is distinct from true or p_enabled is null or p_user is null or p_role is null or not exists(select 1 from control_plane.platform_roles where code=p_role) then raise exception 'Concessão inválida.' using errcode='22023'; end if;
 if p_role='platform_owner' or p_user=(select auth.uid()) then raise exception 'Proprietário e concessões próprias são protegidos.' using errcode='42501'; end if;
 perform 1 from auth.users where id=p_user and deleted_at is null and email_confirmed_at is not null and not coalesce(is_anonymous,false) for update;
 if not found or not exists(select 1 from public.workspace_members m join control_plane.platform_workspace_registry r on r.workspace_id=m.workspace_id where m.user_id=p_user and r.workspace_type='platform_owner') then raise exception 'Exige membro confirmado do workspace proprietário.' using errcode='22023'; end if;
 had_role:=exists(select 1 from control_plane.platform_user_roles where user_id=p_user and role_code=p_role);
 if had_role=p_enabled then raise exception 'Concessão já alterada.' using errcode='40001'; end if;
 if p_enabled then insert into control_plane.platform_user_roles(user_id,role_code,granted_by) values(p_user,p_role,(select auth.uid()));
 else delete from control_plane.platform_user_roles where user_id=p_user and role_code=p_role; end if;
 perform control_plane.write_audit(case when p_enabled then 'role.granted' else 'role.revoked' end,'role',p_user::text,jsonb_build_object('role',p_role,'enabled',had_role),jsonb_build_object('role',p_role,'enabled',p_enabled),reason);
end $$;
create function control_plane.save_settings(p_revision bigint,p_name text,p_timezone text,p_email text,p_reason text,p_confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare old_row control_plane.platform_settings%rowtype; new_row control_plane.platform_settings%rowtype; reason text;
begin
 perform control_plane.assert_permission('system.settings');
 reason:=control_plane.valid_reason(p_reason);
 if p_confirmed is distinct from true or p_name is null or char_length(btrim(p_name)) not between 2 and 80 or p_timezone is null or not exists(select 1 from pg_timezone_names where name=p_timezone) or (nullif(btrim(p_email),'') is not null and (char_length(btrim(p_email))>254 or btrim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) then raise exception 'Configuração inválida.' using errcode='22023'; end if;
 select * into old_row from control_plane.platform_settings where singleton for update;
 if p_revision is null or old_row.revision<>p_revision then raise exception 'Configuração alterada.' using errcode='40001'; end if;
 update control_plane.platform_settings set display_name=btrim(p_name),timezone=p_timezone,support_email=nullif(btrim(p_email),''),revision=revision+1,updated_by=(select auth.uid()),updated_at=now() where singleton returning * into new_row;
 perform control_plane.write_audit('settings.changed','settings','general',jsonb_build_object('display_name',old_row.display_name,'timezone',old_row.timezone,'support_email',old_row.support_email,'revision',old_row.revision),jsonb_build_object('display_name',new_row.display_name,'timezone',new_row.timezone,'support_email',new_row.support_email,'revision',new_row.revision),reason);
end $$;

-- Deny suspended identities/workspaces in existing tenant policies and helpers.
-- Service-role webhook ingestion is unchanged; suspension gates customer access.
-- Production already grants this integrity helper to the backend. Make the
-- permission explicit so migration rebuilds preserve assigned-owner ingestion.
grant execute on function private.workspace_has_user(uuid,uuid) to service_role;
create or replace function private.is_workspace_member(target_workspace uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select control_plane.workspace_active(target_workspace) and exists(select 1 from public.workspace_members wm where wm.workspace_id=target_workspace and wm.user_id=(select auth.uid()));
$$;
create or replace function private.workspace_role(target_workspace uuid) returns public.member_role
language sql stable security definer set search_path='' as $$
 select wm.role from public.workspace_members wm where wm.workspace_id=target_workspace and wm.user_id=(select auth.uid()) and control_plane.workspace_active(target_workspace) limit 1;
$$;
create or replace function private.shares_workspace_with(target_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select control_plane.account_active() and exists(select 1 from public.workspace_members mine join public.workspace_members theirs on theirs.workspace_id=mine.workspace_id where mine.user_id=(select auth.uid()) and theirs.user_id=target_user and control_plane.workspace_active(mine.workspace_id));
$$;
create policy "platform account access" on public.profiles as restrictive for all to authenticated using((select control_plane.account_active())) with check((select control_plane.account_active()));
create policy "platform workspace access" on public.workspaces as restrictive for all to authenticated using((select control_plane.workspace_active(id))) with check((select control_plane.workspace_active(id)));
do $$ declare t text; begin
 foreach t in array array['workspace_members','contacts','deals','tasks','conversations','messages','knowledge_entries','automations','activities','integration_connections','workspace_invites','contact_channels','message_status_events','webhook_events'] loop
  execute format('create policy "platform workspace access" on public.%I as restrictive for all to authenticated using((select control_plane.workspace_active(workspace_id))) with check((select control_plane.workspace_active(workspace_id)))',t);
 end loop;
end $$;

-- Public invoker-only facades. All privileged implementation lives in an
-- unexposed schema, pins search_path, authenticates and audits in one transaction.
create function public.account_access() returns boolean language sql stable security invoker set search_path='' as $$ select control_plane.account_active(); $$;
create function public.platform_context() returns jsonb language sql stable security invoker set search_path='' as $$ select control_plane.context(); $$;
create function public.platform_overview() returns jsonb language sql security invoker set search_path='' as $$ select control_plane.overview(); $$;
create function public.platform_users(p_query text default '',p_status text default 'all',p_page integer default 1) returns jsonb language sql security invoker set search_path='' as $$ select control_plane.users(p_query,p_status,p_page); $$;
create function public.platform_workspaces(p_query text default '',p_status text default 'all',p_page integer default 1) returns jsonb language sql security invoker set search_path='' as $$ select control_plane.workspaces(p_query,p_status,p_page); $$;
create function public.platform_audit(p_query text default '',p_page integer default 1) returns jsonb language sql security invoker set search_path='' as $$ select control_plane.audit(p_query,p_page); $$;
create function public.platform_roles() returns jsonb language sql security invoker set search_path='' as $$ select control_plane.roles(); $$;
create function public.platform_settings() returns jsonb language sql security invoker set search_path='' as $$ select control_plane.settings(); $$;
create function public.platform_set_status(p_entity text,p_id uuid,p_status text,p_expected_status text,p_reason text,p_confirmed boolean) returns void language sql security invoker set search_path='' as $$ select control_plane.set_status(p_entity,p_id,p_status,p_expected_status,p_reason,p_confirmed); $$;
create function public.platform_set_role(p_user uuid,p_role text,p_enabled boolean,p_reason text,p_confirmed boolean) returns void language sql security invoker set search_path='' as $$ select control_plane.set_role(p_user,p_role,p_enabled,p_reason,p_confirmed); $$;
create function public.platform_save_settings(p_revision bigint,p_name text,p_timezone text,p_email text,p_reason text,p_confirmed boolean) returns void language sql security invoker set search_path='' as $$ select control_plane.save_settings(p_revision,p_name,p_timezone,p_email,p_reason,p_confirmed); $$;

revoke all on all functions in schema control_plane from public,anon,authenticated,service_role;
grant execute on function control_plane.account_active(),control_plane.workspace_active(uuid),control_plane.context(),control_plane.overview(),control_plane.users(text,text,integer),control_plane.workspaces(text,text,integer),control_plane.audit(text,integer),control_plane.roles(),control_plane.settings(),control_plane.set_status(text,uuid,text,text,text,boolean),control_plane.set_role(uuid,text,boolean,text,boolean),control_plane.save_settings(bigint,text,text,text,text,boolean) to authenticated;
revoke all on function public.account_access(),public.platform_context(),public.platform_overview(),public.platform_users(text,text,integer),public.platform_workspaces(text,text,integer),public.platform_audit(text,integer),public.platform_roles(),public.platform_settings(),public.platform_set_status(text,uuid,text,text,text,boolean),public.platform_set_role(uuid,text,boolean,text,boolean),public.platform_save_settings(bigint,text,text,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.account_access(),public.platform_context(),public.platform_overview(),public.platform_users(text,text,integer),public.platform_workspaces(text,text,integer),public.platform_audit(text,integer),public.platform_roles(),public.platform_settings(),public.platform_set_status(text,uuid,text,text,text,boolean),public.platform_set_role(uuid,text,boolean,text,boolean),public.platform_save_settings(bigint,text,text,text,text,boolean) to authenticated;

comment on schema control_plane is 'Growth OS Milestone 1: private control plane, separate from customer CRM and portal.';
comment on function control_plane.bootstrap_owner(uuid,uuid,text) is 'Operator-only one-time bootstrap; explicit approval required. No automatic promotion in migrations.';
notify pgrst,'reload schema';
