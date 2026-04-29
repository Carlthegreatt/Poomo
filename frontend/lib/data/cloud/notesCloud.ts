import type { SupabaseClient } from "@supabase/supabase-js";
import { generateId } from "@/lib/storage";
import type { Note } from "@/lib/models/notes";
import { requireDataUserId } from "@/lib/data/cloud/supabaseDataUser";
import { NOTES_FETCH_LIMIT } from "@/lib/data/fetchLimits";

function mapNote(row: {
  id: string;
  title: string;
  content: string;
  color: string | null;
  pinned: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color,
    pinned: row.pinned,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchNotesCloud(
  supabase: SupabaseClient,
): Promise<Note[]> {
  // RLS policies filter by auth.uid() automatically.
  // No need for requireDataUserId() — avoids a getUser() race during bootstrap.
  const { data, error } = await supabase
    .from("notes")
    .select(
      "id,title,content,color,pinned,position,created_at,updated_at",
    )
    .order("position")
    .limit(NOTES_FETCH_LIMIT);
  if (error) throw error;
  return (data ?? []).map((r) => mapNote(r as Parameters<typeof mapNote>[0]));
}

export async function createNoteCloud(
  supabase: SupabaseClient,
  note: Omit<Note, "id" | "created_at" | "updated_at">,
): Promise<Note> {
  const userId = await requireDataUserId(supabase);
  const { count } = await supabase
    .from("notes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  const position = count ?? 0;
  const id = generateId();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: userId,
    title: note.title,
    content: note.content,
    color: note.color,
    pinned: note.pinned,
    position,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from("notes")
    .insert(row)
    .select(
      "id,title,content,color,pinned,position,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  return mapNote(data as Parameters<typeof mapNote>[0]);
}

export async function updateNoteCloud(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<Note, "id" | "created_at">>,
): Promise<Note> {
  const userId = await requireDataUserId(supabase);
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.content !== undefined) patch.content = updates.content;
  if (updates.color !== undefined) patch.color = updates.color;
  if (updates.pinned !== undefined) patch.pinned = updates.pinned;

  const { data, error } = await supabase
    .from("notes")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select(
      "id,title,content,color,pinned,position,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  return mapNote(data as Parameters<typeof mapNote>[0]);
}

export async function deleteNoteCloud(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const userId = await requireDataUserId(supabase);
  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function saveNoteOrderCloud(
  supabase: SupabaseClient,
  notes: Note[],
): Promise<void> {
  await requireDataUserId(supabase);
  const p_updates = notes.map((n, position) => ({
    id: n.id,
    position,
  }));
  const { error } = await supabase.rpc("batch_update_notes_positions", {
    p_updates,
  });
  if (error) throw error;
}
