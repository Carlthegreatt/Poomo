"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StickyNote, ArrowRight } from "lucide-react";
import { useNotes } from "@/stores/notesStore";

export function NotesWidget() {
  const router = useRouter();
  const { notes, isLoading, loadNotes } = useNotes();

  useEffect(() => {
    if (notes.length === 0 && !isLoading) void loadNotes();
  }, [notes.length, isLoading, loadNotes]);

  const summary =
    notes.length === 0
      ? isLoading
        ? "Loading…"
        : "No notes yet"
      : `${notes.length} note${notes.length === 1 ? "" : "s"}`;

  return (
    <button
      type="button"
      onClick={() => router.push("/notes")}
      className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-border bg-background p-3 text-left shadow-[2px_2px_0_black] transition-transform hover:translate-y-[-1px] hover:shadow-[2px_3px_0_black]"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-primary/10">
        <StickyNote className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">Notes</p>
        <p className="truncate text-xs text-muted-foreground">{summary}</p>
      </div>
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
        Open <ArrowRight className="size-3" />
      </span>
    </button>
  );
}
