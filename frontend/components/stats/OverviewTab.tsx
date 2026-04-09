"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, Clock, Sigma, CalendarClock, TrendingUp, Star } from "lucide-react";
import { useStats } from "@/stores/statsStore";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  accent: string;
  index?: number;
}

function StatCard({ icon, label, value, sub, accent, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="border-2 border-border bg-white rounded-2xl shadow-[3px_3px_0_black] overflow-hidden"
    >
      <div className="h-1.5" style={{ backgroundColor: accent }} />
      <div className="flex items-center gap-3 p-3.5">
        <div
          className="size-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 18%, white)` }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[0.6875rem] font-medium text-muted-foreground leading-none mb-1">
            {label}
          </p>
          <p className="text-xl font-bold leading-none">{value}</p>
          <p className="text-[0.6875rem] text-muted-foreground leading-none mt-0.5">
            {sub}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function formatHours(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function OverviewTab() {
  const {
    sessions,
    getTodayCount,
    getTodayMinutes,
    getStreaks,
    getLifetimeStats,
  } = useStats();

  const todayCount = useMemo(() => getTodayCount(), [sessions, getTodayCount]);
  const todayMinutes = useMemo(
    () => getTodayMinutes(),
    [sessions, getTodayMinutes],
  );
  const streaks = useMemo(() => getStreaks(), [sessions, getStreaks]);
  const lifetime = useMemo(
    () => getLifetimeStats(),
    [sessions, getLifetimeStats],
  );

  return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard index={0} icon={<Clock className="size-5 text-[#FD5A46]" />} label="Focus Today" value={todayCount} sub={`${todayMinutes} min`} accent="#FD5A46" />
        <StatCard index={1} icon={<CalendarClock className="size-5 text-[#058CD7]" />} label="This Week" value={lifetime.thisWeekSessions} sub={`${lifetime.thisWeekMinutes} min`} accent="#058CD7" />
        <StatCard index={2} icon={<Sigma className="size-5 text-[#00995E]" />} label="All Time" value={lifetime.totalSessions} sub={formatHours(lifetime.totalFocusMs)} accent="#00995E" />
        <StatCard index={3} icon={<Flame className="size-5 text-[#FFC567]" />} label="Streak" value={streaks.current} sub={streaks.current === 1 ? "day" : "days"} accent="#FFC567" />
        <StatCard index={4} icon={<TrendingUp className="size-5 text-[#FB7DA8]" />} label="Daily Avg" value={`${lifetime.avgDailyMinutes}m`} sub="per active day" accent="#FB7DA8" />
        <StatCard index={5} icon={<Star className="size-5 text-[#552CB7]" />} label="Top Day" value={lifetime.mostProductiveDay ?? "—"} sub="most focus time" accent="#552CB7" />
      </div>
  );
}
