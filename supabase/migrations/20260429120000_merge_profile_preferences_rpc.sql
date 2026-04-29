-- Atomic jsonb merge for profile preferences (prevents read-then-write race).

create or replace function public.merge_profile_preferences(
  p_user_id uuid,
  p_partial jsonb,
  p_now timestamptz default now()
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.profiles
  set
    preferences = coalesce(preferences, '{}'::jsonb) || p_partial,
    updated_at = p_now
  where id = p_user_id;

  if not found then
    insert into public.profiles (id, preferences, updated_at)
    values (p_user_id, p_partial, p_now)
    on conflict (id) do update
    set
      preferences = coalesce(profiles.preferences, '{}'::jsonb) || p_partial,
      updated_at = p_now;
  end if;
end;
$$;

grant execute on function public.merge_profile_preferences(uuid, jsonb, timestamptz) to authenticated;
