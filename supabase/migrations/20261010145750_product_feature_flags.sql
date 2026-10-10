-- Product administration v1. Existing capabilities remain enabled; no provider is activated.
create table control_plane.product_features (
 code text primary key check(code in ('crm','whatsapp','growth_ai')),
 label text not null, description text not null, capabilities text[] not null,
 position integer not null unique
);
create table control_plane.feature_rules (
 id uuid primary key default gen_random_uuid(),
 feature_code text not null references control_plane.product_features(code) on delete restrict,
 workspace_id uuid references public.workspaces(id) on delete restrict,
 state text not null check(state in ('enabled','beta','disabled','inherit')),
 revision bigint not null default 1 check(revision>0),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 check(workspace_id is not null or state<>'inherit')
);
create unique index feature_rules_global_idx on control_plane.feature_rules(feature_code) where workspace_id is null;
create unique index feature_rules_workspace_idx on control_plane.feature_rules(feature_code,workspace_id) where workspace_id is not null;
create index feature_rules_workspace_fk_idx on control_plane.feature_rules(workspace_id) where workspace_id is not null;
create index feature_rules_updated_by_idx on control_plane.feature_rules(updated_by);
alter table control_plane.product_features enable row level security;
alter table control_plane.product_features force row level security;
alter table control_plane.feature_rules enable row level security;
alter table control_plane.feature_rules force row level security;
revoke all on control_plane.product_features,control_plane.feature_rules from public,anon,authenticated,service_role;

insert into control_plane.product_features(code,label,description,capabilities,position) values
 ('crm','CRM e operação','Relacionamento, vendas e execução no workspace.',array['Contatos','Funil de vendas','Tarefas','Resultados','Onboarding'],1),
 ('whatsapp','WhatsApp','Atendimento e mensagens pela integração existente.',array['Inbox','Mensagens e templates','Conexão com a Meta'],2),
 ('growth_ai','Growth AI','Assistência ao contato com mensagens para revisão.',array['Resumo do contato','Próximo passo','Rascunhos de mensagens'],3);
insert into control_plane.feature_rules(feature_code,state) values ('crm','enabled'),('whatsapp','enabled'),('growth_ai','beta');
insert into control_plane.platform_permissions(code,domain,description) values
 ('product.read','product','Consultar catálogo, regras e estado efetivo dos módulos.'),
 ('feature_flags.manage','product','Alterar regras globais e por workspace com revisão, motivo e auditoria.');
insert into control_plane.platform_role_permissions(role_code,permission_code)
select r.code,p.code from control_plane.platform_roles r cross join control_plane.platform_permissions p
where p.code in ('product.read','feature_flags.manage') and
 (r.code in ('platform_owner','super_admin','product_admin') or (r.code='analyst' and p.code='product.read'));
update control_plane.platform_roles set description='Administração de módulos e feature flags; sem cobrança, usuários ou segredos.' where code='product_admin';
alter table control_plane.admin_audit_logs drop constraint admin_audit_logs_entity_type_check;
alter table control_plane.admin_audit_logs add constraint admin_audit_logs_entity_type_check
 check(entity_type in ('overview','user','workspace','role','settings','audit','product','feature'));

-- Ungranted invoker helper: usable only inside the authorized private functions.
-- A global disabled state is a kill switch; workspace overrides cannot bypass it.
create function control_plane.resolve_module(p_workspace uuid,p_feature text) returns jsonb
language sql stable security invoker set search_path='' as $$
 with rules as materialized (
  select g.feature_code,
   case when g.state='disabled' then 'disabled' else coalesce(nullif(w.state,'inherit'),g.state) end as state,
   case when g.state='disabled' or w.state is null or w.state='inherit' then 'global' else 'workspace' end as source
  from control_plane.feature_rules g left join control_plane.feature_rules w on w.feature_code=g.feature_code and w.workspace_id=p_workspace
  where g.workspace_id is null
 ), effective as (
  select state,source,p_feature='growth_ai' and coalesce((select state='disabled' from rules where feature_code='crm'),true) as dependency_off
  from rules where feature_code=p_feature
 ) select coalesce((select jsonb_build_object('enabled',state<>'disabled' and not dependency_off,
   'state',case when dependency_off then 'disabled' else state end,
   'source',case when state='disabled' and source='global' then 'global' when dependency_off then 'dependency' else source end)
  from effective),jsonb_build_object('enabled',false,'state','disabled','source','unavailable'));
$$;
create function control_plane.module_enabled(p_workspace uuid,p_feature text) returns boolean
language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and private.is_workspace_member(p_workspace)
  and coalesce((control_plane.resolve_module(p_workspace,p_feature)->>'enabled')::boolean,false);
$$;
create function control_plane.workspace_modules(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or p_workspace is null or not private.is_workspace_member(p_workspace) then
  raise exception 'Workspace access denied' using errcode='42501';
 end if;
 return (select jsonb_object_agg(code,control_plane.resolve_module(p_workspace,code)) from control_plane.product_features);
end $$;
create function control_plane.product(p_workspace uuid,p_query text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare chosen jsonb; choices jsonb; items jsonb; pattern text; total bigint;
begin
 perform control_plane.assert_permission('product.read');
 if p_query is null or char_length(p_query)>80 then raise exception 'Filtro inválido.' using errcode='22023'; end if;
 if p_workspace is not null then
  select jsonb_build_object('id',w.id,'name',w.name,'status',coalesce(r.status,'active')) into chosen
   from public.workspaces w left join control_plane.platform_workspace_registry r on r.workspace_id=w.id where w.id=p_workspace;
  if chosen is null then raise exception 'Workspace inválido.' using errcode='22023'; end if;
 end if;
 pattern := '%' || replace(replace(replace(p_query,'\','\\'),'%','\%'),'_','\_') || '%';
 select count(*) into total from public.workspaces where p_query='' or name ilike pattern or slug ilike pattern or id::text=p_query;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name,id),'[]'::jsonb) into choices
 from (select id,name from public.workspaces where p_query='' or name ilike pattern or slug ilike pattern or id::text=p_query order by name,id limit 25) w;
 select jsonb_agg(jsonb_build_object('code',f.code,'label',f.label,'description',f.description,'capabilities',f.capabilities,
  'global',jsonb_build_object('state',g.state,'revision',g.revision,'updated_at',g.updated_at),
  'rule',jsonb_build_object('state',coalesce(w.state,'inherit'),'revision',coalesce(w.revision,0),'updated_at',w.updated_at),
  'effective',control_plane.resolve_module(p_workspace,f.code)) order by f.position) into items
 from control_plane.product_features f join control_plane.feature_rules g on g.feature_code=f.code and g.workspace_id is null
 left join control_plane.feature_rules w on w.feature_code=f.code and w.workspace_id=p_workspace;
 perform control_plane.write_audit('product.viewed','product',p_workspace::text,null,jsonb_build_object('scope',case when p_workspace is null then 'global' else 'workspace' end),'Consulta do catálogo e das regras de módulos.');
 return jsonb_build_object('workspace',chosen,'workspaces',choices,'total_workspaces',total,'features',items);
end $$;
create function control_plane.set_feature_rule(p_feature text,p_workspace uuid,p_state text,p_revision bigint,p_global_revision bigint,p_reason text,p_confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare g control_plane.feature_rules%rowtype; w control_plane.feature_rules%rowtype; previous jsonb; next_rule jsonb;
begin
 perform control_plane.assert_permission('feature_flags.manage');
 p_reason:=control_plane.valid_reason(p_reason);
 if p_confirmed is distinct from true or p_state is null or p_state not in ('enabled','beta','disabled','inherit')
  or p_revision is null or p_revision<0 or p_global_revision is null or p_global_revision<1
  or (p_workspace is null and p_state='inherit') then raise exception 'Regra inválida.' using errcode='22023'; end if;
 -- Serializes all edits to this feature, including creation of a first override.
 select * into g from control_plane.feature_rules where feature_code=p_feature and workspace_id is null for update;
 if not found then raise exception 'Módulo inválido.' using errcode='22023'; end if;
 if g.revision<>p_global_revision then raise exception 'A regra global mudou.' using errcode='40001'; end if;
 if p_workspace is null then
  if p_revision<>g.revision then raise exception 'A regra mudou.' using errcode='40001'; end if;
  if p_state=g.state then raise exception 'Nenhuma alteração informada.' using errcode='22023'; end if;
  previous:=jsonb_build_object('scope','global','state',g.state,'revision',g.revision);
  update control_plane.feature_rules set state=p_state,revision=revision+1,updated_by=auth.uid(),updated_at=now()
   where id=g.id returning jsonb_build_object('scope','global','state',state,'revision',revision) into next_rule;
 else
  if not exists(select 1 from public.workspaces where id=p_workspace) then raise exception 'Workspace inválido.' using errcode='22023'; end if;
  select * into w from control_plane.feature_rules where feature_code=p_feature and workspace_id=p_workspace for update;
  if coalesce(w.revision,0)<>p_revision then raise exception 'A regra do workspace mudou.' using errcode='40001'; end if;
  if coalesce(w.state,'inherit')=p_state then raise exception 'Nenhuma alteração informada.' using errcode='22023'; end if;
  previous:=jsonb_build_object('scope','workspace','workspace_id',p_workspace,'state',coalesce(w.state,'inherit'),'revision',coalesce(w.revision,0),'global_revision',g.revision,'effective',control_plane.resolve_module(p_workspace,p_feature));
  if w.id is null then
   insert into control_plane.feature_rules(feature_code,workspace_id,state,updated_by) values(p_feature,p_workspace,p_state,auth.uid())
    returning jsonb_build_object('state',state,'revision',revision) into next_rule;
  else
   update control_plane.feature_rules set state=p_state,revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=w.id
    returning jsonb_build_object('state',state,'revision',revision) into next_rule;
  end if;
  next_rule:=next_rule || jsonb_build_object('scope','workspace','workspace_id',p_workspace,'global_revision',g.revision,'effective',control_plane.resolve_module(p_workspace,p_feature));
 end if;
 perform control_plane.write_audit('feature.rule_changed','feature',p_feature||':'||coalesce(p_workspace::text,'global'),previous,next_rule,p_reason);
end $$;

create function public.workspace_modules(p_workspace_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select control_plane.workspace_modules(p_workspace_id); $$;
create function public.platform_product(p_workspace_id uuid default null,p_query text default '') returns jsonb language sql security invoker set search_path='' as $$ select control_plane.product(p_workspace_id,p_query); $$;
create function public.platform_set_feature_rule(p_feature text,p_workspace_id uuid,p_state text,p_revision bigint,p_global_revision bigint,p_reason text,p_confirmed boolean) returns void language sql security invoker set search_path='' as $$ select control_plane.set_feature_rule(p_feature,p_workspace_id,p_state,p_revision,p_global_revision,p_reason,p_confirmed); $$;
revoke all on function control_plane.resolve_module(uuid,text),control_plane.module_enabled(uuid,text),control_plane.workspace_modules(uuid),control_plane.product(uuid,text),control_plane.set_feature_rule(text,uuid,text,bigint,bigint,text,boolean) from public,anon,authenticated,service_role;
grant execute on function control_plane.module_enabled(uuid,text),control_plane.workspace_modules(uuid),control_plane.product(uuid,text),control_plane.set_feature_rule(text,uuid,text,bigint,bigint,text,boolean) to authenticated;
revoke all on function public.workspace_modules(uuid),public.platform_product(uuid,text),public.platform_set_feature_rule(text,uuid,text,bigint,bigint,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.workspace_modules(uuid),public.platform_product(uuid,text),public.platform_set_feature_rule(text,uuid,text,bigint,bigint,text,boolean) to authenticated;

-- Restrictive policies intersect with existing tenant/role policies; never widen access.
-- Existing operational RPCs are security invoker, so the same checks apply to them.
-- Service-role webhook ingestion retains its existing RLS bypass and preserves inbound events.
do $$ declare t text; begin
 foreach t in array array['contacts','deals','tasks','activities'] loop
  execute format('create policy "CRM module access" on public.%I as restrictive for all to authenticated using ((select control_plane.module_enabled(workspace_id,''crm''))) with check ((select control_plane.module_enabled(workspace_id,''crm'')))',t);
 end loop;
 foreach t in array array['conversations','messages','message_status_events','contact_channels'] loop
  execute format('create policy "WhatsApp module access" on public.%I as restrictive for all to authenticated using ((select control_plane.module_enabled(workspace_id,''whatsapp''))) with check ((select control_plane.module_enabled(workspace_id,''whatsapp'')))',t);
 end loop;
end $$;
