export type { Note } from "@/lib/notesModel";
export { NOTE_COLORS } from "@/lib/notesModel";

export {
  saveNoteOrder,
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
} from "@/lib/data/notesRepo";
