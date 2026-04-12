import { isCloudDataBackend } from "@/lib/data/authSession";
import type { Note } from "@/lib/notesModel";
import * as local from "@/lib/data/local/notesLocal";
import * as cloud from "@/lib/data/cloud/notesCloud";
import { browserSupabase } from "@/lib/supabase/client";

export function saveNoteOrder(notes: Note[]): void {
  if (isCloudDataBackend()) {
    void cloud.saveNoteOrderCloud(browserSupabase(), notes).catch(() => {
      /* best-effort */
    });
    return;
  }
  local.saveNoteOrderLocal(notes);
}

export async function fetchNotes(): Promise<Note[]> {
  return isCloudDataBackend()
    ? cloud.fetchNotesCloud(browserSupabase())
    : local.fetchNotesLocal();
}

export async function createNote(
  note: Omit<Note, "id" | "created_at" | "updated_at">,
): Promise<Note> {
  return isCloudDataBackend()
    ? cloud.createNoteCloud(browserSupabase(), note)
    : local.createNoteLocal(note);
}

export async function updateNote(
  id: string,
  updates: Partial<Omit<Note, "id" | "created_at">>,
): Promise<Note> {
  return isCloudDataBackend()
    ? cloud.updateNoteCloud(browserSupabase(), id, updates)
    : local.updateNoteLocal(id, updates);
}

export async function deleteNote(id: string): Promise<void> {
  return isCloudDataBackend()
    ? cloud.deleteNoteCloud(browserSupabase(), id)
    : local.deleteNoteLocal(id);
}
