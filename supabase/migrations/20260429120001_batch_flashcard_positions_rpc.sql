-- One round-trip flashcard deck + card position updates (replaces N+M sequential UPDATEs).

create or replace function public.batch_update_flashcard_deck_positions(p_updates jsonb)
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

  update public.flashcard_decks d
  set
    position = u.position,
    updated_at = now()
  from jsonb_to_recordset(p_updates) as u(
    id uuid,
    position int
  )
  where d.id = u.id
    and d.user_id = uid;
end;
$$;

create or replace function public.batch_update_flashcard_positions(p_updates jsonb)
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

  update public.flashcards f
  set position = u.position
  from jsonb_to_recordset(p_updates) as u(
    id uuid,
    position int
  )
  where f.id = u.id
    and f.user_id = uid;
end;
$$;

grant execute on function public.batch_update_flashcard_deck_positions(jsonb) to authenticated;
grant execute on function public.batch_update_flashcard_positions(jsonb) to authenticated;
