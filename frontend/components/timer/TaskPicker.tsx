"use client";

import { useEffect, useState } from "react";
import { Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchBoard, type KanbanTask } from "@/lib/kanban";
import { useTimer } from "@/stores/timerStore";

type TaskPickerProps = {
  /** Full width of parent (e.g. same max-width column as the timer card) */
  embedInCard?: boolean;
};

export default function TaskPicker({ embedInCard = false }: TaskPickerProps) {
  const activeTaskId = useTimer((s) => s.activeTaskId);
  const activeTaskTitle = useTimer((s) => s.activeTaskTitle);
  const setActiveTask = useTimer((s) => s.setActiveTask);
  const isRunning = useTimer((s) => s.isRunning);

  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchBoard().then(({ tasks: t }) => setTasks(t));
  }, []);

  const rowClass = cn(
    "flex items-center gap-1.5 border-2 border-border rounded-full px-3 py-1 bg-white shadow-[2px_2px_0_black] text-sm font-medium box-border",
    embedInCard ? "w-full max-w-none justify-between min-w-0" : "max-w-[16rem]",
  );

  if (activeTaskId) {
    return (
      <div className={rowClass}>
        <Target className="size-3.5 shrink-0 text-primary" />
        <span className="truncate">{activeTaskTitle}</span>
        {!isRunning && (
          <button
            type="button"
            onClick={() => setActiveTask(null, null)}
            className="size-4 flex items-center justify-center rounded-full hover:bg-muted transition-colors cursor-pointer shrink-0"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    );
  }

  if (open) {
    return (
      <div className={cn("relative z-20", embedInCard && "w-full min-w-0")}>
        <div
          className={cn(
            "border-2 border-border rounded-xl bg-white shadow-[3px_3px_0_black] p-1.5 max-h-48 overflow-y-auto box-border",
            embedInCard ? "w-full max-w-none" : "max-w-[16rem]",
          )}
        >
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 py-1">
              No tasks on board
            </p>
          ) : (
            tasks.map((task) => (
              <button
                type="button"
                key={task.id}
                onClick={() => {
                  setActiveTask(task.id, task.title);
                  setOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
              >
                {task.color && (
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: task.color }}
                  />
                )}
                <span className="truncate">{task.title}</span>
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors cursor-pointer mt-0.5"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        "flex items-center gap-1.5 border-2 border-dashed border-border/50 rounded-full px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer box-border",
        embedInCard && "w-full min-w-0 max-w-none justify-center",
      )}
    >
      <Target className="size-3.5" />
      <span>Link task</span>
    </button>
  );
}
