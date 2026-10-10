-- Plans v1: no commercial offer or workspace assignment is seeded.
create function control_plane.valid_plan_config(c jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare k text; v jsonb;
begin
 if c is null or jsonb_typeof(c)<>'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(c))<>2 or not(c ?& array['features','limits']) then return false; end if;
 if jsonb_typeof(c->'features')<>'object' or jsonb_typeof(c->'limits')<>'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(c->'features'))<>3 or not(c->'features' ?& array['crm','whatsapp','growth_ai']) then return false; end if;
 foreach k in array array['crm','whatsapp','growth_ai'] loop
  if jsonb_typeof(c->'features'->k)<>'boolean' then return false; end if;
 end loop;
 if c->'features'->>'growth_ai'='true' and c->'features'->>'crm'='false' then return false; end if;
 if (select count(*) from jsonb_object_keys(c->'limits'))<>4 or not(c->'limits' ?& array['contacts','deals','tasks','members']) then return false; end if;
 foreach k in array array['contacts','deals','tasks','members'] loop
  v:=c->'limits'->k;
  if jsonb_typeof(v)='null' then continue; end if;
  if jsonb_typeof(v)<>'number' or v::text !~ '^(0|[1-9][0-9]{0,7})$' then return false; end if;
  if v::text::bigint>10000000 then return false; end if;
 end loop;
 return true;
end $$;
create table control_plane.plans (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check(code ~ '^[a-z][a-z0-9_-]{1,47}$'),
 name text not null check(char_length(btrim(name)) between 2 and 80),
 description text not null default '' check(char_length(description)<=300),
 status text not null default 'draft' check(status in ('draft','active','archived')),
 draft_config jsonb not null check(control_plane.valid_plan_config(draft_config)),
 revision bigint not null default 1 check(revision>0),
 latest_version bigint not null default 0 check(latest_version>=0),
 published_revision bigint not null default 0,
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 check(status<>'active' or latest_version>0)
);
create index plans_updated_by_idx on control_plane.plans(updated_by);
create table control_plane.plan_versions (
 id uuid primary key default gen_random_uuid(),
 plan_id uuid not null references control_plane.plans(id) on delete restrict,
 version bigint not null check(version>0), name text not null, description text not null,
 config jsonb not null check(control_plane.valid_plan_config(config)),
 published_by uuid not null, published_at timestamptz not null default now(),
 unique(plan_id,version)
);
-- Attribution is immutable and survives removal of an Auth account, as in the audit trail.
create table control_plane.workspace_plan_assignments (
 workspace_id uuid primary key references public.workspaces(id) on delete cascade,
 plan_version_id uuid references control_plane.plan_versions(id) on delete restrict,
 revision bigint not null default 1 check(revision>0),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now()
);
create index workspace_plan_version_idx on control_plane.workspace_plan_assignments(plan_version_id);
create index workspace_plan_updated_by_idx on control_plane.workspace_plan_assignments(updated_by);
create table control_plane.member_slot_reservations (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 actor_id uuid not null references auth.users(id) on delete cascade,
 email_hash text not null, role public.member_role not null,
 target_user_id uuid references auth.users(id) on delete cascade,
 expires_at timestamptz not null default clock_timestamp()+interval '10 minutes'
);
create index member_slot_workspace_idx on control_plane.member_slot_reservations(workspace_id,expires_at);
create index member_slot_actor_idx on control_plane.member_slot_reservations(actor_id);
create index member_slot_target_idx on control_plane.member_slot_reservations(target_user_id);
create table control_plane.workspace_usage (
 workspace_id uuid primary key references public.workspaces(id) on delete cascade,
 contacts bigint not null default 0 check(contacts>=0),
 deals bigint not null default 0 check(deals>=0),
 tasks bigint not null default 0 check(tasks>=0),
 members bigint not null default 0 check(members>=0)
 ,quota_revision bigint not null default 0 check(quota_revision>=0)
);
do $$ declare t text; begin
 foreach t in array array['plans','plan_versions','workspace_plan_assignments','workspace_usage','member_slot_reservations'] loop
  execute format('alter table control_plane.%I enable row level security',t);
  execute format('alter table control_plane.%I force row level security',t);
  execute format('revoke all on control_plane.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;
insert into control_plane.workspace_plan_assignments(workspace_id) select id from public.workspaces;
insert into control_plane.workspace_usage(workspace_id,contacts,deals,tasks,members)
select w.id,(select count(*) from public.contacts c where c.workspace_id=w.id),
 (select count(*) from public.deals d where d.workspace_id=w.id),
 (select count(*) from public.tasks t where t.workspace_id=w.id),
 (select count(*) from public.workspace_members m where m.workspace_id=w.id) from public.workspaces w;

insert into control_plane.platform_permissions(code,domain,description) values
 ('plans.read','plans','Consultar catálogo, atribuições e consumo agregado.'),
 ('plans.write','plans','Editar, publicar e atribuir versões de planos com auditoria.');
insert into control_plane.platform_role_permissions(role_code,permission_code)
select r.code,p.code from control_plane.platform_roles r cross join control_plane.platform_permissions p
where p.code in ('plans.read','plans.write') and
 (r.code in ('platform_owner','super_admin','product_admin') or (r.code in ('billing_admin','analyst') and p.code='plans.read'));
update control_plane.platform_roles set description='Administração de módulos, planos e limites; sem cobrança, usuários ou segredos.' where code='product_admin';
alter table control_plane.admin_audit_logs drop constraint admin_audit_logs_entity_type_check;
alter table control_plane.admin_audit_logs add constraint admin_audit_logs_entity_type_check
 check(entity_type in ('overview','user','workspace','role','settings','audit','product','feature','plan'));

create function control_plane.reject_plan_version_change() returns trigger
language plpgsql security invoker set search_path='' as $$ begin
 raise exception 'Published plan versions are immutable' using errcode='42501';
end $$;
create trigger plan_versions_immutable before update or delete on control_plane.plan_versions for each row execute function control_plane.reject_plan_version_change();
create function control_plane.initialize_workspace_plan() returns trigger
language plpgsql security definer set search_path='' as $$ begin
 insert into control_plane.workspace_usage(workspace_id) values(new.id);
 insert into control_plane.workspace_plan_assignments(workspace_id) values(new.id);
 return new;
end $$;
create trigger workspace_plan_initialized after insert on public.workspaces for each row execute function control_plane.initialize_workspace_plan();

-- All row writes update exact stored-stock counters. A counter row is also the
-- mutex for quota checks and plan assignment. Incrementing it prevents write skew
-- under REPEATABLE READ (a competing transaction must abort, never over-allocate).
-- Trusted ingestion counts toward usage but is not dropped due to customer quota.
create function control_plane.track_workspace_usage() returns trigger
language plpgsql security definer set search_path='' as $$
declare old_ws uuid; new_ws uuid; resource text; used bigint; ceiling bigint; pending bigint:=0; granted_slot boolean:=false;
begin
 resource:=case tg_table_name when 'workspace_members' then 'members' when 'contacts' then 'contacts' when 'deals' then 'deals' when 'tasks' then 'tasks' end;
 if resource is null then raise exception 'Unsupported usage resource'; end if;
 if tg_op<>'INSERT' then old_ws:=old.workspace_id; end if;
 if tg_op<>'DELETE' then new_ws:=new.workspace_id; end if;
 if tg_op='UPDATE' and old_ws=new_ws then return new; end if;
 perform 1 from control_plane.workspace_usage where workspace_id in (old_ws,new_ws) order by workspace_id for update;
 if new_ws is not null then
  execute format('select %I from control_plane.workspace_usage where workspace_id=$1',resource) into used using new_ws;
  if used is null then raise exception 'Workspace usage is unavailable' using errcode='42501'; end if;
  if current_setting('role',true)='authenticated' or resource='members' then
   select (v.config->'limits'->>resource)::bigint into ceiling from control_plane.workspace_plan_assignments a
    join control_plane.plan_versions v on v.id=a.plan_version_id where a.workspace_id=new_ws;
   if resource='members' then
    select count(*) into pending from control_plane.member_slot_reservations where workspace_id=new_ws and target_user_id is null and expires_at>clock_timestamp();
    select exists(select 1 from control_plane.member_slot_reservations where workspace_id=new_ws and target_user_id=new.user_id and actor_id=auth.uid() and expires_at>clock_timestamp()) into granted_slot;
   end if;
   if not granted_slot and ceiling is not null and used+pending>=ceiling then
    raise exception 'Limite do plano atingido: %',resource using errcode='PGL01';
   end if;
  end if;
  execute format('update control_plane.workspace_usage set %I=%I+1 where workspace_id=$1',resource,resource) using new_ws;
 end if;
 if old_ws is not null then
  execute format('update control_plane.workspace_usage set %I=%I-1 where workspace_id=$1',resource,resource) using old_ws;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['contacts','deals','tasks','workspace_members'] loop
  execute format('create trigger plan_usage_tracked after insert or update of workspace_id or delete on public.%I for each row execute function control_plane.track_workspace_usage()',t);
 end loop;
end $$;

-- Ungranted metadata helper used only by tenant/admin-authorized definer functions.
create function control_plane.usage_snapshot(p_workspace uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('workspace_id',u.workspace_id,'assignment_revision',a.revision,
  'plan',case when v.id is null then null else jsonb_build_object('id',v.plan_id,'version_id',v.id,'name',v.name,'version',v.version) end,
  'used',jsonb_build_object('contacts',u.contacts,'deals',u.deals,'tasks',u.tasks,'members',u.members),
  'reserved_members',(select count(*) from control_plane.member_slot_reservations where workspace_id=u.workspace_id and target_user_id is null and expires_at>clock_timestamp()),
  'limits',coalesce(v.config->'limits','{"contacts":null,"deals":null,"tasks":null,"members":null}'::jsonb),
  'features',coalesce(v.config->'features','{"crm":true,"whatsapp":true,"growth_ai":true}'::jsonb))
 from control_plane.workspace_usage u join control_plane.workspace_plan_assignments a on a.workspace_id=u.workspace_id
 left join control_plane.plan_versions v on v.id=a.plan_version_id where u.workspace_id=p_workspace;
$$;
create function control_plane.workspace_plan(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$ begin
 if (select auth.uid()) is null or not private.is_workspace_member(p_workspace) then raise exception 'Workspace access denied' using errcode='42501'; end if;
 return control_plane.usage_snapshot(p_workspace);
end $$;

create or replace function control_plane.resolve_module(p_workspace uuid,p_feature text) returns jsonb
language sql stable security invoker set search_path='' as $$
 with rules as materialized (
  select g.feature_code,
   case when g.state='disabled' then 'disabled' when coalesce((v.config->'features'->>g.feature_code)::boolean,true)=false then 'disabled'
    else coalesce(nullif(w.state,'inherit'),g.state) end as state,
   case when g.state='disabled' then 'global' when coalesce((v.config->'features'->>g.feature_code)::boolean,true)=false then 'plan'
    when w.state is null or w.state='inherit' then 'global' else 'workspace' end as source
  from control_plane.feature_rules g left join control_plane.feature_rules w on w.feature_code=g.feature_code and w.workspace_id=p_workspace
  left join control_plane.workspace_plan_assignments a on a.workspace_id=p_workspace
  left join control_plane.plan_versions v on v.id=a.plan_version_id where g.workspace_id is null
 ), effective as (
  select state,source,p_feature='growth_ai' and coalesce((select state='disabled' from rules where feature_code='crm'),true) as dependency_off from rules where feature_code=p_feature
 ) select coalesce((select jsonb_build_object('enabled',state<>'disabled' and not dependency_off,
  'state',case when dependency_off then 'disabled' else state end,
  'source',case when state='disabled' then source when dependency_off then 'dependency' else source end)
 from effective),jsonb_build_object('enabled',false,'state','disabled','source','unavailable'));
$$;

create function control_plane.save_plan(p_id uuid,p_code text,p_name text,p_description text,p_status text,p_config jsonb,p_revision bigint,p_reason text,p_confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare previous control_plane.plans%rowtype; saved control_plane.plans%rowtype;
begin
 perform control_plane.assert_permission('plans.write'); p_reason:=control_plane.valid_reason(p_reason);
 if p_confirmed is distinct from true or p_code is null or p_code !~ '^[a-z][a-z0-9_-]{1,47}$' or p_name is null
  or char_length(btrim(p_name)) not between 2 and 80 or p_description is null or char_length(p_description)>300
  or p_status is null or p_status not in ('draft','active','archived') or not control_plane.valid_plan_config(p_config)
  or p_revision is null or p_revision<0 then raise exception 'Plano inválido.' using errcode='22023'; end if;
 if p_id is null then
  if p_revision<>0 or p_status<>'draft' then raise exception 'Novo plano precisa ser rascunho.' using errcode='22023'; end if;
  if exists(select 1 from control_plane.plans where code=p_code) then raise exception 'Código já utilizado.' using errcode='22023'; end if;
  insert into control_plane.plans(code,name,description,draft_config,updated_by) values(p_code,btrim(p_name),p_description,p_config,auth.uid()) returning * into saved;
 else
  select * into previous from control_plane.plans where id=p_id for update;
  if not found then raise exception 'Plano inválido.' using errcode='22023'; end if;
  if previous.revision<>p_revision then raise exception 'Plano mudou.' using errcode='40001'; end if;
  if p_code<>previous.code or (p_status='active' and previous.latest_version=0) then raise exception 'Estado ou código inválido.' using errcode='22023'; end if;
  if (previous.name,previous.description,previous.status,previous.draft_config) is not distinct from (btrim(p_name),p_description,p_status,p_config) then raise exception 'Nenhuma alteração informada.' using errcode='22023'; end if;
  update control_plane.plans set name=btrim(p_name),description=p_description,status=p_status,draft_config=p_config,revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=p_id returning * into saved;
 end if;
 perform control_plane.write_audit('plan.draft_saved','plan',saved.id::text,case when previous.id is null then null else to_jsonb(previous)-'updated_by' end,to_jsonb(saved)-'updated_by',p_reason);
 return saved.id;
end $$;
create function control_plane.publish_plan(p_id uuid,p_revision bigint,p_reason text,p_confirmed boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare p control_plane.plans%rowtype; v control_plane.plan_versions%rowtype; last_v control_plane.plan_versions%rowtype;
begin
 perform control_plane.assert_permission('plans.write'); p_reason:=control_plane.valid_reason(p_reason);
 if p_confirmed is distinct from true or p_revision is null then raise exception 'Publicação inválida.' using errcode='22023'; end if;
 select * into p from control_plane.plans where id=p_id for update;
 if not found or p.status='archived' then raise exception 'Plano indisponível.' using errcode='22023'; end if;
 if p.revision<>p_revision then raise exception 'Plano mudou.' using errcode='40001'; end if;
 select * into last_v from control_plane.plan_versions where plan_id=p.id and version=p.latest_version;
 if last_v.id is not null and (last_v.name,last_v.description,last_v.config) is not distinct from (p.name,p.description,p.draft_config) then raise exception 'Nenhuma nova versão informada.' using errcode='22023'; end if;
 insert into control_plane.plan_versions(plan_id,version,name,description,config,published_by) values(p.id,p.latest_version+1,p.name,p.description,p.draft_config,auth.uid()) returning * into v;
 update control_plane.plans set latest_version=v.version,status='active',revision=revision+1,published_revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=p.id;
 perform control_plane.write_audit('plan.published','plan',p.id::text,jsonb_build_object('latest_version',p.latest_version),to_jsonb(v),p_reason);
 return v.id;
end $$;
create function control_plane.assign_plan(p_workspace uuid,p_version uuid,p_revision bigint,p_reason text,p_confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare a control_plane.workspace_plan_assignments%rowtype; v control_plane.plan_versions%rowtype; before_state jsonb;
begin
 perform control_plane.assert_permission('plans.write'); p_reason:=control_plane.valid_reason(p_reason);
 if p_confirmed is distinct from true or p_revision is null or p_revision<1 then raise exception 'Atribuição inválida.' using errcode='22023'; end if;
 if exists(select 1 from control_plane.platform_workspace_registry where workspace_id=p_workspace and workspace_type='platform_owner') then raise exception 'Workspace proprietário protegido.' using errcode='42501'; end if;
 perform 1 from control_plane.workspace_usage where workspace_id=p_workspace for update;
 select * into a from control_plane.workspace_plan_assignments where workspace_id=p_workspace for update;
 if not found then raise exception 'Workspace inválido.' using errcode='22023'; end if;
 if a.revision<>p_revision then raise exception 'Atribuição mudou.' using errcode='40001'; end if;
 if a.plan_version_id is not distinct from p_version then raise exception 'Nenhuma alteração informada.' using errcode='22023'; end if;
 if p_version is not null then
  select * into v from control_plane.plan_versions where id=p_version;
  if not found then raise exception 'Versão inválida.' using errcode='22023'; end if;
  perform 1 from control_plane.plans where id=v.plan_id and status='active' for share;
  if not found then raise exception 'Plano não está ativo.' using errcode='22023'; end if;
 end if;
 before_state:=control_plane.usage_snapshot(p_workspace);
 update control_plane.workspace_plan_assignments set plan_version_id=p_version,revision=revision+1,updated_by=auth.uid(),updated_at=now() where workspace_id=p_workspace;
 update control_plane.workspace_usage set quota_revision=quota_revision+1 where workspace_id=p_workspace;
 perform control_plane.write_audit('workspace.plan_assigned','workspace',p_workspace::text,before_state,control_plane.usage_snapshot(p_workspace),p_reason);
end $$;

create function control_plane.plans_catalog(p_workspace uuid,p_query text,p_workspace_query text,p_plan uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare pattern text; ws_pattern text; items jsonb; chosen jsonb; choices jsonb; detail jsonb; total bigint; ws_total bigint;
begin
 perform control_plane.assert_permission('plans.read');
 if p_query is null or char_length(p_query)>80 or p_workspace_query is null or char_length(p_workspace_query)>80 then raise exception 'Filtro inválido.' using errcode='22023'; end if;
 pattern:='%'||replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_')||'%';
 ws_pattern:='%'||replace(replace(replace(p_workspace_query,'\','\\'),'%','\%'),'_','\_')||'%';
 select count(*) into total from control_plane.plans where p_query='' or name ilike pattern or code ilike pattern;
 select coalesce(jsonb_agg(to_jsonb(p) order by p.name,p.id),'[]'::jsonb) into items from
  (select id,code,name,description,status,revision,latest_version,published_revision from control_plane.plans where p_query='' or name ilike pattern or code ilike pattern order by name,id limit 25) p;
 if p_plan is not null then
  select to_jsonb(p)-'updated_by'||jsonb_build_object('versions',(select coalesce(jsonb_agg(to_jsonb(v)-'published_by' order by v.version desc),'[]'::jsonb) from
    (select * from control_plane.plan_versions where plan_id=p.id order by version desc limit 10) v)) into detail from control_plane.plans p where id=p_plan;
  if detail is null then raise exception 'Plano inválido.' using errcode='22023'; end if;
 end if;
 select count(*) into ws_total from public.workspaces where p_workspace_query='' or name ilike ws_pattern or slug ilike ws_pattern;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name,id),'[]'::jsonb) into choices from
  (select id,name from public.workspaces where p_workspace_query='' or name ilike ws_pattern or slug ilike ws_pattern order by name,id limit 25) w;
 if p_workspace is not null then
  select jsonb_build_object('id',w.id,'name',w.name,'protected',coalesce(r.workspace_type='platform_owner',false),'status',coalesce(r.status,'active'),'usage',control_plane.usage_snapshot(w.id)) into chosen
   from public.workspaces w left join control_plane.platform_workspace_registry r on r.workspace_id=w.id where w.id=p_workspace;
  if chosen is null then raise exception 'Workspace inválido.' using errcode='22023'; end if;
 end if;
 perform control_plane.write_audit('plans.viewed','plan',p_plan::text,null,jsonb_build_object('workspace_id',p_workspace),'Consulta do catálogo e do consumo de planos.');
 return jsonb_build_object('items',items,'total',total,'detail',detail,'workspace',chosen,'workspaces',choices,'total_workspaces',ws_total);
end $$;

-- Reserve capacity before the server calls Auth's external invitation API.
-- The reservation is short-lived, bound to its actor, email and role, and cannot
-- authorize a different user or workspace. No external call holds a SQL lock.
create function control_plane.reserve_member_slot(p_workspace uuid,p_email text,p_role public.member_role) returns uuid
language plpgsql security definer set search_path='' as $$
declare used bigint; pending bigint; ceiling bigint; reservation uuid;
begin
 if (select auth.uid()) is null or not private.is_workspace_admin(p_workspace) then raise exception 'Workspace administration required' using errcode='42501'; end if;
 p_email:=lower(btrim(p_email));
 if p_email is null or char_length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_role is null then raise exception 'Convite inválido.' using errcode='22023'; end if;
 if p_role='owner' and private.workspace_role(p_workspace)<>'owner' then raise exception 'Only owner may invite owner' using errcode='42501'; end if;
 select members into used from control_plane.workspace_usage where workspace_id=p_workspace for update;
 if not found then raise exception 'Workspace access denied' using errcode='42501'; end if;
 delete from control_plane.member_slot_reservations where workspace_id=p_workspace and expires_at<=clock_timestamp();
 if exists(select 1 from public.workspace_members m join auth.users u on u.id=m.user_id where m.workspace_id=p_workspace and lower(u.email)=p_email)
  or exists(select 1 from control_plane.member_slot_reservations where workspace_id=p_workspace and email_hash=md5(p_email)) then raise exception 'Membro ou convite já existe.' using errcode='22023'; end if;
 select (v.config->'limits'->>'members')::bigint into ceiling from control_plane.workspace_plan_assignments a join control_plane.plan_versions v on v.id=a.plan_version_id where a.workspace_id=p_workspace;
 select count(*) into pending from control_plane.member_slot_reservations where workspace_id=p_workspace;
 if (ceiling is not null and used+pending>=ceiling) or pending>=100 then raise exception 'Limite do plano atingido: members' using errcode='PGL01'; end if;
 insert into control_plane.member_slot_reservations(workspace_id,actor_id,email_hash,role) values(p_workspace,auth.uid(),md5(p_email),p_role) returning id into reservation;
 update control_plane.workspace_usage set quota_revision=quota_revision+1 where workspace_id=p_workspace;
 return reservation;
end $$;
create function control_plane.complete_member_slot(p_reservation uuid,p_user uuid) returns void
language plpgsql security definer set search_path='' as $$
declare r control_plane.member_slot_reservations%rowtype; target_email text;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into r from control_plane.member_slot_reservations where id=p_reservation and actor_id=auth.uid();
 if not found or not private.is_workspace_admin(r.workspace_id) then raise exception 'Reservation access denied' using errcode='42501'; end if;
 perform 1 from control_plane.workspace_usage where workspace_id=r.workspace_id for update;
 select * into r from control_plane.member_slot_reservations where id=p_reservation and actor_id=auth.uid() for update;
 if not found or r.expires_at<=clock_timestamp() or r.target_user_id is not null then raise exception 'Reserva expirada.' using errcode='22023'; end if;
 if r.role='owner' and private.workspace_role(r.workspace_id)<>'owner' then raise exception 'Only owner may invite owner' using errcode='42501'; end if;
 select lower(email) into target_email from auth.users where id=p_user and deleted_at is null;
 if target_email is null or md5(target_email)<>r.email_hash then raise exception 'Convidado inválido.' using errcode='22023'; end if;
 if exists(select 1 from public.workspace_members where workspace_id=r.workspace_id and user_id=p_user) then raise exception 'Usuário já é membro.' using errcode='22023'; end if;
 -- The already granted slot survives a concurrent downgrade while Auth delivers
 -- the invitation, like other operations already accepted by an external API.
 update control_plane.member_slot_reservations set target_user_id=p_user where id=r.id;
 insert into public.workspace_members(workspace_id,user_id,role) values(r.workspace_id,p_user,r.role);
 delete from control_plane.member_slot_reservations where id=r.id;
 insert into public.activities(workspace_id,actor_user_id,type,text,metadata) values(r.workspace_id,auth.uid(),'member_invited','Convite enviado para '||target_email||' como '||r.role::text,jsonb_build_object('invited_email',target_email,'role',r.role));
end $$;
create function control_plane.cancel_member_slot(p_reservation uuid) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select workspace_id into target from control_plane.member_slot_reservations where id=p_reservation and actor_id=auth.uid();
 if target is null then return; end if;
 perform 1 from control_plane.workspace_usage where workspace_id=target for update;
 delete from control_plane.member_slot_reservations where id=p_reservation and actor_id=auth.uid();
 update control_plane.workspace_usage set quota_revision=quota_revision+1 where workspace_id=target;
end $$;
create function public.reserve_member_slot(p_workspace_id uuid,p_email text,p_role public.member_role) returns uuid language sql security invoker set search_path='' as $$ select control_plane.reserve_member_slot(p_workspace_id,p_email,p_role); $$;
create function public.complete_member_slot(p_reservation_id uuid,p_user_id uuid) returns void language sql security invoker set search_path='' as $$ select control_plane.complete_member_slot(p_reservation_id,p_user_id); $$;
create function public.cancel_member_slot(p_reservation_id uuid) returns void language sql security invoker set search_path='' as $$ select control_plane.cancel_member_slot(p_reservation_id); $$;
revoke all on function control_plane.reserve_member_slot(uuid,text,public.member_role),control_plane.complete_member_slot(uuid,uuid),control_plane.cancel_member_slot(uuid),public.reserve_member_slot(uuid,text,public.member_role),public.complete_member_slot(uuid,uuid),public.cancel_member_slot(uuid) from public,anon,authenticated,service_role;
grant execute on function control_plane.reserve_member_slot(uuid,text,public.member_role),control_plane.complete_member_slot(uuid,uuid),control_plane.cancel_member_slot(uuid),public.reserve_member_slot(uuid,text,public.member_role),public.complete_member_slot(uuid,uuid),public.cancel_member_slot(uuid) to authenticated;

create function public.workspace_plan(p_workspace_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select control_plane.workspace_plan(p_workspace_id); $$;
create function public.platform_plans(p_workspace_id uuid default null,p_query text default '',p_workspace_query text default '',p_plan_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select control_plane.plans_catalog(p_workspace_id,p_query,p_workspace_query,p_plan_id); $$;
create function public.platform_save_plan(p_id uuid,p_code text,p_name text,p_description text,p_status text,p_config jsonb,p_revision bigint,p_reason text,p_confirmed boolean) returns uuid language sql security invoker set search_path='' as $$ select control_plane.save_plan(p_id,p_code,p_name,p_description,p_status,p_config,p_revision,p_reason,p_confirmed); $$;
create function public.platform_publish_plan(p_id uuid,p_revision bigint,p_reason text,p_confirmed boolean) returns uuid language sql security invoker set search_path='' as $$ select control_plane.publish_plan(p_id,p_revision,p_reason,p_confirmed); $$;
create function public.platform_assign_plan(p_workspace_id uuid,p_version_id uuid,p_revision bigint,p_reason text,p_confirmed boolean) returns void language sql security invoker set search_path='' as $$ select control_plane.assign_plan(p_workspace_id,p_version_id,p_revision,p_reason,p_confirmed); $$;
revoke all on function control_plane.valid_plan_config(jsonb),control_plane.reject_plan_version_change(),control_plane.initialize_workspace_plan(),control_plane.track_workspace_usage(),control_plane.usage_snapshot(uuid),control_plane.workspace_plan(uuid),control_plane.save_plan(uuid,text,text,text,text,jsonb,bigint,text,boolean),control_plane.publish_plan(uuid,bigint,text,boolean),control_plane.assign_plan(uuid,uuid,bigint,text,boolean),control_plane.plans_catalog(uuid,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function control_plane.workspace_plan(uuid),control_plane.save_plan(uuid,text,text,text,text,jsonb,bigint,text,boolean),control_plane.publish_plan(uuid,bigint,text,boolean),control_plane.assign_plan(uuid,uuid,bigint,text,boolean),control_plane.plans_catalog(uuid,text,text,uuid) to authenticated;
revoke all on function public.workspace_plan(uuid),public.platform_plans(uuid,text,text,uuid),public.platform_save_plan(uuid,text,text,text,text,jsonb,bigint,text,boolean),public.platform_publish_plan(uuid,bigint,text,boolean),public.platform_assign_plan(uuid,uuid,bigint,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.workspace_plan(uuid),public.platform_plans(uuid,text,text,uuid),public.platform_save_plan(uuid,text,text,text,text,jsonb,bigint,text,boolean),public.platform_publish_plan(uuid,bigint,text,boolean),public.platform_assign_plan(uuid,uuid,bigint,text,boolean) to authenticated;
