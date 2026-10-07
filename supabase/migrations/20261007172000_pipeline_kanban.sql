-- Pipeline Kanban milestone: atomic stage/value mutations with audit history.

create or replace function public.move_deal_stage(
  p_workspace_id uuid,
  p_deal_id uuid,
  p_stage public.deal_stage
)
returns table(
  deal_id uuid,
  previous_stage public.deal_stage,
  current_stage public.deal_stage,
  probability smallint,
  won_at timestamptz,
  lost_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_previous_stage public.deal_stage;
  v_contact_id uuid;
  v_value numeric(14,2);
  v_probability smallint;
  v_won_at timestamptz;
  v_lost_at timestamptz;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not private.can_edit_workspace(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  select d.stage, d.contact_id, d.value
    into v_previous_stage, v_contact_id, v_value
  from public.deals d
  where d.id = p_deal_id
    and d.workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Deal not found' using errcode = 'P0002';
  end if;

  v_probability := case p_stage
    when 'new' then 20
    when 'contacted' then 30
    when 'qualified' then 50
    when 'proposal' then 70
    when 'negotiation' then 85
    when 'won' then 100
    when 'lost' then 0
  end;

  v_won_at := case when p_stage = 'won' then v_now else null end;
  v_lost_at := case when p_stage = 'lost' then v_now else null end;

  update public.deals
  set
    stage = p_stage,
    probability = v_probability,
    last_activity_at = v_now,
    won_at = v_won_at,
    lost_at = v_lost_at
  where id = p_deal_id
    and workspace_id = p_workspace_id;

  update public.contacts
  set
    status = case when p_stage = 'won' then 'customer'::public.contact_status else 'lead'::public.contact_status end,
    last_interaction_at = v_now
  where id = v_contact_id
    and workspace_id = p_workspace_id;

  if v_previous_stage is distinct from p_stage then
    insert into public.activities(
      workspace_id,
      actor_user_id,
      type,
      text,
      metadata
    )
    values (
      p_workspace_id,
      v_user_id,
      'deal_stage_changed',
      'Oportunidade movida de ' || v_previous_stage::text || ' para ' || p_stage::text,
      jsonb_build_object(
        'deal_id', p_deal_id,
        'contact_id', v_contact_id,
        'previous_stage', v_previous_stage,
        'current_stage', p_stage,
        'probability', v_probability,
        'value', v_value
      )
    );
  end if;

  return query
  select p_deal_id, v_previous_stage, p_stage, v_probability, v_won_at, v_lost_at;
end;
$$;

create or replace function public.update_deal_value(
  p_workspace_id uuid,
  p_deal_id uuid,
  p_value numeric
)
returns table(
  deal_id uuid,
  previous_value numeric,
  current_value numeric
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_previous_value numeric(14,2);
  v_contact_id uuid;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not private.can_edit_workspace(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  if p_value is null or p_value < 0 or p_value > 999999999999.99 then
    raise exception 'Invalid deal value' using errcode = '22023';
  end if;

  select d.value, d.contact_id
    into v_previous_value, v_contact_id
  from public.deals d
  where d.id = p_deal_id
    and d.workspace_id = p_workspace_id
  for update;

  if not found then
    raise exception 'Deal not found' using errcode = 'P0002';
  end if;

  update public.deals
  set
    value = round(p_value, 2),
    last_activity_at = v_now
  where id = p_deal_id
    and workspace_id = p_workspace_id;

  if v_previous_value is distinct from round(p_value, 2) then
    insert into public.activities(
      workspace_id,
      actor_user_id,
      type,
      text,
      metadata
    )
    values (
      p_workspace_id,
      v_user_id,
      'deal_value_changed',
      'Valor da oportunidade atualizado.',
      jsonb_build_object(
        'deal_id', p_deal_id,
        'contact_id', v_contact_id,
        'previous_value', v_previous_value,
        'current_value', round(p_value, 2)
      )
    );
  end if;

  return query select p_deal_id, v_previous_value, round(p_value, 2);
end;
$$;

revoke all on function public.move_deal_stage(uuid,uuid,public.deal_stage) from public, anon;
revoke all on function public.update_deal_value(uuid,uuid,numeric) from public, anon;
grant execute on function public.move_deal_stage(uuid,uuid,public.deal_stage) to authenticated;
grant execute on function public.update_deal_value(uuid,uuid,numeric) to authenticated;
