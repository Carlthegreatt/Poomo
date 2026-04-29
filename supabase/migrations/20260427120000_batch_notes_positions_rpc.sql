-- One round-trip note reorder (replaces N sequential updates from the client).

create or replace function public.batch_update_notes_positions(p_updates jsonb)
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

  update public.notes n
  set
    position = u.position,
    updated_at = now()
  from jsonb_to_recordset(p_updates) as u(
    id uuid,
    position int
  )
  where n.id = u.id
    and n.user_id = uid;
end;
$$;

grant execute on function public.batch_update_notes_positions(jsonb) to authenticated;
