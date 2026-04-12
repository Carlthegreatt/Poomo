import { create } from "zustand";
import { toast } from "sonner";
import {
  fetchNotes,
  createNote as apiCreateNote,
  updateNote as apiUpdateNote,
  deleteNote as apiDeleteNote,
  saveNoteOrder,
  type Note,
} from "@/lib/notes";

/** Coalesces concurrent `loadNotes` (e.g. bootstrap + chat `buildContext`). */
let notesLoadInFlight: Promise<void> | null = null;

/** Clears notes and sync flags so the next session refetches from the API. */
export function resetNotesSessionData(): void {
  notesLoadInFlight = null;
  useNotes.setState({
    notes: [],
    activeNoteId: null,
    isLoading: false,
    notesSyncedOnce: false,
  });
}

interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  isLoading: boolean;
  /** True after the first `loadNotes` attempt finishes (success or error). */
  notesSyncedOnce: boolean;

  loadNotes: () => Promise<void>;
  addNote: () => Promise<void>;
  editNote: (
    id: string,
    updates: Partial<Omit<Note, "id" | "created_at">>,
  ) => Promise<void>;
  removeNote: (id: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;
  togglePin: (id: string) => Promise<void>;
  reorderNotes: (activeId: string, overId: string) => void;
}

export const useNotes = create<NotesState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  isLoading: false,
  notesSyncedOnce: false,

  loadNotes: async () => {
    if (notesLoadInFlight) return notesLoadInFlight;

    const run = (async () => {
      set({ isLoading: true });
      try {
        const notes = await fetchNotes();
        set({ notes, isLoading: false, notesSyncedOnce: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load notes";
        set({ isLoading: false, notesSyncedOnce: true });
        toast.error(msg);
      }
    })();

    notesLoadInFlight = run;
    try {
      await run;
    } finally {
      if (notesLoadInFlight === run) notesLoadInFlight = null;
    }
  },

  addNote: async () => {
    try {
      const note = await apiCreateNote({
        title: "Untitled",
        content: "",
        color: null,
        pinned: false,
      });
      set((s) => ({
        notes: [...s.notes, note],
        activeNoteId: note.id,
      }));
    } catch {
      toast.error("Failed to create note");
    }
  },

  editNote: async (id, updates) => {
    const prev = get().notes.find((n) => n.id === id);
    if (!prev) return;

    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id
          ? { ...n, ...updates, updated_at: new Date().toISOString() }
          : n,
      ),
    }));

    try {
      await apiUpdateNote(id, updates);
    } catch {
      set((s) => ({
        notes: s.notes.map((n) => (n.id === id ? prev : n)),
      }));
      toast.error("Failed to update note");
    }
  },

  removeNote: async (id) => {
    const prev = get().notes;

    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
    }));

    try {
      await apiDeleteNote(id);
      toast.success("Note deleted");
    } catch {
      set({ notes: prev });
      toast.error("Failed to delete note");
    }
  },

  setActiveNote: (id) => set({ activeNoteId: id }),

  togglePin: async (id) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    await get().editNote(id, { pinned: !note.pinned });
    // Re-sort after toggling pin
    const sorted = [...get().notes].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
    set({ notes: sorted });
  },

  reorderNotes: (activeId, overId) => {
    const notes = [...get().notes];
    const oldIndex = notes.findIndex((n) => n.id === activeId);
    const newIndex = notes.findIndex((n) => n.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const [moved] = notes.splice(oldIndex, 1);
    notes.splice(newIndex, 0, moved);
    set({ notes });
    saveNoteOrder(notes);
  },
}));
