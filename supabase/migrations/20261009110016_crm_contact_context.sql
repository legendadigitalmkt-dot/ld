-- Extend the existing CRM. Business rows and existing policies remain intact.
alter table public.contacts add column company text check (company is null or char_length(company) <= 160);
create index contacts_tags_gin_idx on public.contacts using gin(tags);
create index tasks_workspace_contact_idx on public.tasks(workspace_id,contact_id);
create index activities_workspace_contact_idx on public.activities(workspace_id,(metadata->>'contact_id'),created_at desc);
create index activities_workspace_deal_idx on public.activities(workspace_id,(metadata->>'deal_id'),created_at desc);
create index activities_workspace_task_idx on public.activities(workspace_id,(metadata->>'task_id'),created_at desc);
create index activities_workspace_conversation_idx on public.activities(workspace_id,(metadata->>'conversation_id'),created_at desc);

create function public.contact_context(p_workspace_id uuid,p_contact_id uuid,p_history_page integer default 1)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_contact jsonb; v_result jsonb;
begin
  if auth.uid() is null or p_workspace_id is null or not private.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode='42501';
  end if;
  if p_history_page is null or p_history_page not between 1 and 10000 then
    raise exception 'Invalid history page' using errcode='22023';
  end if;
  select to_jsonb(c) into v_contact from public.contacts c where c.workspace_id=p_workspace_id and c.id=p_contact_id;
  if v_contact is null then return null; end if;
  with
  d as materialized (select id,title,stage,value,last_activity_at from public.deals where workspace_id=p_workspace_id and contact_id=p_contact_id),
  t as materialized (select id,title,status,priority,due_at,created_at from public.tasks where workspace_id=p_workspace_id and (contact_id=p_contact_id or deal_id in (select id from d))),
  cv as materialized (select id,channel,status,unread_count,last_message_at,created_at from public.conversations where workspace_id=p_workspace_id and contact_id=p_contact_id),
  h as materialized (
    select a.id,a.type,a.text,a.actor_user_id,a.created_at
    from public.activities a where a.workspace_id=p_workspace_id and a.metadata->>'contact_id'=p_contact_id::text
    union
    select a.id,a.type,a.text,a.actor_user_id,a.created_at from public.activities a join d on a.metadata->>'deal_id'=d.id::text where a.workspace_id=p_workspace_id
    union
    select a.id,a.type,a.text,a.actor_user_id,a.created_at from public.activities a join t on a.metadata->>'task_id'=t.id::text where a.workspace_id=p_workspace_id
    union
    select a.id,a.type,a.text,a.actor_user_id,a.created_at from public.activities a join cv on a.metadata->>'conversation_id'=cv.id::text where a.workspace_id=p_workspace_id
  )
  select jsonb_build_object(
    'contact',v_contact,
    'members',(select coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.full_name,'role',m.role) order by m.created_at,m.user_id),'[]'::jsonb) from public.workspace_members m left join public.profiles p on p.id=m.user_id where m.workspace_id=p_workspace_id),
    'stats',jsonb_build_object(
      'deals',(select count(*) from d),'open_deals',(select count(*) from d where stage not in ('won','lost')),
      'pipeline',(select coalesce(sum(value),0) from d where stage not in ('won','lost')),
      'tasks',(select count(*) from t),'open_tasks',(select count(*) from t where status='open'),
      'overdue',(select count(*) from t where status='open' and due_at<now()),
      'conversations',(select count(*) from cv),'history',(select count(*) from h),
      'notes',(select count(*) from h where type='contact_note')
    ),
    'deals',(select coalesce(jsonb_agg(to_jsonb(x) order by x.closed,x.last_activity_at desc,x.id),'[]'::jsonb) from (select *,stage in ('won','lost') as closed from d order by closed,last_activity_at desc,id limit 20) x),
    'tasks',(select coalesce(jsonb_agg(to_jsonb(x) order by x.done,x.due_at nulls last,x.id),'[]'::jsonb) from (select *,status='done' as done from t order by done,due_at nulls last,id limit 20) x),
    'conversations',(select coalesce(jsonb_agg(to_jsonb(x) order by x.last_message_at desc nulls last,x.id),'[]'::jsonb) from (select * from cv order by last_message_at desc nulls last,id limit 10) x),
    'channels',(select coalesce(jsonb_agg(jsonb_build_object('channel',ch.channel,'address',coalesce(ch.display_value,ch.external_id)) order by ch.channel,ch.id),'[]'::jsonb) from public.contact_channels ch where ch.workspace_id=p_workspace_id and ch.contact_id=p_contact_id),
    'history_page',p_history_page,
    'history',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) from (select h.*,p.full_name as actor from h left join public.profiles p on p.id=h.actor_user_id order by h.created_at desc,h.id limit 30 offset ((p_history_page-1)*30)) x),
    'notes',(select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) from (select h.id,h.text,h.created_at,p.full_name as actor from h left join public.profiles p on p.id=h.actor_user_id where h.type='contact_note' order by h.created_at desc,h.id limit 5) x)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.contact_context(uuid,uuid,integer) from public,anon;
grant execute on function public.contact_context(uuid,uuid,integer) to authenticated;

create function public.update_contact_profile(p_workspace_id uuid,p_contact_id uuid,p_expected_updated_at timestamptz,p_name text,p_company text,p_email text,p_phone text,p_source text,p_status public.contact_status,p_tags text[],p_owner_user_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_contact public.contacts%rowtype; v_before jsonb; v_after jsonb; v_fields jsonb;
begin
  if auth.uid() is null or p_workspace_id is null or not private.can_edit_workspace(p_workspace_id) then
    raise exception 'Contact access denied' using errcode='42501';
  end if;
  p_name:=btrim(p_name); p_company:=nullif(btrim(p_company),''); p_email:=nullif(btrim(p_email),''); p_phone:=nullif(btrim(p_phone),''); p_source:=btrim(p_source);
  if p_name is null or char_length(p_name) not between 2 and 160
    or char_length(p_company)>160 or char_length(p_email)>254 or char_length(p_phone)>40
    or (p_email is not null and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or p_source is null or char_length(p_source) not between 1 and 80 or p_status is null
    or p_expected_updated_at is null or not isfinite(p_expected_updated_at)
    or p_tags is null or cardinality(p_tags)>10
    or exists(select 1 from unnest(p_tags) tag where tag is null or char_length(btrim(tag)) not between 1 and 32 or position(',' in tag)>0)
  then raise exception 'Invalid contact profile' using errcode='22023'; end if;
  p_tags:=array(select btrim(tag) from unnest(p_tags) with ordinality x(tag,pos) order by pos);
  if cardinality(p_tags)<>(select count(distinct tag) from unnest(p_tags) tag) then
    raise exception 'Duplicate tags' using errcode='22023';
  end if;
  if p_owner_user_id is not null and not private.workspace_has_user(p_workspace_id,p_owner_user_id) then
    raise exception 'Owner access denied' using errcode='42501';
  end if;
  select * into v_contact from public.contacts where workspace_id=p_workspace_id and id=p_contact_id for update;
  if not found then raise exception 'Contact not available' using errcode='42501'; end if;
  if v_contact.updated_at is distinct from p_expected_updated_at then
    raise exception 'Contact changed, reload before saving' using errcode='40001';
  end if;
  v_before:=jsonb_build_object('name',v_contact.name,'company',v_contact.company,'email',v_contact.email,'phone',v_contact.phone,'source',v_contact.source,'status',v_contact.status,'tags',v_contact.tags,'owner_user_id',v_contact.owner_user_id);
  v_after:=jsonb_build_object('name',p_name,'company',p_company,'email',p_email,'phone',p_phone,'source',p_source,'status',p_status,'tags',p_tags,'owner_user_id',p_owner_user_id);
  if v_before=v_after then return p_contact_id; end if;
  select jsonb_agg(key order by key) into v_fields from jsonb_each(v_after) where value is distinct from v_before->key;
  update public.contacts set name=p_name,company=p_company,email=p_email,phone=p_phone,source=p_source,status=p_status,tags=p_tags,owner_user_id=p_owner_user_id where workspace_id=p_workspace_id and id=p_contact_id;
  insert into public.activities(workspace_id,actor_user_id,type,text,metadata)
  values(p_workspace_id,auth.uid(),'contact_updated','Perfil atualizado: '||p_name,jsonb_build_object('contact_id',p_contact_id,'changed_fields',v_fields));
  return p_contact_id;
end;
$$;
revoke all on function public.update_contact_profile(uuid,uuid,timestamptz,text,text,text,text,text,public.contact_status,text[],uuid) from public,anon;
grant execute on function public.update_contact_profile(uuid,uuid,timestamptz,text,text,text,text,text,public.contact_status,text[],uuid) to authenticated;

create function public.add_contact_note(p_workspace_id uuid,p_contact_id uuid,p_body text,p_request_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_existing public.activities%rowtype;
begin
  if auth.uid() is null or p_workspace_id is null or not private.can_edit_workspace(p_workspace_id) then
    raise exception 'Note access denied' using errcode='42501';
  end if;
  p_body:=btrim(p_body);
  if p_body is null or char_length(p_body) not between 2 and 4000 or p_request_id is null then
    raise exception 'Invalid note' using errcode='22023';
  end if;
  perform 1 from public.contacts where workspace_id=p_workspace_id and id=p_contact_id for key share;
  if not found then raise exception 'Contact not available' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into v_existing from public.activities where workspace_id=p_workspace_id and id=p_request_id;
  if found then
    if v_existing.type<>'contact_note' or v_existing.actor_user_id is distinct from auth.uid() or v_existing.metadata->>'contact_id' is distinct from p_contact_id::text or v_existing.text<>p_body then
      raise exception 'Request already used' using errcode='22023';
    end if;
    return p_request_id;
  end if;
  insert into public.activities(id,workspace_id,actor_user_id,type,text,metadata)
  values(p_request_id,p_workspace_id,auth.uid(),'contact_note',p_body,jsonb_build_object('contact_id',p_contact_id));
  return p_request_id;
end;
$$;
revoke all on function public.add_contact_note(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.add_contact_note(uuid,uuid,text,uuid) to authenticated;

create function public.update_workspace_profile(p_workspace_id uuid,p_expected_updated_at timestamptz,p_name text,p_segment text,p_timezone text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_workspace public.workspaces%rowtype;
begin
  if auth.uid() is null or p_workspace_id is null or not private.is_workspace_admin(p_workspace_id) then
    raise exception 'Workspace administration denied' using errcode='42501';
  end if;
  p_name:=btrim(p_name);p_segment:=nullif(btrim(p_segment),'');p_timezone:=btrim(p_timezone);
  if p_name is null or char_length(p_name) not between 2 and 120 or char_length(p_segment)>160
    or p_timezone is null or char_length(p_timezone)>80 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone)
    or p_expected_updated_at is null or not isfinite(p_expected_updated_at)
  then raise exception 'Invalid workspace profile' using errcode='22023'; end if;
  select * into v_workspace from public.workspaces where id=p_workspace_id for update;
  if not found then raise exception 'Workspace not available' using errcode='42501';end if;
  if v_workspace.updated_at is distinct from p_expected_updated_at then
    raise exception 'Workspace changed, reload before saving' using errcode='40001';
  end if;
  if v_workspace.name=p_name and v_workspace.segment is not distinct from p_segment and v_workspace.timezone=p_timezone then return p_workspace_id;end if;
  update public.workspaces set name=p_name,segment=p_segment,timezone=p_timezone where id=p_workspace_id;
  insert into public.activities(workspace_id,actor_user_id,type,text,metadata)
  values(p_workspace_id,auth.uid(),'workspace_profile_updated','Configurações do workspace atualizadas.',jsonb_build_object('timezone_changed',v_workspace.timezone<>p_timezone));
  return p_workspace_id;
end;
$$;
revoke all on function public.update_workspace_profile(uuid,timestamptz,text,text,text) from public,anon;
grant execute on function public.update_workspace_profile(uuid,timestamptz,text,text,text) to authenticated;
