"use client";

import { useRouter } from "next/navigation";
import { BarChart3, ArrowRight } from "lucide-react";
import { useStats } from "@/stores/statsStore";

export function StatsWidget() {
  const router = useRouter();
  const todayCount = useStats((s) => s.getTodayCount());
  const todayMinutes = useStats((s) => s.getTodayMinutes());
  const streaks = useStats((s) => s.getStreaks());

  const summary = `${todayCount} session${todayCount !== 1 ? "s" : ""} · ${todayMinutes}min today · ${streaks.current}d streak`;

  return (
    <button
      onClick={() => router.push("/stats")}
      className="mt-2 w-full flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-[2px_2px_0_black] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-[2px_3px_0_black] text-left"
    >
      <div className="size-8 rounded-lg bg-primary/10 border border-border flex items-center justify-center shrink-0">
        <BarChart3 className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Stats</p>
        <p className="text-xs text-muted-foreground truncate">{summary}</p>
      </div>
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        Open <ArrowRight className="size-3" />
      </span>
    </button>
  );
}
