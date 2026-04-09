import { readJSON, writeJSON, generateId } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";

export interface FocusSession {
  id: string;
  startedAt: string;
  endedAt: string;
  phase: "focus" | "shortBreak" | "longBreak";
  durationMs: number;
  taskId: string | null;
  taskTitle: string | null;
}

const DEFAULT_GOAL = 8;

function readSessions(): FocusSession[] {
  return readJSON<FocusSession[]>(STORAGE_KEYS.SESSIONS, []);
}

function writeSessions(sessions: FocusSession[]): void {
  writeJSON(STORAGE_KEYS.SESSIONS, sessions);
}

export async function fetchSessions(): Promise<FocusSession[]> {
  return readSessions().sort(
    (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
  );
}

export function logSession(
  session: Omit<FocusSession, "id">,
): FocusSession {
  const sessions = readSessions();
  const entry: FocusSession = { ...session, id: generateId() };
  sessions.push(entry);
  writeSessions(sessions);
  return entry;
}

export async function clearSessions(): Promise<void> {
  writeSessions([]);
}

export function getDailyGoal(): number {
  if (typeof window === "undefined") return DEFAULT_GOAL;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_GOAL);
    if (!raw) return DEFAULT_GOAL;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

export function setDailyGoal(goal: number): void {
  localStorage.setItem(
    STORAGE_KEYS.DAILY_GOAL,
    String(Math.max(1, Math.floor(goal))),
  );
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getSessionsForDay(
  sessions: FocusSession[],
  date: Date,
): FocusSession[] {
  return sessions.filter((s) => isSameDay(new Date(s.endedAt), date));
}

export function getFocusSessionsForDay(
  sessions: FocusSession[],
  date: Date,
): FocusSession[] {
  return getSessionsForDay(sessions, date).filter((s) => s.phase === "focus");
}

export function getFocusMinutesForDay(
  sessions: FocusSession[],
  date: Date,
): number {
  return getFocusSessionsForDay(sessions, date).reduce(
    (sum, s) => sum + s.durationMs / 60_000,
    0,
  );
}

export interface StreakInfo {
  current: number;
  best: number;
}

export function getStreaks(sessions: FocusSession[]): StreakInfo {
  const focusSessions = sessions.filter((s) => s.phase === "focus");
  if (focusSessions.length === 0) return { current: 0, best: 0 };

  const daySet = new Set<string>();
  for (const s of focusSessions) {
    daySet.add(startOfDay(new Date(s.endedAt)).toISOString());
  }

  const sortedDays = Array.from(daySet)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let current = 0;
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (
    isSameDay(sortedDays[0], today) ||
    isSameDay(sortedDays[0], yesterday)
  ) {
    current = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const expected = new Date(sortedDays[i - 1]);
      expected.setDate(expected.getDate() - 1);
      if (isSameDay(sortedDays[i], expected)) {
        current++;
      } else {
        break;
      }
    }
  }

  let best = 0;
  let streak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const expected = new Date(sortedDays[i - 1]);
    expected.setDate(expected.getDate() - 1);
    if (isSameDay(sortedDays[i], expected)) {
      streak++;
    } else {
      best = Math.max(best, streak);
      streak = 1;
    }
  }
  best = Math.max(best, streak, current);

  return { current, best };
}

export interface TaskBreakdown {
  taskId: string | null;
  taskTitle: string;
  totalMs: number;
  sessionCount: number;
  color: string | null;
}

export function getTaskBreakdown(sessions: FocusSession[]): TaskBreakdown[] {
  const focusSessions = sessions.filter((s) => s.phase === "focus");
  const map = new Map<
    string,
    { totalMs: number; count: number; title: string; taskId: string | null }
  >();

  for (const s of focusSessions) {
    const key = s.taskId ?? "__unlinked__";
    const existing = map.get(key);
    if (existing) {
      existing.totalMs += s.durationMs;
      existing.count++;
    } else {
      map.set(key, {
        totalMs: s.durationMs,
        count: 1,
        title: s.taskTitle ?? "Unlinked sessions",
        taskId: s.taskId,
      });
    }
  }

  return Array.from(map.values())
    .map((v) => ({
      taskId: v.taskId,
      taskTitle: v.title,
      totalMs: v.totalMs,
      sessionCount: v.count,
      color: null,
    }))
    .sort((a, b) => b.totalMs - a.totalMs);
}

export interface LifetimeStats {
  totalSessions: number;
  totalFocusMs: number;
  avgDailyMinutes: number;
  mostProductiveDay: string | null;
  thisWeekSessions: number;
  thisWeekMinutes: number;
}

export function getLifetimeStats(sessions: FocusSession[]): LifetimeStats {
  const focusSessions = sessions.filter((s) => s.phase === "focus");

  const totalSessions = focusSessions.length;
  const totalFocusMs = focusSessions.reduce((s, f) => s + f.durationMs, 0);

  const dayMap = new Map<string, number>();
  for (const s of focusSessions) {
    const key = startOfDay(new Date(s.endedAt)).toISOString();
    dayMap.set(key, (dayMap.get(key) ?? 0) + s.durationMs);
  }
  const activeDays = dayMap.size;
  const avgDailyMinutes =
    activeDays > 0 ? Math.round(totalFocusMs / 60_000 / activeDays) : 0;

  const dowTotals = [0, 0, 0, 0, 0, 0, 0];
  const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const s of focusSessions) {
    const dow = new Date(s.endedAt).getDay();
    dowTotals[dow] += s.durationMs;
  }
  let bestDow = 0;
  for (let i = 1; i < 7; i++) {
    if (dowTotals[i] > dowTotals[bestDow]) bestDow = i;
  }
  const mostProductiveDay = totalSessions > 0 ? DOW_NAMES[bestDow] : null;

  const now = new Date();
  const weekStart = startOfDay(new Date(now));
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const thisWeek = focusSessions.filter(
    (s) => new Date(s.endedAt) >= weekStart,
  );
  const thisWeekSessions = thisWeek.length;
  const thisWeekMinutes = Math.round(
    thisWeek.reduce((s, f) => s + f.durationMs, 0) / 60_000,
  );

  return {
    totalSessions,
    totalFocusMs,
    avgDailyMinutes,
    mostProductiveDay,
    thisWeekSessions,
    thisWeekMinutes,
  };
}

export interface WeekData {
  date: Date;
  label: string;
  focusMinutes: number;
}

export function getWeekData(sessions: FocusSession[]): WeekData[] {
  const today = new Date();
  const days: WeekData[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayStart = startOfDay(date);

    days.push({
      date: dayStart,
      label: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
      focusMinutes: getFocusMinutesForDay(sessions, dayStart),
    });
  }

  return days;
}

export interface HeatmapDay {
  date: Date;
  focusMinutes: number;
}

export function getHeatmapData(
  sessions: FocusSession[],
  weeks: number = 12,
): HeatmapDay[] {
  const today = startOfDay(new Date());
  const todayDow = today.getDay();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (6 - todayDow));

  const totalDays = weeks * 7;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - totalDays + 1);

  const days: HeatmapDay[] = [];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    days.push({
      date,
      focusMinutes: getFocusMinutesForDay(sessions, date),
    });
  }

  return days;
}
