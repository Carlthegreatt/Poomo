import { readJSON, writeJSON, generateId } from "@/lib/storage";
import { ACCENT_COLORS, STORAGE_KEYS } from "@/lib/constants";

export { ACCENT_COLORS as NOTE_COLORS };

export interface Note {
  id: string;
  title: string;
  content: string; // HTML from rich text editor
  color: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

function readNotes(): Note[] {
  return readJSON<Note[]>(STORAGE_KEYS.NOTES, []);
}

function writeNotes(notes: Note[]): void {
  writeJSON(STORAGE_KEYS.NOTES, notes);
}

export function saveNoteOrder(notes: Note[]): void {
  writeNotes(notes);
}

export async function fetchNotes(): Promise<Note[]> {
  return readNotes();
}

export async function createNote(
  note: Omit<Note, "id" | "created_at" | "updated_at">,
): Promise<Note> {
  const notes = readNotes();
  const now = new Date().toISOString();
  const newNote: Note = {
    ...note,
    id: generateId(),
    created_at: now,
    updated_at: now,
  };
  notes.push(newNote);
  writeNotes(notes);
  return newNote;
}

export async function updateNote(
  id: string,
  updates: Partial<Omit<Note, "id" | "created_at">>,
): Promise<Note> {
  const notes = readNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) throw new Error("Note not found");
  notes[idx] = {
    ...notes[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  writeNotes(notes);
  return notes[idx];
}

export async function deleteNote(id: string): Promise<void> {
  const notes = readNotes();
  writeNotes(notes.filter((n) => n.id !== id));
}
