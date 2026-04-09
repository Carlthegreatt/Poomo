"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useKanban } from "@/stores/kanbanStore";

interface ColumnHeaderProps {
  columnId: string;
  title: string;
}

export default function ColumnHeader({ columnId, title }: ColumnHeaderProps) {
  const renameColumn = useKanban((s) => s.renameColumn);
  const removeColumn = useKanban((s) => s.removeColumn);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title) {
      renameColumn(columnId, trimmed);
    } else {
      setEditValue(title);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          className="flex-1 min-w-0 border-2 border-border rounded-lg px-2 py-1 text-sm font-semibold bg-transparent outline-none focus:border-primary"
        />
        <Button variant="ghost" size="icon" className="size-7" onClick={handleSave}>
          <Check className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-7" onClick={handleCancel}>
          <X className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold truncate">{title}</h3>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setIsEditing(true)}
          title="Rename column"
        >
          <Pencil className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => removeColumn(columnId)}
          title="Delete column"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}
