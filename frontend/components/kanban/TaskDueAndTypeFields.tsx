"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useKanban } from "@/stores/kanbanStore";
import { KanbanFlyoutSelect } from "./KanbanFlyoutMenu";

type Props = {
  dueDate: string;
  setDueDate: (v: string) => void;
  dueTime: string;
  setDueTime: (v: string) => void;
  taskType: string;
  setTaskType: (v: string) => void;
};

export default function TaskDueAndTypeFields({
  dueDate,
  setDueDate,
  dueTime,
  setDueTime,
  taskType,
  setTaskType,
}: Props) {
  const taskTypes = useKanban((s) => s.taskTypes);
  const registerTaskType = useKanban((s) => s.registerTaskType);
  const [newTypeDraft, setNewTypeDraft] = useState("");

  const typeOptions = useMemo(() => {
    const trimmed = taskType.trim();
    const base = taskTypes.map((t) => ({ value: t, label: t }));
    if (trimmed && !taskTypes.includes(trimmed)) {
      return [{ value: trimmed, label: trimmed }, ...base];
    }
    return base;
  }, [taskTypes, taskType]);

  const addNewType = async () => {
    const t = newTypeDraft.trim();
    if (!t) return;
    await registerTaskType(t);
    setTaskType(t);
    setNewTypeDraft("");
  };

  return (
    <>
      <div>
        <div className="text-xs font-medium mb-1.5">Due date</div>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
      <div>
        <div className="text-xs font-medium mb-1.5">Due time</div>
        <Input
          type="time"
          value={dueTime}
          onChange={(e) => setDueTime(e.target.value)}
          disabled={!dueDate}
          className={!dueDate ? "opacity-50" : ""}
        />
        {!dueDate ? (
          <p className="text-[0.65rem] text-muted-foreground mt-1">
            Pick a date to set a time
          </p>
        ) : null}
      </div>
      <KanbanFlyoutSelect
        label="Task type"
        value={taskType}
        onChange={setTaskType}
        options={typeOptions}
        footer={
          <div className="p-2">
            <p className="text-[0.625rem] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1.5">
              Add new type
            </p>
            <div className="flex gap-1.5">
              <Input
                placeholder="e.g. Research…"
                value={newTypeDraft}
                onChange={(e) => setNewTypeDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addNewType();
                  }
                }}
                className="flex-1 text-sm h-9"
                onPointerDown={(e) => e.stopPropagation()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 h-9 px-2.5 border-2"
                onClick={() => void addNewType()}
                disabled={!newTypeDraft.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        }
      />
    </>
  );
}
