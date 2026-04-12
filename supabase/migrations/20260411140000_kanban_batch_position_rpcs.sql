-- Batch position updates: one round-trip instead of N sequential updates.

create or replace function public.batch_update_kanban_column_positions(p_updates jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.kanban_columns c
  set position = u.position
  from jsonb_to_recordset(p_updates) as u(
    id uuid,
    position int
  )
  where c.id = u.id
    and c.user_id = uid;
end;
$$;

create or replace function public.batch_update_kanban_task_positions(p_updates jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.kanban_tasks t
  set
    position = u.position,
    column_id = coalesce(u.column_id, t.column_id)
  from jsonb_to_recordset(p_updates) as u(
    id uuid,
    position int,
    column_id uuid
  )
  where t.id = u.id
    and t.user_id = uid
    and (
      u.column_id is null
      or exists (
        select 1
        from public.kanban_columns c
        where c.id = u.column_id
          and c.user_id = uid
      )
    );
end;
$$;

grant execute on function public.batch_update_kanban_column_positions(jsonb) to authenticated;
grant execute on function public.batch_update_kanban_task_positions(jsonb) to authenticated;
