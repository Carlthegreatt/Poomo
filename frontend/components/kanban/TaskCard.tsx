"use client";

import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Calendar, Pencil, Check } from "lucide-react";
import { useKanban } from "@/stores/kanbanStore";
import {
  TASK_COLORS,
  TASK_PRIORITY_OPTIONS,
  type KanbanTask,
  type KanbanTaskPriority,
} from "@/lib/models/kanban";
import { Input } from "@/components/ui/input";
import TaskDueAndTypeFields from "./TaskDueAndTypeFields";
import { KanbanFlyoutSelect } from "./KanbanFlyoutMenu";

function priorityBadgeClass(p: KanbanTask["priority"]): string {
  if (p === "high")
    return "bg-destructive/15 text-destructive border-destructive/30";
  if (p === "low")
    return "bg-muted text-muted-foreground border-border/50";
  if (p === "medium")
    return "bg-primary/10 text-primary border-primary/25";
  return "";
}

function formatDueDisplay(task: KanbanTask): string | null {
  if (!task.due_date) return null;
  const d = new Date(task.due_date + "T00:00:00");
  const ds = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  if (task.due_time) return `${ds} · ${task.due_time}`;
  return ds;
}

interface TaskCardProps {
  task: KanbanTask;
  isOverlay?: boolean;
}

export default function TaskCard({ task, isOverlay }: TaskCardProps) {
  const removeTask = useKanban((s) => s.removeTask);
  const editTask = useKanban((s) => s.editTask);

  const [editOpen, setEditOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [color, setColor] = useState<string | undefined>(task.color ?? undefined);
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [dueTime, setDueTime] = useState(task.due_time ?? "");
  const [priority, setPriority] = useState<string>(task.priority ?? "");
  const [taskType, setTaskType] = useState(task.task_type ?? "");

  useEffect(() => {
    if (!dueDate) setDueTime("");
  }, [dueDate]);

  useEffect(() => {
    if (!editOpen) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setColor(task.color ?? undefined);
      setDueDate(task.due_date ?? "");
      setDueTime(task.due_time ?? "");
      setPriority(task.priority ?? "");
      setTaskType(task.task_type ?? "");
    }
  }, [task, editOpen]);

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

  const dueLine = formatDueDisplay(task);
  const showMeta = task.priority || task.task_type;

  const handleSaveEdit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    editTask(task.id, {
      title: trimmed,
      description: description.trim() || null,
      color: color ?? null,
      due_date: dueDate || null,
      due_time: dueDate && dueTime ? dueTime : null,
      priority: (priority || null) as KanbanTaskPriority | null,
      task_type: taskType.trim() || null,
    });
    setEditOpen(false);
  };

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
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Popover open={editOpen} onOpenChange={setEditOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  title="Edit task"
                >
                  <Pencil className="size-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-72"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  <Input
                    placeholder="Task title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                    }}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[60px] border-2 border-input rounded-lg bg-transparent px-3 py-2 text-sm outline-none focus:border-ring placeholder:text-muted-foreground resize-none"
                  />
                  <div>
                    <div className="text-xs font-medium mb-1.5">Color</div>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        className={`size-6 rounded-full border-2 ${
                          !color ? "border-primary" : "border-transparent"
                        } bg-muted`}
                        onClick={() => setColor(undefined)}
                        title="No color"
                      />
                      {TASK_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`size-6 rounded-full border-2 ${
                            color === c ? "border-foreground" : "border-transparent"
                          } transition-colors`}
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(c)}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  <TaskDueAndTypeFields
                    dueDate={dueDate}
                    setDueDate={setDueDate}
                    dueTime={dueTime}
                    setDueTime={setDueTime}
                    taskType={taskType}
                    setTaskType={setTaskType}
                  />

                  <KanbanFlyoutSelect
                    label="Priority"
                    value={priority}
                    onChange={setPriority}
                    options={TASK_PRIORITY_OPTIONS.map((o) => ({
                      value: o.value,
                      label: o.label,
                    }))}
                  />
                  <Button
                    variant="filled"
                    className="w-full"
                    onClick={handleSaveEdit}
                    disabled={!title.trim()}
                  >
                    <Check className="size-4" />
                    Save
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation();
                removeTask(task.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Delete task"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
          </p>
        )}

        {showMeta && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.priority && (
              <span
                className={`text-[0.625rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${priorityBadgeClass(task.priority)}`}
              >
                {task.priority}
              </span>
            )}
            {task.task_type && (
              <span className="text-[0.625rem] font-semibold text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-md border border-border/40 max-w-full truncate">
                {task.task_type}
              </span>
            )}
          </div>
        )}

        {dueLine && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Calendar className="size-3 shrink-0" />
            <span>{dueLine}</span>
          </div>
        )}
      </div>
    </div>
  );
}
