"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Check } from "lucide-react";
import { useKanban } from "@/stores/kanbanStore";
import { TASK_COLORS, TASK_PRIORITY_OPTIONS } from "@/lib/models/kanban";
import type { KanbanTaskPriority } from "@/lib/models/kanban";
import TaskDueAndTypeFields from "./TaskDueAndTypeFields";
import { KanbanFlyoutSelect } from "./KanbanFlyoutMenu";

interface TaskFormProps {
  columnId: string;
}

export default function TaskForm({ columnId }: TaskFormProps) {
  const addTask = useKanban((s) => s.addTask);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<string>("");
  const [taskType, setTaskType] = useState("");

  useEffect(() => {
    if (!dueDate) setDueTime("");
  }, [dueDate]);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    addTask(columnId, {
      title: trimmed,
      description: description.trim() || undefined,
      color,
      due_date: dueDate || undefined,
      due_time: dueDate && dueTime ? dueTime : undefined,
      priority: (priority || null) as KanbanTaskPriority | null,
      task_type: taskType.trim() || null,
    });

    setTitle("");
    setDescription("");
    setColor(undefined);
    setDueDate("");
    setDueTime("");
    setPriority("");
    setTaskType("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start text-xs text-muted-foreground gap-1.5 h-8"
        >
          <Plus className="size-3.5" />
          Add task
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="space-y-3">
          <Input
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            autoFocus
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[60px] border-2 border-input rounded-lg bg-transparent px-3 py-2 text-sm outline-none focus:border-ring placeholder:text-muted-foreground resize-none"
          />

          <div>
            <div className="text-xs font-medium mb-1.5">Color</div>
            <div className="flex gap-1.5">
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
            onClick={handleSubmit}
            disabled={!title.trim()}
          >
            <Check className="size-4" />
            Add Task
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
