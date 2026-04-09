"use client";

import { useRouter } from "next/navigation";
import { Timer, ArrowRight } from "lucide-react";
import { useTimer } from "@/stores/timerStore";

const PHASE_LABELS: Record<string, string> = {
  IDLE: "Idle",
  WORK: "Focus",
  BREAK_SHORT: "Short Break",
  BREAK_LONG: "Long Break",
};

function formatMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TimerWidget() {
  const router = useRouter();
  const { phase, isRunning, remainingMs } = useTimer();
  const label = PHASE_LABELS[phase] ?? phase;

  return (
    <button
      onClick={() => router.push("/timer")}
      className="mt-2 w-full flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-[2px_2px_0_black] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-[2px_3px_0_black] text-left"
    >
      <div className="size-8 rounded-lg bg-primary/10 border border-border flex items-center justify-center shrink-0">
        <Timer className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {phase === "IDLE"
            ? "Ready to start"
            : `${formatMs(remainingMs)} ${isRunning ? "remaining" : "paused"}`}
        </p>
      </div>
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        Open <ArrowRight className="size-3" />
      </span>
    </button>
  );
}
