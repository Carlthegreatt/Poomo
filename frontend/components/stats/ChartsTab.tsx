"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Target } from "lucide-react";
import { useStats } from "@/stores/statsStore";

const RING_SIZE = 72;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CELL_SIZE = 13;
const CELL_GAP = 3;
const HEATMAP_WEEKS = 26;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const LABEL_WIDTH = 30;
const MONTH_LABEL_HEIGHT = 14;
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function ChartsTab() {
  const { sessions, dailyGoal, setDailyGoal, getTodayCount, getHeatmapData } =
    useStats();

  const todayCount = useMemo(() => getTodayCount(), [sessions, getTodayCount]);

  const heatmap = useMemo(
    () => getHeatmapData(HEATMAP_WEEKS),
    [sessions, getHeatmapData],
  );

  const maxMinutes = Math.max(...heatmap.map((d) => d.focusMinutes), 1);

  function getOpacity(minutes: number): number {
    if (minutes === 0) return 0;
    return 0.2 + (minutes / maxMinutes) * 0.8;
  }

  const gridWidth = LABEL_WIDTH + HEATMAP_WEEKS * (CELL_SIZE + CELL_GAP);
  const gridHeight = 7 * (CELL_SIZE + CELL_GAP);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabels = useMemo(() => {
    const labels: { week: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < HEATMAP_WEEKS; w++) {
      const dayIndex = w * 7;
      if (dayIndex >= heatmap.length) break;
      const month = heatmap[dayIndex].date.getMonth();
      if (month !== lastMonth) {
        labels.push({ week: w, label: MONTH_NAMES[month] });
        lastMonth = month;
      }
    }
    return labels;
  }, [heatmap]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
      className="border-2 border-border bg-white rounded-2xl shadow-[3px_3px_0_black] overflow-hidden"
    >
      <div className="h-1.5 bg-[#00995E]" />
      <div className="p-4 flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col min-w-0">
        <h3 className="text-sm font-bold mb-3">Activity</h3>
        <div className="overflow-x-auto">
          <svg
            width={gridWidth}
            height={MONTH_LABEL_HEIGHT + gridHeight + 2}
            className="block"
          >
            {monthLabels.map(({ week, label }) => (
              <text
                key={`month-${week}`}
                x={LABEL_WIDTH + week * (CELL_SIZE + CELL_GAP)}
                y={MONTH_LABEL_HEIGHT - 4}
                textAnchor="start"
                className="fill-muted-foreground"
                fontSize={9}
                fontWeight={600}
              >
                {label}
              </text>
            ))}

            {DAY_LABELS.map((label, row) =>
              label ? (
                <text
                  key={row}
                  x={LABEL_WIDTH - 5}
                  y={
                    MONTH_LABEL_HEIGHT +
                    row * (CELL_SIZE + CELL_GAP) +
                    CELL_SIZE -
                    2
                  }
                  textAnchor="end"
                  className="fill-muted-foreground"
                  fontSize={8}
                  fontWeight={600}
                >
                  {label}
                </text>
              ) : null,
            )}

            {heatmap.map((day, i) => {
              const week = Math.floor(i / 7);
              const dow = i % 7;
              const x = LABEL_WIDTH + week * (CELL_SIZE + CELL_GAP);
              const y = MONTH_LABEL_HEIGHT + dow * (CELL_SIZE + CELL_GAP);
              const isFuture = day.date > today;

              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={3}
                  fill={
                    isFuture
                      ? "transparent"
                      : day.focusMinutes === 0
                        ? "var(--muted)"
                        : "var(--primary)"
                  }
                  fillOpacity={
                    isFuture
                      ? 0
                      : day.focusMinutes === 0
                        ? 1
                        : getOpacity(day.focusMinutes)
                  }
                  stroke={isFuture ? "none" : "var(--border)"}
                  strokeWidth={isFuture ? 0 : 0.5}
                  strokeOpacity={0.2}
                >
                  <title>
                    {day.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    : {Math.round(day.focusMinutes)}m
                  </title>
                </rect>
              );
            })}
          </svg>
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-[0.625rem] text-muted-foreground">
          <span>Less</span>
          {[0, 0.2, 0.4, 0.65, 1].map((op, i) => (
            <span
              key={i}
              className="size-3 rounded-[3px] border border-border/20"
              style={{
                backgroundColor: op === 0 ? "var(--muted)" : "var(--primary)",
                opacity: op === 0 ? 1 : 0.2 + op * 0.8,
              }}
            />
          ))}
          <span>More</span>
        </div>
        </div>

        {/* Daily Goal */}
        <div className="lg:border-l lg:border-border/20 lg:pl-6 flex flex-col items-center justify-center gap-2 shrink-0 lg:w-40">
          <p className="text-xs font-bold text-muted-foreground">Daily Goal</p>
          <div className="relative">
            <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth={STROKE_WIDTH} />
              <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} fill="none" stroke="#058CD7" strokeWidth={STROKE_WIDTH} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(todayCount / Math.max(dailyGoal, 1), 1))} strokeLinecap="round" className="transition-all duration-500" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base font-bold">{todayCount}/{dailyGoal}</span>
            </div>
          </div>
          <p className="text-xs font-semibold">
            {todayCount >= dailyGoal ? (
              <span className="text-success">Completed!</span>
            ) : (
              `${dailyGoal - todayCount} to go`
            )}
          </p>
          <div className="flex items-center gap-1">
            <Target className="size-3 text-muted-foreground" />
            <select value={dailyGoal} onChange={(e) => setDailyGoal(Number(e.target.value))} className="text-[0.6875rem] bg-transparent text-muted-foreground cursor-pointer outline-none">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}/day</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
