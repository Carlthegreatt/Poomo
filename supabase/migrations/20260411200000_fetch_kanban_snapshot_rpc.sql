-- Single round-trip board load (columns + tasks + task type labels) for auth.uid().
-- Mirrors client seeding when the board is empty.

create or replace function public.fetch_kanban_snapshot()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  now_ts timestamptz := now();
  col_n int;
  ttl_n int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select count(*)::int into col_n from public.kanban_columns where user_id = uid;
  if col_n = 0 then
    insert into public.kanban_columns (id, user_id, title, position, created_at)
    values
      (gen_random_uuid(), uid, 'Todo', 0, now_ts),
      (gen_random_uuid(), uid, 'Ongoing', 1, now_ts),
      (gen_random_uuid(), uid, 'Done', 2, now_ts);
  end if;

  select count(*)::int into ttl_n from public.task_type_labels where user_id = uid;
  if ttl_n = 0 then
    insert into public.task_type_labels (user_id, label)
    values
      (uid, 'Task'),
      (uid, 'Assignment'),
      (uid, 'Chore'),
      (uid, 'Meeting'),
      (uid, 'Bug'),
      (uid, 'Feature')
    on conflict (user_id, label) do nothing;
  end if;

  return jsonb_build_object(
    'columns',
    coalesce(
      (
        select jsonb_agg(x.col order by x.ord)
        from (
          select
            c.position as ord,
            jsonb_build_object(
              'id', c.id::text,
              'title', c.title,
              'position', c.position,
              'created_at', c.created_at
            ) as col
          from public.kanban_columns c
          where c.user_id = uid
        ) x
      ),
      '[]'::jsonb
    ),
    'tasks',
    coalesce(
      (
        select jsonb_agg(x.t order by x.ord)
        from (
          select
            t.position as ord,
            jsonb_build_object(
              'id', t.id::text,
              'column_id', t.column_id::text,
              'title', t.title,
              'description', t.description,
              'color', t.color,
              'due_date', t.due_date,
              'due_time', t.due_time,
              'priority', t.priority,
              'task_type', t.task_type,
              'position', t.position,
              'created_at', t.created_at
            ) as t
          from public.kanban_tasks t
          where t.user_id = uid
            and t.column_id in (
              select id from public.kanban_columns where user_id = uid
            )
        ) x
      ),
      '[]'::jsonb
    ),
    'task_types',
    coalesce(
      (
        select jsonb_agg(l.label order by l.label)
        from public.task_type_labels l
        where l.user_id = uid
      ),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.fetch_kanban_snapshot() to authenticated;
