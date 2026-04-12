"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  FileText,
  Pin,
  Trash2,
  X,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { useNotes } from "@/stores/notesStore";
import NoteEditor from "./NoteEditor";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/notes";

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getPreview(html: string): string {
  if (!html) return "Empty note";
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.slice(0, 100) || "Empty note";
}

/* ── Tile Content (shared between normal + overlay) ── */

function TileContent({
  note,
  isDragging,
}: {
  note: Note;
  isDragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-2 border-border bg-white rounded-2xl shadow-[3px_3px_0_black] overflow-hidden flex flex-col h-full",
        isDragging && "shadow-[5px_5px_0_black] ring-2 ring-primary/30",
      )}
    >
      <div
        className="h-1.5 shrink-0"
        style={{ backgroundColor: note.color ?? "var(--muted)" }}
      />
      <div className="flex-1 p-3.5 flex flex-col min-h-[120px]">
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <h3 className="text-sm font-bold leading-snug line-clamp-2 min-w-0">
            {note.title || "Untitled"}
          </h3>
          {note.pinned && (
            <Pin className="size-3.5 text-primary shrink-0 fill-primary mt-0.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
          {getPreview(note.content)}
        </p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/15">
          <span className="text-[0.625rem] text-muted-foreground/60">
            {formatDate(note.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Sortable Note Tile ── */

function SortableNoteTile({
  note,
  onClick,
  onPin,
  onDelete,
}: {
  note: Note;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 z-10 size-6 flex items-center justify-center rounded-lg bg-white/80 border border-border/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="size-3 text-muted-foreground" />
      </div>

      {/* Click area */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className="cursor-pointer h-full"
      >
        <TileContent note={note} />
      </div>

      {/* Hover actions */}
      <div className="absolute bottom-4 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          className="size-6 flex items-center justify-center rounded-lg bg-white/90 border border-border/20 hover:bg-muted transition-colors"
          title={note.pinned ? "Unpin" : "Pin"}
        >
          <Pin
            className={cn(
              "size-3",
              note.pinned && "fill-primary text-primary",
            )}
          />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="size-6 flex items-center justify-center rounded-lg bg-white/90 border border-border/20 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}

/* ── Note Editor Modal ── */

function NoteModal({
  note,
  onClose,
  onSaveTitle,
  onSaveContent,
  onChangeColor,
}: {
  note: Note;
  onClose: () => void;
  onSaveTitle: (title: string) => void;
  onSaveContent: (content: string) => void;
  onChangeColor: (color: string | null) => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-3xl max-h-[85vh] border-2 border-border bg-white rounded-3xl shadow-[6px_6px_0_black] flex flex-col overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b-2 border-border shrink-0">
            <h2 className="text-sm font-bold text-muted-foreground">
              Edit Note
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="size-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <NoteEditor
              note={note}
              onSaveTitle={onSaveTitle}
              onSaveContent={onSaveContent}
              onChangeColor={onChangeColor}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Main View ── */

export default function NotesView() {
  const {
    notes,
    isLoading,
    loadNotes,
    addNote,
    editNote,
    removeNote,
    togglePin,
    reorderNotes,
  } = useNotes();

  const [search, setSearch] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [draggingNote, setDraggingNote] = useState<Note | null>(null);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (editingNote) {
      const updated = notes.find((n) => n.id === editingNote.id);
      if (updated) setEditingNote(updated);
      else setEditingNote(null);
    }
  }, [notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search.trim()
    ? notes.filter((n) => {
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          getPreview(n.content).toLowerCase().includes(q)
        );
      })
    : notes;

  const noteIds = useMemo(() => filtered.map((n) => n.id), [filtered]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const note = notes.find((n) => n.id === event.active.id);
      setDraggingNote(note ?? null);
    },
    [notes],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingNote(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      reorderNotes(active.id as string, over.id as string);
    },
    [reorderNotes],
  );

  const handleAddNote = useCallback(async () => {
    await addNote();
    const all = useNotes.getState().notes;
    const latest = all[all.length - 1];
    if (latest) setEditingNote(latest);
  }, [addNote]);

  const handleCloseModal = useCallback(() => {
    setEditingNote(null);
  }, []);

  const handleSaveTitle = useCallback(
    (title: string) => {
      if (editingNote) editNote(editingNote.id, { title });
    },
    [editingNote, editNote],
  );

  const handleSaveContent = useCallback(
    (content: string) => {
      if (editingNote) editNote(editingNote.id, { content });
    },
    [editingNote, editNote],
  );

  const handleChangeColor = useCallback(
    (color: string | null) => {
      if (editingNote) editNote(editingNote.id, { color });
    },
    [editingNote, editNote],
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSearching = search.trim().length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold">Notes</h1>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 border-2 border-border rounded-xl bg-white px-3 py-1.5 shadow-[2px_2px_0_black] flex-1 sm:flex-initial sm:w-56">
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-w-0"
            />
          </div>

          <motion.div whileTap={{ scale: 0.93 }}>
            <Button variant="filled" size="sm" onClick={handleAddNote} className="gap-1.5 shrink-0">
              <Plus className="size-3.5" />
              New Note
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Tiles Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={noteIds} strategy={rectSortingStrategy} disabled={isSearching}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((note) => (
              <SortableNoteTile
                key={note.id}
                note={note}
                onClick={() => setEditingNote(note)}
                onPin={() => togglePin(note.id)}
                onDelete={() => removeNote(note.id)}
              />
            ))}

            {/* New note tile */}
            <motion.div
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAddNote}
              className="border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center gap-2 min-h-[120px] text-muted-foreground hover:text-foreground hover:border-border hover:bg-white/50 transition-colors cursor-pointer"
            >
              <Plus className="size-5" />
              <span className="text-sm font-medium">New Note</span>
            </motion.div>
          </div>
        </SortableContext>

        {/* Drag overlay */}
        <DragOverlay>
          {draggingNote ? (
            <div className="w-full max-w-[280px]">
              <TileContent note={draggingNote} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty state */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
        >
          <FileText className="size-10 opacity-20" />
          <p className="text-sm font-medium">
            {search ? "No notes match your search" : "No notes yet — create one!"}
          </p>
        </motion.div>
      )}

      {/* Editor Modal */}
      {editingNote && (
        <NoteModal
          key={editingNote.id}
          note={editingNote}
          onClose={handleCloseModal}
          onSaveTitle={handleSaveTitle}
          onSaveContent={handleSaveContent}
          onChangeColor={handleChangeColor}
        />
      )}
    </div>
  );
}
