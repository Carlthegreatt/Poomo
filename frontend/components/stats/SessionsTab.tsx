"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStats } from "./useStats";

const PHASE_LABELS: Record<string, string> = {
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

const PHASE_COLORS: Record<string, string> = {
  focus: "var(--phase-focus)",
  shortBreak: "var(--phase-short)",
  longBreak: "var(--phase-long)",
};

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SessionsTab() {
  const { sessions } = useStats();

  const filtered = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return sessions.filter((s) => new Date(s.endedAt) >= cutoff);
  }, [sessions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
      className="border-2 border-border bg-white rounded-2xl shadow-[3px_3px_0_black] overflow-hidden flex flex-col"
    >
      <div className="h-1.5 bg-[#058CD7]" />
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border/20">
        <h3 className="text-sm font-bold">Session Log</h3>
        <span className="text-[0.625rem] text-muted-foreground">
          {filtered.length} rows
        </span>
      </div>

      <div className="flex-1 max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0">
            <tr className="bg-foreground text-card">
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">
                Date
              </th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">
                Time
              </th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">
                Phase
              </th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">
                Duration
              </th>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">
                Task
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-10 text-center text-muted-foreground text-xs"
                  >
                    Complete a pomodoro to see your sessions here
                  </td>
                </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-border/10 hover:bg-muted/20 transition-colors"
                >
                  <td className="px-3 py-1.5 font-medium whitespace-nowrap">
                    {formatDate(s.endedAt)}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                    {formatTime(s.startedAt)} – {formatTime(s.endedAt)}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="size-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            PHASE_COLORS[s.phase] ?? "var(--primary)",
                        }}
                      />
                      {PHASE_LABELS[s.phase] ?? s.phase}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">
                    {formatDuration(s.durationMs)}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[8rem]">
                    {s.taskTitle ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
