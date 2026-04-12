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

const SCHEDULE_CREATE_PATTERNS: {
  re: RegExp;
  day: "today" | "tomorrow";
}[] = [
  {
    re: /^\s*schedule\s+(?:(?:a|an|the)\s+)?(.+?)\s+tomorrow\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
    day: "tomorrow",
  },
  {
    re: /^\s*schedule\s+(?:(?:a|an|the)\s+)?(.+?)\s+today\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
    day: "today",
  },
];

function titleCasePhrase(s: string): string {
  const t = s.trim();
  if (!t) return "Event";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** "Schedule a study session tomorrow at 3pm" → create event (not "show my schedule"). */
function matchScheduleCreation(text: string): IntentMatch | null {
  const normalized = text.trim();
  for (const { re, day } of SCHEDULE_CREATE_PATTERNS) {
    const m = normalized.match(re);
    if (!m) continue;
    const titleRaw = m[1]?.trim() ?? "Event";
    let hour = parseInt(m[2] ?? "0", 10);
    const minute = m[3] ? parseInt(m[3], 10) : 0;
    const ap = (m[4] ?? "pm").toLowerCase();
    if (ap === "pm" && hour < 12) hour += 12;
    if (ap === "am" && hour === 12) hour = 0;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) continue;

    const start = new Date();
    if (day === "tomorrow") {
      start.setDate(start.getDate() + 1);
    }
    start.setHours(hour, minute, 0, 0);

    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const title = titleCasePhrase(titleRaw);

    return {
      response: `Scheduled “${title}” for ${start.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} (1 hour).`,
      execute: () =>
        executeAction({
          tool: "schedule_event",
          args: {
            title,
            start: start.toISOString(),
            end: end.toISOString(),
          },
        }),
      widget: "calendar",
    };
  }
  return null;
}

function deriveNoteTitle(body: string): string {
  const first = body.trim().split(/\n/)[0]?.trim() ?? "";
  const dot = first.search(/[.!?](\s|$)/);
  const sentence = dot === -1 ? first : first.slice(0, dot + 1).trim();
  const base = sentence || first || "Note";
  return base.length > 72 ? `${base.slice(0, 69)}…` : base;
}

const SAVE_NOTE_PATTERNS: RegExp[] = [
  /^\s*take\s+a\s+note\s+(?:of|that)\s*[:\s]*([\s\S]+)$/i,
  /^\s*take\s+note\s+(?:of|that)\s*[:\s]*([\s\S]+)$/i,
  /^\s*note\s+(?:this|down|that)\s*[:\s]*([\s\S]+)$/i,
  /^\s*(?:remember|jot\s+down)\s+(?:that\s+|this\s*)?[:\s]*([\s\S]+)$/i,
  /^\s*save\s+(?:this\s+)?(?:to\s+)?notes?\s*[:\s]*([\s\S]+)$/i,
  /^\s*write\s+down\s*[:\s]*([\s\S]+)$/i,
  /^\s*capture\s+(?:this\s+)?idea\s*[:\s]*([\s\S]+)$/i,
];

/** Natural phrasing → save_note (same as chat tool; no API). */
function matchSaveNoteIntent(text: string): IntentMatch | null {
  const normalized = text.trim();

  /** "Take a note of my idea: …" / "… my idea — …" / "… my idea something" */
  const ofMyIdea =
    /^\s*take\s+a\s+note\s+of\s+my\s+idea(?:\s*[:\u2014\u2013\-]\s*|\s+)([\s\S]+)$/i;
  const ideaM = normalized.match(ofMyIdea);
  const ideaBody = ideaM?.[1]?.trim();
  if (ideaBody) {
    const title = deriveNoteTitle(ideaBody);
    return {
      response: `Saved “${title}” to your Notes. I'll ask you about it another time we chat.`,
      execute: () =>
        executeAction({
          tool: "save_note",
          args: { title, body: ideaBody },
        }),
      widget: "notes",
    };
  }

  for (const re of SAVE_NOTE_PATTERNS) {
    const m = normalized.match(re);
    const raw = m?.[1]?.trim();
    if (!raw) continue;
    const title = deriveNoteTitle(raw);
    return {
      response: `Saved “${title}” to your Notes. Open the Notes tab to edit, pin, or reorder it.`,
      execute: () =>
        executeAction({
          tool: "save_note",
          args: { title, body: raw },
        }),
      widget: "notes",
    };
  }
  return null;
}

/** Map user phrasing ("to do list", "todo") to an actual kanban column title. */
function findColumnForHint(
  hintRaw: string,
  orderedTitles: string[],
): string | null {
  if (orderedTitles.length === 0) return null;

  let hint = hintRaw.trim().toLowerCase();
  hint = hint.replace(/^(?:the|my|a|an)\s+/i, "");
  hint = hint.replace(/\s+list$/i, "");
  hint = hint.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!hint) return orderedTitles[0] ?? null;

  const candidates = orderedTitles.map((title) => {
    const t = title
      .trim()
      .toLowerCase()
      .replace(/-/g, " ")
      .replace(/\s+/g, " ");
    return { title, t };
  });

  for (const { title, t } of candidates) {
    if (t === hint) return title;
  }

  for (const { title, t } of candidates) {
    if (hint.length >= 2 && (t.includes(hint) || hint.includes(t))) {
      return title;
    }
  }

  const todoish =
    hint === "to do" ||
    hint === "todo" ||
    hint === "to-do" ||
    /^to\s+do\b/.test(hint);
  if (todoish) {
    const hit = candidates.find(({ t }) => t === "todo");
    if (hit) return hit.title;
  }

  return null;
}

/** "Add work to my todo list" → create_task (no LLM). */
function matchCreateTaskIntent(text: string): IntentMatch | null {
  const t = text.trim();
  const { columns } = useKanban.getState();
  const ordered = [...columns].sort((a, b) => a.position - b.position);
  const orderedTitles = ordered.map((c) => c.title);
  if (orderedTitles.length === 0) return null;

  const run = (title: string, column: string): IntentMatch => ({
    response: `Task created: ${title}.`,
    execute: () =>
      executeAction({
        tool: "create_task",
        args: { title, column },
      }),
    widget: "board",
  });

  const tryPair = (titlePart: string, destRaw: string): IntentMatch | null => {
    const title = titlePart.trim();
    const dest = destRaw.trim();
    if (!title || title.length > 200) return null;
    const column = findColumnForHint(dest, orderedTitles);
    if (!column) return null;
    return run(title, column);
  };

  let m = t.match(
    /^\s*i\s+(?:want to|need to)\s+add\s+(.+?)\s+to\s+(?:my\s+|the\s+)?(.+)$/i,
  );
  if (m) {
    const hit = tryPair(m[1] ?? "", m[2] ?? "");
    if (hit) return hit;
  }

  m = t.match(/^\s*add\s+(.+?)\s+to\s+(?:my\s+|the\s+)?(.+)$/i);
  if (m) {
    const hit = tryPair(m[1] ?? "", m[2] ?? "");
    if (hit) return hit;
  }

  m = t.match(/^\s*put\s+(.+?)\s+on\s+(?:my\s+|the\s+)?(.+)$/i);
  if (m) {
    const hit = tryPair(m[1] ?? "", m[2] ?? "");
    if (hit) return hit;
  }

  m = t.match(
    /^\s*(?:create|add)\s+task\s+(.+?)\s+to\s+(?:my\s+|the\s+)?(.+)$/i,
  );
  if (m) {
    const hit = tryPair(m[1] ?? "", m[2] ?? "");
    if (hit) return hit;
  }

  m = t.match(
    /^\s*(?:create|new)\s+task\s+(.+?)\s+in\s+(?:my\s+|the\s+)?(.+)$/i,
  );
  if (m) {
    const hit = tryPair(m[1] ?? "", m[2] ?? "");
    if (hit) return hit;
  }

  return null;
}

/** WORK timer with optional custom minutes — must run before broad `\bgrind\b` action intents. */
function matchStartWorkWithDuration(text: string): IntentMatch | null {
  const t = text.trim();

  const ok = (minutes: number): minutes is number =>
    Number.isFinite(minutes) && minutes >= 1 && minutes <= 480;

  const run = (minutes: number): IntentMatch => ({
    response: `Starting a ${minutes}-minute focus session.`,
    execute: () =>
      executeAction({
        tool: "start_timer",
        args: { phase: "WORK", minutes },
      }),
    widget: "timer",
  });

  let m = t.match(
    /^\s*i\s+(?:want to|need to|wanna)\s+grind\s+for\s+(\d+)\s*(?:min|minutes?|m)\b/i,
  );
  if (m && ok(parseInt(m[1], 10))) return run(parseInt(m[1], 10));

  m = t.match(
    /^\s*(?:i'?ll|ill)\s+grind\s+for\s+(\d+)\s*(?:min|minutes?|m)\b/i,
  );
  if (m && ok(parseInt(m[1], 10))) return run(parseInt(m[1], 10));

  m = t.match(
    /^\s*(?:let'?s\s+)?grind(?:\s+for)?\s+(\d+)\s*(?:min|minutes?|m)\b/i,
  );
  if (m && ok(parseInt(m[1], 10))) return run(parseInt(m[1], 10));

  m = t.match(
    /^\s*(?:(?:let'?s\s+)?(?:focus|work|study)|(?:start|begin)\s+(?:a\s+)?(?:focus|work|(?:pomodoro\s+)?session))\s+for\s+(\d+)\s*(?:min|minutes?|m)\b/i,
  );
  if (m && ok(parseInt(m[1], 10))) return run(parseInt(m[1], 10));

  m = t.match(
    /^\s*(\d+)\s*(?:min|minutes?|m)\b(?:\s+of)?\s+(?:grind|focus|work|deep\s+work|pomodoro)(?:\s+session)?\b/i,
  );
  if (m && ok(parseInt(m[1], 10))) return run(parseInt(m[1], 10));

  m = t.match(
    /^\s*(?:(?:start|begin|run)\s+)?(?:a\s+)?(?:pomodoro|focus\s+session|work\s+session)\s+for\s+(\d+)\s*(?:min|minutes?|m)\b/i,
  );
  if (m && ok(parseInt(m[1], 10))) return run(parseInt(m[1], 10));

  return null;
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
    pattern: /^\s*(?:let'?s\s+)?grind(?:\s+session)?\s*\.?\s*$/i,
    action: { tool: "start_timer", args: { phase: "WORK" } },
    response: "Starting a focus session.",
    widget: "timer",
  },
  {
    type: "action",
    pattern:
      /\b(start|begin|run|launch)\b.*(focus|work|pomodoro|timer|session)|\b(let'?s|time to|i want to)\s+(focus|work|study|grind)\b/i,
    action: { tool: "start_timer", args: { phase: "WORK" } },
    response: "Starting a focus session.",
    widget: "timer",
  },
  {
    type: "action",
    pattern:
      /\b(pause|stop|hold)\b.{0,120}\btimer\b|\btimer\b.{0,120}\b(pause|stop|hold)\b/i,
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
    .slice(0, 15);

  if (upcoming.length === 0) return "You have no upcoming events on your schedule.";

  const dayOrder: string[] = [];
  const byDay = new Map<string, typeof upcoming>();
  for (const e of upcoming) {
    const start = new Date(e.start);
    const dayKey = start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!byDay.has(dayKey)) dayOrder.push(dayKey);
    const list = byDay.get(dayKey) ?? [];
    list.push(e);
    byDay.set(dayKey, list);
  }

  const blocks: string[] = ["Here's your upcoming schedule:\n"];
  for (const day of dayOrder) {
    const dayEvents = byDay.get(day) ?? [];
    blocks.push(`${day}`);
    for (const e of dayEvents) {
      const start = new Date(e.start);
      const end = new Date(e.end);
      const timePart = e.all_day
        ? "All day"
        : `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
      blocks.push(`• ${timePart} — ${e.title}`);
    }
    blocks.push("");
  }
  return blocks.join("\n").trimEnd();
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

  const lines: string[] = ["Here are your tasks:\n"];
  for (const [col, items] of grouped) {
    lines.push(`${col}`);
    for (const title of items) {
      lines.push(`• ${title}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
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
    "Here's a quick stats snapshot:\n",
    `• Today: ${today} session${today !== 1 ? "s" : ""}, ${todayMin} minutes focused.`,
    `• This week: ${lifetime.thisWeekSessions} sessions, ${lifetime.thisWeekMinutes} minutes.`,
    `• Streak: ${streaks.current} day${streaks.current !== 1 ? "s" : ""} (best: ${streaks.best}).`,
  ].join("\n");
}

const READ_INTENTS: ReadIntent[] = [
  {
    type: "read",
    pattern:
      /\b(what'?s|whats|show|list|check|see|view|tell me)\b.{0,100}\b(on my\s+)?(schedule|calendar|event|upcoming)|\b(my|the)\s+(schedule|calendar)\b|\bupcoming\s+(event|events|appointment)|\bcalendar\b.{0,40}\?/i,
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

  const scheduleCreate = matchScheduleCreation(normalized);
  if (scheduleCreate) return scheduleCreate;

  const saveNote = matchSaveNoteIntent(normalized);
  if (saveNote) return saveNote;

  const createTask = matchCreateTaskIntent(normalized);
  if (createTask) return createTask;

  const workWithDuration = matchStartWorkWithDuration(normalized);
  if (workWithDuration) return workWithDuration;

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
