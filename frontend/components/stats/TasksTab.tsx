"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ListChecks } from "lucide-react";
import { useStats } from "@/stores/statsStore";
import { TASK_COLORS } from "@/lib/kanban";

function formatMinutes(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

export default function TasksTab() {
  const { sessions, getTaskBreakdown } = useStats();
  const breakdown = useMemo(
    () => getTaskBreakdown(),
    [sessions, getTaskBreakdown],
  );

  const maxMs = breakdown.length > 0 ? breakdown[0].totalMs : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
      className="border-2 border-border bg-white rounded-2xl shadow-[3px_3px_0_black] overflow-hidden flex flex-col h-full"
    >
      <div className="h-1.5 bg-[#FB7DA8]" />
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-bold mb-3">Task Breakdown</h3>
        {breakdown.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
            <ListChecks className="size-8 opacity-30" />
            <p className="text-xs text-center">
              Link tasks from the timer to<br />see time breakdown here
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {breakdown.map((item, i) => {
              const barWidth = Math.max((item.totalMs / maxMs) * 100, 3);
              const color =
                item.taskId === null
                  ? "var(--muted-foreground)"
                  : TASK_COLORS[i % TASK_COLORS.length];

              return (
                <motion.div
                  key={item.taskId ?? `unlinked-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.2 + i * 0.06 }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="size-2.5 rounded-full shrink-0 border border-border/20"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-medium truncate">
                        {item.taskTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold">
                        {formatMinutes(item.totalMs)}
                      </span>
                      <span className="text-[0.625rem] text-muted-foreground">
                        {item.sessionCount}x
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{
                        duration: 0.5,
                        delay: 0.3 + i * 0.08,
                        ease: "easeOut",
                      }}
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
