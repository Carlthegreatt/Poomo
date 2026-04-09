"use client";

import { useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { useKanban } from "@/stores/kanbanStore";
import Column from "./Column";
import TaskCard from "./TaskCard";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { KanbanTask } from "@/lib/kanban";

const WIDTHS_KEY = "poomo-kanban-widths";
const DEFAULT_WIDTH = 320;

function loadWidths(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WIDTHS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveWidths(widths: Record<string, number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths));
}

export default function Board() {
  const {
    columns,
    tasks,
    isLoading,
    loadBoard,
    addColumn,
    reorderColumns,
    persistColumnOrder,
    moveTask,
    reorderTaskInColumn,
    persistTaskOrder,
    persistTaskMove,
  } = useKanban();

  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(loadWidths);

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumnWidths((prev) => {
      const next = { ...prev, [columnId]: width };
      saveWidths(next);
      return next;
    });
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const data = active.data.current;

      if (data?.type === "task") {
        const task = tasks.find((t) => t.id === active.id);
        if (task) setActiveTask(task);
      } else if (data?.type === "column") {
        setActiveColumnId(active.id as string);
      }
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData?.type !== "task") return;

      const activeColId = activeData.columnId as string;
      let overColId: string;

      if (overData?.type === "task") {
        overColId = overData.columnId as string;
      } else if (overData?.type === "column") {
        overColId = over.id as string;
      } else {
        return;
      }

      if (activeColId !== overColId) {
        const colTasks = tasks
          .filter((t) => t.column_id === overColId)
          .sort((a, b) => a.position - b.position);

        let newIndex = colTasks.length;
        if (overData?.type === "task") {
          const overIdx = colTasks.findIndex((t) => t.id === over.id);
          if (overIdx !== -1) newIndex = overIdx;
        }

        moveTask(active.id as string, overColId, newIndex);
      }
    },
    [tasks, moveTask]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setActiveColumnId(null);

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData?.type === "column" && overData?.type === "column") {
        if (active.id !== over.id) {
          reorderColumns(active.id as string, over.id as string);
          persistColumnOrder();
        }
        return;
      }

      if (activeData?.type === "task") {
        const activeColId = activeData.columnId as string;
        const task = tasks.find((t) => t.id === active.id);
        if (!task) return;

        if (overData?.type === "task") {
          const overColId = overData.columnId as string;
          if (activeColId === overColId && active.id !== over.id) {
            reorderTaskInColumn(
              activeColId,
              active.id as string,
              over.id as string
            );
            persistTaskOrder(activeColId);
          } else if (activeColId !== overColId) {
            persistTaskMove(active.id as string, overColId);
          }
        } else if (overData?.type === "column") {
          if (task.column_id !== over.id) {
            persistTaskMove(active.id as string, over.id as string);
          }
        }
      }
    },
    [
      tasks,
      reorderColumns,
      persistColumnOrder,
      reorderTaskInColumn,
      persistTaskOrder,
      persistTaskMove,
    ]
  );

  const [newColumnName, setNewColumnName] = useState("");
  const [addColumnOpen, setAddColumnOpen] = useState(false);

  const handleAddColumn = useCallback(() => {
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    addColumn(trimmed);
    setNewColumnName("");
    setAddColumnOpen(false);
  }, [addColumn, newColumnName]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex gap-4 p-4 sm:p-6 overflow-x-auto overflow-y-hidden">
        <SortableContext
          items={columns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((col, i) => (
            <Column
              key={col.id}
              column={col}
              tasks={tasks
                .filter((t) => t.column_id === col.id)
                .sort((a, b) => a.position - b.position)}
              width={columnWidths[col.id] ?? DEFAULT_WIDTH}
              index={i}
              onResize={handleColumnResize}
            />
          ))}
        </SortableContext>

        <div className="flex-shrink-0 self-stretch">
          <button
            className="w-[320px] h-full min-h-[200px] border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-foreground hover:bg-white/50 transition-colors cursor-pointer"
            onClick={() => setAddColumnOpen(true)}
          >
            <Plus className="size-5" />
            <span className="text-sm font-medium">Add Column</span>
          </button>
        </div>

      {addColumnOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setAddColumnOpen(false); setNewColumnName(""); }}
        >
          <div
            className="w-full max-w-sm border-2 border-border bg-white rounded-3xl p-6 shadow-[6px_6px_0_black] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-semibold">New Column</p>
            <Input
              placeholder="Column name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddColumn();
                if (e.key === "Escape") { setAddColumnOpen(false); setNewColumnName(""); }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setAddColumnOpen(false); setNewColumnName(""); }}
              >
                Cancel
              </Button>
              <Button
                variant="filled"
                className="flex-1"
                onClick={handleAddColumn}
                disabled={!newColumnName.trim()}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>

      <DragOverlay>
        {activeTask && (
          <TaskCard task={activeTask} isOverlay />
        )}
        {activeColumnId && (() => {
          const col = columns.find((c) => c.id === activeColumnId);
          if (!col) return null;
          return (
            <div className="w-[320px] h-[200px] border-2 border-border bg-white rounded-3xl shadow-[4px_4px_0_black] opacity-80" />
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
}
