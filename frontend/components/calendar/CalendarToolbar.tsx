"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import type { View } from "react-big-calendar";

const VIEW_OPTIONS: { key: View; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
];

interface CalendarToolbarProps {
  date: Date;
  view: View;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  onView: (view: View) => void;
}

function getLabel(date: Date, view: View): string {
  if (view === "month") return format(date, "MMMM yyyy");
  if (view === "week") {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
    }
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }
  return format(date, "EEEE, MMMM d, yyyy");
}

export default function CalendarToolbar({
  date,
  view,
  onNavigate,
  onView,
}: CalendarToolbarProps) {
  const label = getLabel(date, view);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {/* Left: nav */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate("TODAY")}
          className="border-2 border-border rounded-xl bg-white px-3.5 py-1.5 text-sm font-semibold shadow-[2px_2px_0_black] hover:bg-secondary hover:text-secondary-foreground active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
        >
          Today
        </button>
        <div className="flex items-center border-2 border-border rounded-xl bg-white shadow-[2px_2px_0_black] overflow-hidden">
          <button
            onClick={() => onNavigate("PREV")}
            className="size-8 flex items-center justify-center hover:bg-muted transition-colors cursor-pointer border-r border-border"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => onNavigate("NEXT")}
            className="size-8 flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Center: label */}
      <h2 className="text-lg font-bold text-foreground order-first sm:order-none">
        {label}
      </h2>

      {/* Right: view switcher */}
      <div className="flex border-2 border-border rounded-full bg-white shadow-[2px_2px_0_black] p-0.5">
        {VIEW_OPTIONS.map(({ key, label: viewLabel }) => (
          <button
            key={key}
            onClick={() => onView(key)}
            className={`px-3 py-1 rounded-full text-sm font-semibold transition-all cursor-pointer ${
              view === key
                ? "bg-primary text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {viewLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
