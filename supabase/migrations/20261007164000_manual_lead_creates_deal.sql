-- Manual lead intake must create CRM contact + pipeline opportunity atomically.

alter table public.contacts
  add column if not exists intake_key uuid;

create unique index if not exists contacts_workspace_intake_key_unique
  on public.contacts(workspace_id, intake_key)
  where intake_key is not null;

create or replace function public.create_lead_with_deal(
  p_workspace_id uuid,
  p_name text,
  p_phone text default null,
  p_source text default 'Manual',
  p_intake_key uuid default gen_random_uuid()
)
returns table(contact_id uuid, deal_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_contact_id uuid;
  v_deal_id uuid;
  v_now timestamptz := now();
  v_name text := left(btrim(coalesce(p_name, '')), 160);
  v_phone text := nullif(left(btrim(coalesce(p_phone, '')), 40), '');
  v_source text := left(btrim(coalesce(nullif(p_source, ''), 'Manual')), 80);
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'Lead name must have at least 2 characters' using errcode = '22023';
  end if;

  if not private.can_edit_workspace(p_workspace_id) then
    raise exception 'Workspace access denied' using errcode = '42501';
  end if;

  -- Serializes retries/double submissions that reuse the same intake key.
  perform pg_advisory_xact_lock(hashtextextended(p_intake_key::text, 0));

  select c.id
    into v_contact_id
  from public.contacts c
  where c.workspace_id = p_workspace_id
    and c.intake_key = p_intake_key
  limit 1;

  if v_contact_id is null then
    insert into public.contacts(
      workspace_id,
      name,
      phone,
      source,
      status,
      owner_user_id,
      last_interaction_at,
      intake_key
    )
    values (
      p_workspace_id,
      v_name,
      v_phone,
      v_source,
      'lead',
      v_user_id,
      v_now,
      p_intake_key
    )
    returning id into v_contact_id;
  end if;

  select d.id
    into v_deal_id
  from public.deals d
  where d.workspace_id = p_workspace_id
    and d.contact_id = v_contact_id
  order by d.created_at asc
  limit 1;

  if v_deal_id is null then
    insert into public.deals(
      workspace_id,
      contact_id,
      title,
      stage,
      value,
      probability,
      owner_user_id,
      last_activity_at
    )
    values (
      p_workspace_id,
      v_contact_id,
      'Lead — ' || v_name,
      'new',
      0,
      20,
      v_user_id,
      v_now
    )
    returning id into v_deal_id;

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
      'lead_created',
      'Novo lead criado: ' || v_name,
      jsonb_build_object(
        'contact_id', v_contact_id,
        'deal_id', v_deal_id,
        'source', v_source,
        'intake_key', p_intake_key
      )
    );
  end if;

  return query select v_contact_id, v_deal_id;
end;
$$;

revoke all on function public.create_lead_with_deal(uuid,text,text,text,uuid) from public, anon;
grant execute on function public.create_lead_with_deal(uuid,text,text,text,uuid) to authenticated;
