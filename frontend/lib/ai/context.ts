import { useTimer } from "@/stores/timerStore";
import { useKanban } from "@/stores/kanbanStore";
import { useCalendar } from "@/stores/calendarStore";
import { useStats } from "@/stores/statsStore";
import { useNotes } from "@/stores/notesStore";
import { waitForAuthHydration } from "@/lib/data/authSession";

export interface AppContext {
  /** Kanban column titles in board order (includes empty columns). */
  columns: string[];
  tasks: {
    title: string;
    column: string;
    due_date: string | null;
    due_time: string | null;
    description: string | null;
    priority: string | null;
    task_type: string | null;
  }[];
  events: {
    title: string;
    start: string;
    end: string;
    all_day: boolean;
  }[];
  timer: {
    phase: string;
    isRunning: boolean;
    remainingMs: number;
  };
  stats: {
    todayCount: number;
    todayMinutes: number;
    thisWeekSessions: number;
    thisWeekMinutes: number;
    totalSessions: number;
    totalFocusMinutes: number;
    currentStreak: number;
    bestStreak: number;
  };
  /** Recent note titles so the model can align new notes or suggest organization. */
  notes: { title: string; updated: string }[];
}

const MAX_CONTEXT_EVENTS = 10;
const MAX_CONTEXT_TASKS = 15;

export async function buildContext(): Promise<AppContext> {
  await waitForAuthHydration();

  const calendarP = (async () => {
    const cal = useCalendar.getState();
    if (cal.events.length === 0) {
      await cal.loadEvents();
    }
  })();

  const kanbanP = (async () => {
    const k = useKanban.getState();
    if (k.columns.length === 0) {
      await k.loadBoard();
    }
  })();

  const notesP = (async () => {
    if (!useNotes.getState().notesSyncedOnce) {
      await useNotes.getState().loadNotes();
    }
  })();

  await Promise.all([calendarP, kanbanP, notesP]);

  const { events } = useCalendar.getState();
  const { tasks, columns } = useKanban.getState();
  const allNotes = useNotes.getState().notes;

  const timer = useTimer.getState();
  const stats = useStats.getState();

  const columnTitles = [...columns]
    .sort((a, b) => a.position - b.position)
    .map((c) => c.title);

  const columnMap = new Map(columns.map((c) => [c.id, c.title]));

  const streaks = stats.getStreaks();
  const lifetime = stats.getLifetimeStats();

  const notesForContext = [...allNotes]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 15)
    .map((n) => ({
      title: n.title || "Untitled",
      updated: n.updated_at.slice(0, 10),
    }));

  const now = new Date().toISOString();
  const upcomingEvents = events
    .filter((e) => e.end >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, MAX_CONTEXT_EVENTS);

  return {
    columns: columnTitles,
    tasks: tasks.slice(0, MAX_CONTEXT_TASKS).map((t) => ({
      title: t.title,
      column: columnMap.get(t.column_id) ?? "Unknown",
      due_date: t.due_date,
      due_time: t.due_time,
      description: t.description,
      priority: t.priority,
      task_type: t.task_type,
    })),
    events: upcomingEvents.map((e) => ({
      title: e.title,
      start: e.start,
      end: e.end,
      all_day: e.all_day,
    })),
    timer: {
      phase: timer.phase,
      isRunning: timer.isRunning,
      remainingMs: timer.remainingMs,
    },
    stats: {
      todayCount: stats.getTodayCount(),
      todayMinutes: stats.getTodayMinutes(),
      thisWeekSessions: lifetime.thisWeekSessions,
      thisWeekMinutes: lifetime.thisWeekMinutes,
      totalSessions: lifetime.totalSessions,
      totalFocusMinutes: Math.round(lifetime.totalFocusMs / 60_000),
      currentStreak: streaks.current,
      bestStreak: streaks.best,
    },
    notes: notesForContext,
  };
}
