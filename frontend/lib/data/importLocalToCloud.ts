import type { SupabaseClient } from "@supabase/supabase-js";
import { readJSON } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import type { KanbanBoardSnapshot } from "@/lib/kanbanModel";
import type { FocusSession } from "@/lib/statsTypes";
import type { CalendarEvent } from "@/lib/calendarModel";
import type { Note } from "@/lib/notesModel";
import type { FlashcardDeck } from "@/lib/flashcardsModel";
import type { SidebarOrderItem } from "@/lib/data/preferencesCache";
import { focusSessionToRow } from "@/lib/data/mappers";

const IMPORT_INSERT_CHUNK = 200;

function chunkInsert<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    out.push(rows.slice(i, i + size));
  }
  return out;
}

function hasMeaningfulLocalData(): boolean {
  const sessions = readJSON<FocusSession[]>(STORAGE_KEYS.SESSIONS, []);
  if (sessions.length > 0) return true;
  const board = readJSON<KanbanBoardSnapshot | null>(STORAGE_KEYS.KANBAN, null);
  if (board?.tasks?.length) return true;
  const notes = readJSON<Note[]>(STORAGE_KEYS.NOTES, []);
  if (notes.length > 0) return true;
  const events = readJSON<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []);
  if (events.length > 0) return true;
  const decks = readJSON<FlashcardDeck[]>(STORAGE_KEYS.FLASHCARDS, []);
  if (decks.some((d) => d.cards.length > 0)) return true;
  return false;
}

async function cloudHasUserContent(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const [
    { count: taskCount },
    { count: sessionCount },
    { count: noteCount },
    { count: eventCount },
    { count: deckCount },
  ] = await Promise.all([
    supabase
      .from("kanban_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("focus_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("notes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("calendar_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("flashcard_decks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  return [taskCount, sessionCount, noteCount, eventCount, deckCount].some(
    (c) => (c ?? 0) > 0,
  );
}

/**
 * One-time migration: localStorage → Supabase when the account has no cloud rows yet.
 * Sets `preferences.imported_local` so this does not run again.
 *
 * @returns `true` if `profiles.preferences` was updated — caller should refetch profile cache.
 */
export async function tryImportLocalToCloud(
  supabase: SupabaseClient,
  userId: string,
  options?: { prefetchedRawPreferences?: Record<string, unknown> },
): Promise<boolean> {
  let prefs: Record<string, unknown>;
  if (options?.prefetchedRawPreferences !== undefined) {
    prefs = options.prefetchedRawPreferences;
  } else {
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", userId)
      .single();
    if (pErr) return false;
    prefs = (profile?.preferences ?? {}) as Record<string, unknown>;
  }

  if (prefs.imported_local === true) return false;

  if (await cloudHasUserContent(supabase, userId)) {
    await supabase
      .from("profiles")
      .update({
        preferences: { ...prefs, imported_local: true },
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    return true;
  }

  if (!hasMeaningfulLocalData()) {
    await supabase
      .from("profiles")
      .update({
        preferences: { ...prefs, imported_local: true },
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    return true;
  }

  const board = readJSON<KanbanBoardSnapshot>(STORAGE_KEYS.KANBAN, {
    columns: [],
    tasks: [],
    task_types: [],
  });

  const { error: delTasks } = await supabase
    .from("kanban_tasks")
    .delete()
    .eq("user_id", userId);
  if (delTasks) throw delTasks;
  const { error: delCols } = await supabase
    .from("kanban_columns")
    .delete()
    .eq("user_id", userId);
  if (delCols) throw delCols;
  await supabase.from("task_type_labels").delete().eq("user_id", userId);

  const columnRows = board.columns
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id,
      user_id: userId,
      title: c.title,
      position: c.position,
      created_at: c.created_at,
    }));
  for (const batch of chunkInsert(columnRows, IMPORT_INSERT_CHUNK)) {
    const { error } = await supabase.from("kanban_columns").insert(batch);
    if (error) throw error;
  }

  const labelRows = [...new Set(board.task_types ?? [])].map((label) => ({
    user_id: userId,
    label,
  }));
  for (const batch of chunkInsert(labelRows, IMPORT_INSERT_CHUNK)) {
    const { error } = await supabase.from("task_type_labels").upsert(batch, {
      onConflict: "user_id,label",
    });
    if (error) throw error;
  }

  const taskRows = board.tasks.map((t) => ({
    id: t.id,
    user_id: userId,
    column_id: t.column_id,
    title: t.title,
    description: t.description,
    color: t.color,
    due_date: t.due_date,
    due_time: t.due_time,
    priority: t.priority,
    task_type: t.task_type,
    position: t.position,
    created_at: t.created_at,
  }));
  for (const batch of chunkInsert(taskRows, IMPORT_INSERT_CHUNK)) {
    const { error } = await supabase.from("kanban_tasks").insert(batch);
    if (error) throw error;
  }

  const sessions = readJSON<FocusSession[]>(STORAGE_KEYS.SESSIONS, []);
  const sessionRows = sessions.map((s) => focusSessionToRow(userId, s));
  for (const batch of chunkInsert(sessionRows, IMPORT_INSERT_CHUNK)) {
    const { error } = await supabase.from("focus_sessions").insert(batch);
    if (error) throw error;
  }

  const events = readJSON<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []);
  const eventRows = events.map((ev) => ({
    id: ev.id,
    user_id: userId,
    title: ev.title,
    description: ev.description,
    start_at: ev.start,
    end_at: ev.end,
    all_day: ev.all_day,
    color: ev.color,
    created_at: ev.created_at,
  }));
  for (const batch of chunkInsert(eventRows, IMPORT_INSERT_CHUNK)) {
    const { error } = await supabase.from("calendar_events").insert(batch);
    if (error) throw error;
  }

  const notes = readJSON<Note[]>(STORAGE_KEYS.NOTES, []);
  const noteRows = notes.map((note, i) => ({
    id: note.id,
    user_id: userId,
    title: note.title,
    content: note.content,
    color: note.color,
    pinned: note.pinned,
    position: i,
    created_at: note.created_at,
    updated_at: note.updated_at,
  }));
  for (const batch of chunkInsert(noteRows, IMPORT_INSERT_CHUNK)) {
    const { error } = await supabase.from("notes").insert(batch);
    if (error) throw error;
  }

  const decks = readJSON<FlashcardDeck[]>(STORAGE_KEYS.FLASHCARDS, []);
  const deckRows = decks.map((d, di) => ({
    id: d.id,
    user_id: userId,
    title: d.title,
    color: d.color,
    position: di,
    created_at: d.created_at,
    updated_at: d.updated_at,
  }));
  for (const batch of chunkInsert(deckRows, IMPORT_INSERT_CHUNK)) {
    const { error } = await supabase.from("flashcard_decks").insert(batch);
    if (error) throw error;
  }

  const cardRows: {
    id: string;
    user_id: string;
    deck_id: string;
    front: string;
    back: string;
    position: number;
    created_at: string;
  }[] = [];
  for (const d of decks) {
    for (let ci = 0; ci < d.cards.length; ci++) {
      const c = d.cards[ci];
      cardRows.push({
        id: c.id,
        user_id: userId,
        deck_id: d.id,
        front: c.front,
        back: c.back,
        position: ci,
        created_at: c.created_at,
      });
    }
  }
  for (const batch of chunkInsert(cardRows, IMPORT_INSERT_CHUNK)) {
    const { error } = await supabase.from("flashcards").insert(batch);
    if (error) throw error;
  }

  let daily_goal: number | undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_GOAL);
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) daily_goal = n;
    }
  } catch {
    /* ignore */
  }

  let sidebar_order: SidebarOrderItem[] | undefined;
  try {
    const raw = readJSON<SidebarOrderItem[] | null>(
      STORAGE_KEYS.SIDEBAR_ORDER,
      null,
    );
    if (raw && raw.length > 0) sidebar_order = raw;
  } catch {
    /* ignore */
  }

  await supabase
    .from("profiles")
    .update({
      preferences: {
        ...prefs,
        imported_local: true,
        ...(daily_goal ? { daily_goal } : {}),
        ...(sidebar_order ? { sidebar_order } : {}),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  return true;
}
