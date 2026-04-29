import { isCloudDataBackend } from "@/lib/data/authSession";
import type { Note } from "@/lib/models/notes";
import * as cloud from "@/lib/data/cloud/notesCloud";
import { browserSupabase } from "@/lib/supabase/client";
import {
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
  saveNoteOrderAction,
} from "@/lib/actions/notes";

function notSignedIn(): Error {
  return new Error("Not signed in");
}

export function saveNoteOrder(notes: Note[]): void {
  if (!isCloudDataBackend()) return;
  const items = notes.map((n, position) => ({ id: n.id, position }));
  void saveNoteOrderAction(items).catch(() => {
    /* best-effort */
  });
}

export async function fetchNotes(): Promise<Note[]> {
  return isCloudDataBackend()
    ? cloud.fetchNotesCloud(browserSupabase())
    : [];
}

export async function createNote(
  note: Omit<Note, "id" | "created_at" | "updated_at">,
): Promise<Note> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await createNoteAction(note);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateNote(
  id: string,
  updates: Partial<Omit<Note, "id" | "created_at">>,
): Promise<Note> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await updateNoteAction({ id, updates });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function deleteNote(id: string): Promise<void> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await deleteNoteAction({ id });
  if (!result.ok) throw new Error(result.message);
}
