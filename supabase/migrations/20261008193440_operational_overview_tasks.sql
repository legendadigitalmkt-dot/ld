-- Read-only summaries and atomic task actions. All execute as the authenticated caller.
create function public.growth_overview(p_workspace_id uuid, p_days integer default 30)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_timezone text; v_since timestamptz; v_result jsonb;
begin
  if auth.uid() is null or p_workspace_id is null or not private.is_workspace_member(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;
  if p_days is null or p_days not in (30, 90) then
    raise exception 'Invalid overview period' using errcode = '22023';
  end if;
  select timezone into v_timezone from public.workspaces where id = p_workspace_id;
  v_since := (((now() at time zone v_timezone)::date - (p_days - 1))::timestamp at time zone v_timezone);
  with
  c as materialized (select id, status, source, created_at from public.contacts where workspace_id = p_workspace_id),
  d as materialized (select id, contact_id, title, stage, value, probability, last_activity_at, won_at, lost_at from public.deals where workspace_id = p_workspace_id),
  t as materialized (select id, title, status, priority, due_at, contact_id, deal_id from public.tasks where workspace_id = p_workspace_id),
  followed as (
    select contact_id from t where status = 'open' and contact_id is not null
    union
    select d.contact_id from t join d on d.id = t.deal_id where t.status = 'open'
  ),
  missing as (select c.id from c where status = 'lead' and not exists (select 1 from followed f where f.contact_id = c.id)),
  deal_stats as (
    select
      count(*) filter (where stage not in ('won','lost')) as open_deals,
      coalesce(sum(value) filter (where stage not in ('won','lost')),0) as pipeline,
      coalesce(sum(value) filter (where stage = 'negotiation'),0) as negotiation,
      coalesce(sum(value) filter (where stage = 'won' and won_at between v_since and now()),0) as won,
      count(*) filter (where stage = 'won' and won_at between v_since and now()) as won_count,
      coalesce(sum(value) filter (where stage = 'lost' and lost_at between v_since and now()),0) as lost,
      count(*) filter (where stage = 'lost' and lost_at between v_since and now()) as lost_count,
      coalesce(avg(value) filter (where stage = 'won' and won_at between v_since and now()),0) as average_ticket,
      coalesce(sum(value * probability / 100.0) filter (where stage not in ('won','lost')),0) as forecast,
      count(*) filter (where stage not in ('won','lost') and last_activity_at <= now() - interval '24 hours') as idle,
      coalesce(sum(value) filter (where stage not in ('won','lost') and last_activity_at <= now() - interval '24 hours'),0) as risk
    from d
  ),
  revenue_days as (
    select day::date as day, coalesce(sum(d.value),0) as value
    from generate_series((now() at time zone v_timezone)::date - (p_days-1), (now() at time zone v_timezone)::date, interval '1 day') day
    left join d on d.stage = 'won' and (d.won_at at time zone v_timezone)::date = day::date and d.won_at <= now()
    group by day::date
  ),
  stage_counts as (select stage, count(*) as count, sum(value) as value from d where stage not in ('won','lost') group by stage),
  sources as (select coalesce(nullif(btrim(source),''),'Sem origem') as name, count(*) as count from c where created_at between v_since and now() group by 1 order by count(*) desc, 1 limit 6)
  select jsonb_build_object(
    'as_of', now(), 'days', p_days,
    'stats', (select to_jsonb(ds) || jsonb_build_object(
      'contacts', (select count(*) from c),
      'leads', (select count(*) from c where status='lead'),
      'new_leads', (select count(*) from c where created_at between v_since and now()),
      'conversion', round(100.0 * ds.won_count / nullif(ds.won_count + ds.lost_count,0),1),
      'open_tasks', (select count(*) from t where status='open'),
      'overdue', (select count(*) from t where status='open' and due_at < now()),
      'no_followup', (select count(*) from missing),
      'unread', (select count(*) from public.conversations where workspace_id=p_workspace_id and unread_count>0)
    ) from deal_stats ds),
    'revenue', (select coalesce(jsonb_agg(jsonb_build_object('day',day,'value',value) order by day),'[]'::jsonb) from revenue_days),
    'stages', (select jsonb_agg(jsonb_build_object('stage',s.stage,'count',coalesce(sc.count,0),'value',coalesce(sc.value,0)) order by s.position) from unnest(array['new','contacted','qualified','proposal','negotiation']) with ordinality s(stage,position) left join stage_counts sc on sc.stage::text=s.stage),
    'sources', (select coalesce(jsonb_agg(to_jsonb(s) order by s.count desc,s.name),'[]'::jsonb) from sources s),
    'tasks', (select coalesce(jsonb_agg(to_jsonb(x) order by x.due_at nulls last,x.id),'[]'::jsonb) from (select id,title,priority,due_at from t where status='open' order by due_at nulls last,id limit 5) x),
    'attention', (select coalesce(jsonb_agg(to_jsonb(x) order by x.last_activity_at,x.id),'[]'::jsonb) from (select id,title,value,last_activity_at from d where stage not in ('won','lost') and last_activity_at <= now()-interval '24 hours' order by last_activity_at,id limit 5) x),
    'followups', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at,x.id),'[]'::jsonb) from (select c.id,pc.name,c.created_at from c join missing m on m.id=c.id join public.contacts pc on pc.id=c.id and pc.workspace_id=p_workspace_id order by c.created_at,c.id limit 5) x),
    'activities', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) from (select id,text,created_at from public.activities where workspace_id=p_workspace_id order by created_at desc,id limit 6) x)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.growth_overview(uuid,integer) from public, anon;
grant execute on function public.growth_overview(uuid,integer) to authenticated;

create function public.create_workspace_task(p_workspace_id uuid, p_title text, p_priority public.task_priority default 'medium', p_due_at timestamptz default null, p_contact_id uuid default null, p_deal_id uuid default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_contact_id uuid;
begin
  if auth.uid() is null or p_workspace_id is null or not private.can_edit_workspace(p_workspace_id) then
    raise exception 'Task access denied' using errcode='42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 2 and 180 or p_priority is null or (p_due_at is not null and not isfinite(p_due_at)) then
    raise exception 'Invalid task' using errcode='22023';
  end if;
  if p_contact_id is not null and not exists(select 1 from public.contacts where id=p_contact_id and workspace_id=p_workspace_id) then
    raise exception 'Contact access denied' using errcode='42501';
  end if;
  if p_deal_id is not null then
    select contact_id into v_contact_id from public.deals where id=p_deal_id and workspace_id=p_workspace_id;
    if not found then raise exception 'Deal access denied' using errcode='42501'; end if;
    if p_contact_id is not null and p_contact_id <> v_contact_id then raise exception 'Contact does not match deal' using errcode='22023'; end if;
    p_contact_id := v_contact_id;
  end if;
  insert into public.tasks(workspace_id,title,priority,due_at,contact_id,deal_id,assignee_user_id)
  values(p_workspace_id,btrim(p_title),p_priority,p_due_at,p_contact_id,p_deal_id,auth.uid()) returning id into v_id;
  insert into public.activities(workspace_id,actor_user_id,type,text,metadata)
  values(p_workspace_id,auth.uid(),'task_created','Nova tarefa: '||btrim(p_title),jsonb_build_object('task_id',v_id,'contact_id',p_contact_id,'deal_id',p_deal_id));
  return v_id;
end;
$$;
revoke all on function public.create_workspace_task(uuid,text,public.task_priority,timestamptz,uuid,uuid) from public, anon;
grant execute on function public.create_workspace_task(uuid,text,public.task_priority,timestamptz,uuid,uuid) to authenticated;

create function public.set_workspace_task_status(p_workspace_id uuid,p_task_id uuid,p_status public.task_status)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_task public.tasks%rowtype;
begin
  if auth.uid() is null or p_workspace_id is null or not private.can_edit_workspace(p_workspace_id) then
    raise exception 'Task access denied' using errcode='42501';
  end if;
  if p_status is null then raise exception 'Invalid status' using errcode='22023'; end if;
  select * into v_task from public.tasks where id=p_task_id and workspace_id=p_workspace_id for update;
  if not found then raise exception 'Task not available' using errcode='42501'; end if;
  if v_task.status <> p_status then
    update public.tasks set status=p_status where id=p_task_id and workspace_id=p_workspace_id;
    insert into public.activities(workspace_id,actor_user_id,type,text,metadata)
    values(p_workspace_id,auth.uid(),'task_status_changed',case when p_status='done' then 'Tarefa concluída: ' else 'Tarefa reaberta: ' end||v_task.title,jsonb_build_object('task_id',p_task_id,'previous_status',v_task.status,'status',p_status));
  end if;
  return p_task_id;
end;
$$;
revoke all on function public.set_workspace_task_status(uuid,uuid,public.task_status) from public, anon;
grant execute on function public.set_workspace_task_status(uuid,uuid,public.task_status) to authenticated;
