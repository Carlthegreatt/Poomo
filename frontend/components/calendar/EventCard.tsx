"use client";

import type { EventProps } from "react-big-calendar";
import { LayoutDashboard } from "lucide-react";
import type { CalendarEntry } from "./useCalendar";

export default function EventCard({ event }: EventProps<CalendarEntry>) {
  const color = event.color ?? "var(--primary)";

  return (
    <div className="flex items-center gap-1 overflow-hidden h-full">
      <div
        className="w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate text-[0.8125rem] leading-tight font-medium">
        {event.title}
      </span>
      {event.source === "kanban" && (
        <LayoutDashboard className="size-3 shrink-0 opacity-60" />
      )}
    </div>
  );
}

export function eventStyleGetter(event: CalendarEntry) {
  const color = event.color ?? "var(--primary)";
  const isKanban = event.source === "kanban";

  return {
    style: {
      backgroundColor: `color-mix(in srgb, ${color} 18%, white)`,
      color: "var(--foreground)",
      borderLeft: `3px solid ${color}`,
      opacity: isKanban ? 0.85 : 1,
    },
  };
}
