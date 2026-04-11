"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKanban } from "@/stores/kanbanStore";
import { useTimer } from "@/stores/timerStore";
import {
  KanbanFlyoutTrigger,
  KanbanFlyoutPanel,
  useKanbanFlyoutDismiss,
  useFlyoutListMaxStyle,
  KANBAN_FLYOUT_SCROLL_CLASS,
  KANBAN_FLYOUT_ROW_CLASS,
} from "@/components/kanban/KanbanFlyoutMenu";

type TaskPickerProps = {
  /** Full width of parent (e.g. same max-width column as the timer card) */
  embedInCard?: boolean;
};

export default function TaskPicker({ embedInCard = false }: TaskPickerProps) {
  const activeTaskId = useTimer((s) => s.activeTaskId);
  const activeTaskTitle = useTimer((s) => s.activeTaskTitle);
  const setActiveTask = useTimer((s) => s.setActiveTask);
  const isRunning = useTimer((s) => s.isRunning);

  const tasks = useKanban((s) => s.tasks);
  const loadBoard = useKanban((s) => s.loadBoard);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useKanbanFlyoutDismiss(open, setOpen, containerRef);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (open) void loadBoard();
  }, [open, loadBoard]);

  const pickTask = (id: string, title: string) => {
    setActiveTask(id, title);
    setOpen(false);
  };

  const optionRowCount = useMemo(() => {
    const extra = activeTaskId && !isRunning ? 1 : 0;
    if (tasks.length === 0) return extra + 1;
    return tasks.length + extra;
  }, [tasks.length, activeTaskId, isRunning]);

  const listMaxStyle = useFlyoutListMaxStyle(open, containerRef, 44, optionRowCount);

  return (
    <div
      ref={containerRef}
      className={cn("relative z-20", embedInCard && "w-full min-w-0")}
    >
      <KanbanFlyoutTrigger
        open={open}
        onToggle={() => setOpen((v) => !v)}
        className={cn(!activeTaskId && "text-muted-foreground")}
      >
        <Target
          className={cn(
            "size-3.5 shrink-0",
            activeTaskId ? "text-primary" : "text-muted-foreground",
          )}
        />
        <span className="truncate flex-1 min-w-0 text-foreground">
          {activeTaskId ? activeTaskTitle : "Link task"}
        </span>
        {activeTaskId && !isRunning ? (
          <button
            type="button"
            className="size-6 shrink-0 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer -mr-1"
            title="Unlink task"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTask(null, null);
            }}
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </KanbanFlyoutTrigger>

      <KanbanFlyoutPanel open={open}>
               <div className={KANBAN_FLYOUT_SCROLL_CLASS} style={listMaxStyle}>
          {activeTaskId && !isRunning ? (
            <button
              type="button"
              onClick={() => {
                setActiveTask(null, null);
                setOpen(false);
              }}
              className={cn(KANBAN_FLYOUT_ROW_CLASS, "text-muted-foreground")}
            >
              No link
            </button>
          ) : null}
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground px-3 py-2">
              No tasks on board
            </p>
          ) : (
            tasks.map((task) => (
              <button
                type="button"
                key={task.id}
                onClick={() => pickTask(task.id, task.title)}
                className={cn(
                  KANBAN_FLYOUT_ROW_CLASS,
                  activeTaskId === task.id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground",
                )}
              >
                {task.color ? (
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: task.color }}
                  />
                ) : (
                  <span className="size-2.5 rounded-full shrink-0 bg-muted" />
                )}
                <span className="truncate">{task.title}</span>
              </button>
            ))
          )}
        </div>
      </KanbanFlyoutPanel>
    </div>
  );
}
