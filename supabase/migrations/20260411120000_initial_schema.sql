-- Poomo: user-scoped productivity data with RLS

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_updated_at_idx on public.profiles (updated_at desc);

-- ---------------------------------------------------------------------------
-- kanban + task type catalog
-- ---------------------------------------------------------------------------
create table public.task_type_labels (
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, label)
);

create table public.kanban_columns (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  position int not null,
  created_at timestamptz not null default now()
);

create index kanban_columns_user_position_idx on public.kanban_columns (user_id, position);

create table public.kanban_tasks (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  column_id uuid not null references public.kanban_columns (id) on delete cascade,
  title text not null,
  description text,
  color text,
  due_date date,
  due_time text,
  priority text,
  task_type text,
  position int not null,
  created_at timestamptz not null default now(),
  constraint kanban_tasks_priority_chk check (
    priority is null
    or priority in ('low', 'medium', 'high')
  )
);

create index kanban_tasks_column_position_idx on public.kanban_tasks (column_id, position);
create index kanban_tasks_user_due_idx on public.kanban_tasks (user_id, due_date);

-- ---------------------------------------------------------------------------
-- focus sessions (stats)
-- ---------------------------------------------------------------------------
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  phase text not null,
  duration_ms int not null,
  task_id uuid references public.kanban_tasks (id) on delete set null,
  task_title text,
  constraint focus_sessions_phase_chk check (
    phase in ('focus', 'shortBreak', 'longBreak')
  )
);

create index focus_sessions_user_ended_idx on public.focus_sessions (user_id, ended_at desc);

-- ---------------------------------------------------------------------------
-- calendar
-- ---------------------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  color text,
  created_at timestamptz not null default now()
);

create index calendar_events_user_start_idx on public.calendar_events (user_id, start_at);

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
create table public.notes (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null,
  color text,
  pinned boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_updated_idx on public.notes (user_id, updated_at desc);

create index notes_user_position_idx on public.notes (user_id, position);

-- ---------------------------------------------------------------------------
-- flashcards (normalized)
-- ---------------------------------------------------------------------------
create table public.flashcard_decks (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  color text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index flashcard_decks_user_position_idx on public.flashcard_decks (user_id, position);

create table public.flashcards (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null references public.flashcard_decks (id) on delete cascade,
  front text not null,
  back text not null,
  position int not null,
  created_at timestamptz not null default now()
);

create index flashcards_deck_position_idx on public.flashcards (deck_id, position);

-- ---------------------------------------------------------------------------
-- New user → profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.task_type_labels enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.calendar_events enable row level security;
alter table public.notes enable row level security;
alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;

-- profiles
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);

create policy profiles_update_own on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- task_type_labels
create policy task_type_labels_all_own on public.task_type_labels for all using (auth.uid() = user_id)
with
  check (auth.uid() = user_id);

-- kanban_columns
create policy kanban_columns_all_own on public.kanban_columns for all using (auth.uid() = user_id)
with
  check (auth.uid() = user_id);

-- kanban_tasks
create policy kanban_tasks_all_own on public.kanban_tasks for all using (auth.uid() = user_id)
with
  check (auth.uid() = user_id);

-- focus_sessions
create policy focus_sessions_all_own on public.focus_sessions for all using (auth.uid() = user_id)
with
  check (auth.uid() = user_id);

-- calendar_events
create policy calendar_events_all_own on public.calendar_events for all using (auth.uid() = user_id)
with
  check (auth.uid() = user_id);

-- notes
create policy notes_all_own on public.notes for all using (auth.uid() = user_id)
with
  check (auth.uid() = user_id);

-- flashcard_decks
create policy flashcard_decks_all_own on public.flashcard_decks for all using (auth.uid() = user_id)
with
  check (auth.uid() = user_id);

-- flashcards
create policy flashcards_all_own on public.flashcards for all using (auth.uid() = user_id)
with
  check (auth.uid() = user_id);
