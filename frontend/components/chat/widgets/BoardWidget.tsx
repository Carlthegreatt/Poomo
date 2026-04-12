"use client";

import { useRouter } from "next/navigation";
import { LayoutList, ArrowRight } from "lucide-react";
import { useKanban } from "@/stores/kanbanStore";

export function BoardWidget() {
  const router = useRouter();
  const { columns, tasks } = useKanban();

  const summary =
    tasks.length === 0
      ? "No tasks yet"
      : columns
          .map((col) => {
            const count = tasks.filter((t) => t.column_id === col.id).length;
            return count > 0 ? `${col.title}: ${count}` : null;
          })
          .filter(Boolean)
          .join(" · ");

  return (
    <button
      onClick={() => router.push("/board")}
      className="mt-2 w-full flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-[2px_2px_0_black] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-[2px_3px_0_black] text-left"
    >
      <div className="size-8 rounded-lg bg-primary/10 border border-border flex items-center justify-center shrink-0">
        <LayoutList className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Board</p>
        <p className="text-xs text-muted-foreground truncate">{summary}</p>
      </div>
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        Open <ArrowRight className="size-3" />
      </span>
    </button>
  );
}
