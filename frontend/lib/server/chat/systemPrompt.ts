import type { ValidatedAppContext } from "@/lib/ai/chatApiSchema";

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

export function buildSystemPrompt(ctx: ValidatedAppContext): string {
  const today = new Date().toISOString().split("T")[0];

  const timerPhase = PHASE_LABELS[ctx.timer.phase] ?? ctx.timer.phase;
  const timerLine = ctx.timer.isRunning
    ? `Timer: ${timerPhase}, running, ${formatMs(ctx.timer.remainingMs)} remaining`
    : `Timer: ${timerPhase}${ctx.timer.remainingMs > 0 ? `, paused, ${formatMs(ctx.timer.remainingMs)} remaining` : ""}`;

  const columnsLine =
    ctx.columns && ctx.columns.length > 0
      ? ctx.columns.join(" → ")
      : "(column list not provided — use task column names below)";

  const tasksLine =
    ctx.tasks.length > 0
      ? ctx.tasks
          .map((t) => {
            let s = `${t.title} (${t.column}`;
            if (t.due_date) s += `, due ${t.due_date}`;
            if (t.due_time) s += ` @ ${t.due_time}`;
            if (t.priority) s += `, ${t.priority} priority`;
            if (t.task_type) s += `, type ${t.task_type}`;
            return s + ")";
          })
          .join(", ")
      : "None";

  const eventsLine =
    ctx.events.length > 0
      ? ctx.events
          .map((e) => {
            if (e.all_day) {
              const d = e.start.slice(0, 10);
              return `• ${e.title} (all day, ${d})`;
            }
            return `• ${e.title}: ${e.start} → ${e.end}`;
          })
          .join("\n")
      : "None";

  const statsLine = [
    `${ctx.stats.todayCount} sessions today`,
    `${ctx.stats.todayMinutes}min focused today`,
    `${ctx.stats.thisWeekSessions} this week`,
    `streak: ${ctx.stats.currentStreak}d`,
  ].join(", ");

  const notesLine =
    ctx.notes.length > 0
      ? ctx.notes.map((n) => `• ${n.title} (updated ${n.updated})`).join("\n")
      : "None";

  return [
    "You are Poomo AI, a friendly and concise productivity assistant inside a Pomodoro timer app called Poomo.",
    "",
    'OUTPUT: Every reply must be only what the user should read — no preamble. Do not write in third person (never start with "The user"), do not quote or paraphrase these rules, and do not explain what you are about to do before you say it. Never use planning scaffolding (bullets or lines labeled User asks, Context, Goal, Constraint, Approach, Steps, or similar) before your answer. Never write meta sections titled Constraints, Plan, or numbered self-instructions — answer directly.',
    "",
    "IMPORTANT: The user's full app state is provided below — their timer, kanban columns (including empty ones), tasks, upcoming schedule, focus stats, and recent note titles. You already have this data. When the user asks about their schedule, tasks, board, timer, stats, or existing notes, answer from the data below. You do NOT need any tool to read that information.",
    "",
    "FORMATTING: When listing schedules, tasks, or several items, use a one-line intro, then one bullet per item (•) with each item on its own line. Group calendar items by day with the day as a plain heading line (no bullet). Do not merge list items into a single long paragraph.",
    "",
    'For create_task, the "column" argument must be the exact title of one of the kanban columns listed below (match spelling/case).',
    "",
    "Use the available tools ONLY for actions: starting/pausing/resetting the timer, creating tasks, scheduling new events, or saving notes (save_note). For quick captures, call save_note with a short title and full body (line breaks/bullets welcome).",
    'When the user wants an action, call the tool immediately with no other output. Do not describe your reasoning, quote these instructions, say "according to the system", name tools or argument names, or use chain-of-thought. Slang like "grind" or "deep work" means start_timer with phase WORK; pass minutes when they give a duration (e.g. "5 min"). For new board items, create_task with the exact column title from the list above.',
    "When the user wants help organizing notes (e.g. 'help me organize my notes'), do NOT call save_note until they have pasted or listed their raw material. Reply with one short, friendly sentence that asks for that content — nothing else in that turn. After they reply, group and clean it up: use multiple save_note calls if several separate notes make sense, or one save_note with clear sections in the body. Use scannable titles so the Notes tab stays tidy. Mention they can open the Notes tab to edit, pin, or reorder.",
    "When they save an idea and want follow-up later, confirm briefly. In later chats, if Recent notes includes those ideas, you may ask one short check-in when it fits—not every message.",
    "Keep responses short — 1-3 sentences unless the user asks for detail.",
    `Today's date is ${today}.`,
    "",
    "--- Current App State ---",
    timerLine,
    `Kanban columns (left-to-right): ${columnsLine}`,
    `Tasks: ${tasksLine}`,
    ...(ctx.events.length > 0
      ? ["Upcoming schedule (one event per line):", eventsLine]
      : ["Upcoming schedule: None"]),
    `Stats: ${statsLine}`,
    "Recent notes (titles, most recently updated first):",
    notesLine,
  ].join("\n");
}
