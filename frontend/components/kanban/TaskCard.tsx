"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar } from "lucide-react";
import { useKanban } from "@/stores/kanbanStore";
import type { KanbanTask } from "@/lib/kanban";

interface TaskCardProps {
  task: KanbanTask;
  isOverlay?: boolean;
}

export default function TaskCard({ task, isOverlay }: TaskCardProps) {
  const removeTask = useKanban((s) => s.removeTask);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", columnId: task.column_id },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const formattedDate = task.due_date
    ? new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex border-2 border-border bg-white rounded-xl overflow-hidden cursor-grab active:cursor-grabbing ${
        isDragging
          ? "shadow-[2px_2px_0_black]"
          : "shadow-[2px_2px_0_black] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_black]"
      } ${isOverlay ? "rotate-3 scale-105" : ""}`}
      {...attributes}
      {...listeners}
    >
      {task.color && (
        <div
          className="w-1.5 flex-shrink-0"
          style={{ backgroundColor: task.color }}
        />
      )}

      <div className="flex-1 p-2.5 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium leading-snug break-words min-w-0">
            {task.title}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              removeTask(task.id);
            }}
            title="Delete task"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        {formattedDate && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            <span>{formattedDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
