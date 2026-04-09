"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, ArrowRight } from "lucide-react";
import { useCalendar } from "@/stores/calendarStore";

export function CalendarWidget() {
  const router = useRouter();
  const { events } = useCalendar();

  const now = new Date().toISOString();
  const upcoming = events
    .filter((e) => e.end >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);

  const summary =
    upcoming.length === 0
      ? "No upcoming events"
      : upcoming
          .map((e) => {
            const start = new Date(e.start);
            const time = e.all_day
              ? "all day"
              : start.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });
            return `${e.title} (${time})`;
          })
          .join(" · ");

  return (
    <button
      onClick={() => router.push("/calendar")}
      className="mt-2 w-full flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-[2px_2px_0_black] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-[2px_3px_0_black] text-left"
    >
      <div className="size-8 rounded-lg bg-primary/10 border border-border flex items-center justify-center shrink-0">
        <CalendarDays className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Calendar</p>
        <p className="text-xs text-muted-foreground truncate">{summary}</p>
      </div>
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        Open <ArrowRight className="size-3" />
      </span>
    </button>
  );
}
