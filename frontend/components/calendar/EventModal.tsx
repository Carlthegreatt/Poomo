"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_COLORS } from "@/lib/calendar";
import { useCalendar, type CalendarEntry } from "@/stores/calendarStore";

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  event?: CalendarEntry | null;
  defaultStart?: Date;
  defaultEnd?: Date;
  defaultColor?: string | null;
}

function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function EventModal({
  open,
  onClose,
  event,
  defaultStart,
  defaultEnd,
  defaultColor,
}: EventModalProps) {
  const { addEvent, editEvent, removeEvent } = useCalendar();

  const isEditing = !!event;
  const isKanban = event?.source === "kanban";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setAllDay(event.allDay);
      setColor(event.color);
      if (event.allDay) {
        setStart(toDateLocal(event.start));
        setEnd(toDateLocal(event.end));
      } else {
        setStart(toDateTimeLocal(event.start));
        setEnd(toDateTimeLocal(event.end));
      }
    } else {
      setTitle("");
      setDescription("");
      setColor(defaultColor ?? null);

      if (defaultStart && defaultEnd) {
        const sameDay =
          defaultStart.toDateString() === defaultEnd.toDateString() &&
          defaultStart.getHours() === 0 &&
          defaultEnd.getHours() === 0;

        if (sameDay) {
          setAllDay(true);
          setStart(toDateLocal(defaultStart));
          setEnd(toDateLocal(defaultEnd));
        } else {
          setAllDay(false);
          setStart(toDateTimeLocal(defaultStart));
          setEnd(toDateTimeLocal(defaultEnd));
        }
      } else {
        const now = new Date();
        setAllDay(false);
        setStart(toDateTimeLocal(now));
        const later = new Date(now.getTime() + 60 * 60 * 1000);
        setEnd(toDateTimeLocal(later));
      }
    }
  }, [open, event, defaultStart, defaultEnd, defaultColor]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;

    const startDate = new Date(start).toISOString();
    const endDate = new Date(end).toISOString();

    if (isEditing && !isKanban) {
      await editEvent(event!.id, {
        title: title.trim(),
        description: description.trim() || null,
        start: startDate,
        end: endDate,
        all_day: allDay,
        color,
      });
    } else {
      await addEvent({
        title: title.trim(),
        description: description.trim() || null,
        start: startDate,
        end: endDate,
        all_day: allDay,
        color,
      });
    }

    onClose();
  }, [
    title,
    description,
    start,
    end,
    allDay,
    color,
    isEditing,
    isKanban,
    event,
    editEvent,
    addEvent,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!event || isKanban) return;
    await removeEvent(event.id);
    onClose();
  }, [event, isKanban, removeEvent, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md border-2 border-border bg-white rounded-3xl p-6 shadow-[6px_6px_0_black] space-y-4"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {isKanban
                  ? "Board Task"
                  : isEditing
                    ? "Edit Event"
                    : "New Event"}
              </h2>
              <button
                onClick={onClose}
                className="size-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {isKanban && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-xl px-3 py-2">
                <LayoutDashboard className="size-4" />
                <span>This task is from the Kanban board</span>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                disabled={isKanban}
                autoFocus={!isKanban}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") onClose();
                }}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full min-h-[4rem] rounded-lg border-2 border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details..."
                disabled={isKanban}
              />
            </div>

            {/* All-day toggle */}
            {!isKanban && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => {
                    setAllDay(e.target.checked);
                    if (e.target.checked && start) {
                      setStart(toDateLocal(new Date(start)));
                      setEnd(toDateLocal(new Date(end || start)));
                    } else if (!e.target.checked && start) {
                      const s = new Date(start);
                      s.setHours(9, 0, 0, 0);
                      setStart(toDateTimeLocal(s));
                      const en = new Date(end || start);
                      en.setHours(10, 0, 0, 0);
                      setEnd(toDateTimeLocal(en));
                    }
                  }}
                  className="size-4 rounded border-2 border-border accent-primary"
                />
                <span className="text-sm font-medium">All day</span>
              </label>
            )}

            {/* Date/Time inputs */}
            {!isKanban && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Start</label>
                  <Input
                    type={allDay ? "date" : "datetime-local"}
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">End</label>
                  <Input
                    type={allDay ? "date" : "datetime-local"}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Color picker */}
            {!isKanban && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(color === c ? null : c)}
                      className={`size-7 rounded-full border-2 transition-all cursor-pointer ${
                        color === c
                          ? "border-border scale-110 shadow-[2px_2px_0_black]"
                          : "border-transparent hover:border-border/40"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {isEditing && !isKanban && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={onClose}>
                {isKanban ? "Close" : "Cancel"}
              </Button>
              {!isKanban && (
                <Button
                  variant="filled"
                  size="sm"
                  onClick={handleSave}
                  disabled={!title.trim()}
                >
                  {isEditing ? "Save" : "Create"}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
