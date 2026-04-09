import { executeAction } from "@/lib/ai/executor";
import { useTimer } from "@/stores/timerStore";
import { useKanban } from "@/stores/kanbanStore";
import { useCalendar } from "@/stores/calendarStore";
import { useStats } from "@/stores/statsStore";
import type { ChatAction } from "@/lib/ai/tools";
import type { WidgetType } from "@/lib/ai/chatStorage";

/* ------------------------------------------------------------------ */
/*  Action intents (execute a store mutation, zero API calls)          */
/* ------------------------------------------------------------------ */

interface ActionIntent {
  type: "action";
  pattern: RegExp;
  action: ChatAction;
  response: string;
  widget: WidgetType;
}

const ACTION_INTENTS: ActionIntent[] = [
  {
    type: "action",
    pattern: /\blong\s+break\b/i,
    action: { tool: "start_timer", args: { phase: "BREAK_LONG" } },
    response: "Starting a long break.",
    widget: "timer",
  },
  {
    type: "action",
    pattern: /\b(short\s+break|take\s+(a\s+)?break)\b/i,
    action: { tool: "start_timer", args: { phase: "BREAK_SHORT" } },
    response: "Starting a short break.",
    widget: "timer",
  },
  {
    type: "action",
    pattern:
      /\b(start|begin|run|launch)\b.*(focus|work|pomodoro|timer|session)|\b(let'?s|time to|i want to)\s+(focus|work|study)\b/i,
    action: { tool: "start_timer", args: { phase: "WORK" } },
    response: "Starting a focus session.",
    widget: "timer",
  },
  {
    type: "action",
    pattern: /\b(pause|stop|hold)\b.*timer|\bpause\b/i,
    action: { tool: "pause_timer", args: {} },
    response: "Timer paused.",
    widget: "timer",
  },
  {
    type: "action",
    pattern: /\b(reset|restart|clear)\b.*timer/i,
    action: { tool: "reset_timer", args: {} },
    response: "Timer reset.",
    widget: "timer",
  },
];

/* ------------------------------------------------------------------ */
/*  Read intents (answer from local store, zero API calls)            */
/* ------------------------------------------------------------------ */

interface ReadIntent {
  type: "read";
  pattern: RegExp;
  resolve: () => string;
  widget: WidgetType;
}

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
  return `${m}m ${s}s`;
}

function resolveSchedule(): string {
  const { events } = useCalendar.getState();
  const now = new Date().toISOString();
  const upcoming = events
    .filter((e) => e.end >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 5);

  if (upcoming.length === 0) return "You have no upcoming events on your schedule.";

  const lines = upcoming.map((e) => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    const datePart = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const timePart = e.all_day
      ? "all day"
      : `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    return `• ${e.title} — ${datePart}, ${timePart}`;
  });

  return `Here's your upcoming schedule:\n${lines.join("\n")}`;
}

function resolveTasks(): string {
  const { tasks, columns } = useKanban.getState();
  if (tasks.length === 0) return "You don't have any tasks on your board.";

  const columnMap = new Map(columns.map((c) => [c.id, c.title]));
  const grouped = new Map<string, string[]>();
  for (const t of tasks) {
    const col = columnMap.get(t.column_id) ?? "Unknown";
    const list = grouped.get(col) ?? [];
    list.push(t.title);
    grouped.set(col, list);
  }

  const lines: string[] = [];
  for (const [col, items] of grouped) {
    lines.push(`${col}: ${items.join(", ")}`);
  }
  return `Here are your tasks:\n${lines.join("\n")}`;
}

function resolveTimerStatus(): string {
  const timer = useTimer.getState();
  const label = PHASE_LABELS[timer.phase] ?? timer.phase;

  if (timer.phase === "IDLE") return "Your timer is idle. Ready to start a focus session?";
  if (timer.isRunning) return `Your timer is running: ${label}, ${formatMs(timer.remainingMs)} remaining.`;
  return `Your timer is paused: ${label}, ${formatMs(timer.remainingMs)} remaining.`;
}

function resolveStats(): string {
  const stats = useStats.getState();
  const today = stats.getTodayCount();
  const todayMin = stats.getTodayMinutes();
  const lifetime = stats.getLifetimeStats();
  const streaks = stats.getStreaks();

  return [
    `Today: ${today} session${today !== 1 ? "s" : ""}, ${todayMin} minutes focused.`,
    `This week: ${lifetime.thisWeekSessions} sessions, ${lifetime.thisWeekMinutes} minutes.`,
    `Streak: ${streaks.current} day${streaks.current !== 1 ? "s" : ""} (best: ${streaks.best}).`,
  ].join("\n");
}

const READ_INTENTS: ReadIntent[] = [
  {
    type: "read",
    pattern: /\b(schedule|calendar|event|upcoming|planned)\b/i,
    resolve: resolveSchedule,
    widget: "calendar",
  },
  {
    type: "read",
    pattern: /\b(task|todo|to-?do|board|kanban)\b.*\?$|\b(what|show|check|see|list|get|my)\b.*\b(task|todo|to-?do|board)\b/i,
    resolve: resolveTasks,
    widget: "board",
  },
  {
    type: "read",
    pattern: /\b(timer|time remaining|how much time|countdown)\b.*\?$|\b(what|show|check)\b.*\b(timer|time)\b/i,
    resolve: resolveTimerStatus,
    widget: "timer",
  },
  {
    type: "read",
    pattern: /\b(stat|progress|streak|productivity)\b|\bhow (am i|did i|many)\b.*(session|focus|today|week)/i,
    resolve: resolveStats,
    widget: "stats",
  },
];

/* ------------------------------------------------------------------ */
/*  Matcher                                                            */
/* ------------------------------------------------------------------ */

export interface IntentMatch {
  response: string;
  execute: () => Promise<void>;
  widget?: WidgetType;
}

export function matchIntent(text: string): IntentMatch | null {
  const normalized = text.trim();

  for (const intent of ACTION_INTENTS) {
    if (intent.pattern.test(normalized)) {
      return {
        response: intent.response,
        execute: () => executeAction(intent.action),
        widget: intent.widget,
      };
    }
  }

  for (const intent of READ_INTENTS) {
    if (intent.pattern.test(normalized)) {
      return {
        response: intent.resolve(),
        execute: () => Promise.resolve(),
        widget: intent.widget,
      };
    }
  }

  return null;
}
