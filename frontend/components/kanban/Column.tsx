"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import TaskCard from "./TaskCard";
import TaskForm from "./TaskForm";
import ColumnHeader from "./ColumnHeader";
import type { KanbanColumn, KanbanTask } from "@/lib/kanban";

const MIN_WIDTH = 240;
const MAX_WIDTH = 600;

interface ColumnProps {
  column: KanbanColumn;
  tasks: KanbanTask[];
  width: number;
  index?: number;
  onResize: (columnId: string, width: number) => void;
}

export default function Column({ column, tasks, width, index = 0, onResize }: ColumnProps) {
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [entranceDone, setEntranceDone] = useState(false);

  useEffect(() => {
    const delayMs = index * 50;
    const durationMs = 300;
    const id = window.setTimeout(
      () => setEntranceDone(true),
      delayMs + durationMs + 30
    );
    return () => clearTimeout(id);
  }, [index]);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column" },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: column.id,
    data: { type: "column" },
  });

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      const handleMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startXRef.current;
        const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
        onResize(column.id, next);
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
    },
    [width, column.id, onResize]
  );

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    opacity: isDragging ? 0.5 : 1,
    width: `${width}px`,
    // Run entrance only once; toggling animation off/on after drag was restarting keyframes (opacity flash / broken drag).
    animation:
      entranceDone || isDragging
        ? "none"
        : `columnEntrance 0.3s ease-out ${index * 0.05}s both`,
  };

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDropRef(node);
      }}
      style={style}
      className="relative flex-shrink-0 flex flex-col border-2 border-border bg-white rounded-3xl shadow-[4px_4px_0_black] max-h-[calc(100vh-8rem)]"
    >
      <div
        className="p-3 pb-2 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <ColumnHeader columnId={column.id} title={column.title} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-1 space-y-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No tasks yet
          </div>
        )}
      </div>

      <div className="p-3 pt-2">
        <TaskForm columnId={column.id} />
      </div>

      <div
        className="absolute right-0 top-4 bottom-4 w-1.5 cursor-col-resize rounded-full opacity-0 hover:opacity-100 hover:bg-border/40 active:opacity-100 active:bg-primary/30 transition-opacity"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}
