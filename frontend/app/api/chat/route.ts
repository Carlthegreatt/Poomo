import { GoogleGenAI } from "@google/genai";
import { poomoTools, type ChatAction } from "@/lib/ai/tools";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

/* ------------------------------------------------------------------ */
/*  Rate limiter – daily + burst, in-memory, resets on deploy         */
/* ------------------------------------------------------------------ */

const DAILY_MAX = 35;
const BURST_WINDOW_MS = 10_000;
const BURST_MAX = 3;

const dailyLog = new Map<string, { date: string; count: number }>();
const burstLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];

  const daily = dailyLog.get(ip);
  if (daily && daily.date === today) {
    if (daily.count >= DAILY_MAX) return true;
    daily.count++;
  } else {
    dailyLog.set(ip, { date: today, count: 1 });
  }

  const timestamps = burstLog.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < BURST_WINDOW_MS);
  if (recent.length >= BURST_MAX) {
    burstLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  burstLog.set(ip, recent);

  return false;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AppContext {
  tasks: {
    title: string;
    column: string;
    due_date: string | null;
    description: string | null;
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
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const GENERIC_ERROR = "I'm temporarily unavailable. Please try again shortly.";
const MAX_MESSAGES = 12;
const MAX_BODY_BYTES = 128_000;
const MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
] as const;

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

function buildSystemPrompt(ctx: AppContext): string {
  const today = new Date().toISOString().split("T")[0];

  const timerPhase = PHASE_LABELS[ctx.timer.phase] ?? ctx.timer.phase;
  const timerLine = ctx.timer.isRunning
    ? `Timer: ${timerPhase}, running, ${formatMs(ctx.timer.remainingMs)} remaining`
    : `Timer: ${timerPhase}${ctx.timer.remainingMs > 0 ? `, paused, ${formatMs(ctx.timer.remainingMs)} remaining` : ""}`;

  const tasksLine =
    ctx.tasks.length > 0
      ? ctx.tasks
          .map((t) => {
            let s = `${t.title} (${t.column}`;
            if (t.due_date) s += `, due ${t.due_date}`;
            return s + ")";
          })
          .join(", ")
      : "None";

  const eventsLine =
    ctx.events.length > 0
      ? ctx.events
          .map((e) => {
            if (e.all_day) return `${e.title} (all day)`;
            return `${e.title}: ${e.start} – ${e.end}`;
          })
          .join(", ")
      : "None";

  const statsLine = [
    `${ctx.stats.todayCount} sessions today`,
    `${ctx.stats.todayMinutes}min focused today`,
    `${ctx.stats.thisWeekSessions} this week`,
    `streak: ${ctx.stats.currentStreak}d`,
  ].join(", ");

  return [
    "You are Poomo AI, a friendly and concise productivity assistant inside a Pomodoro timer app called Poomo.",
    "",
    "IMPORTANT: The user's full app state is provided below — their timer, tasks, upcoming schedule, and focus stats. You already have this data. When the user asks about their schedule, tasks, timer, or stats, answer directly from the data below. You do NOT need any tool to read this information.",
    "",
    "Use the available tools ONLY for actions: starting/pausing/resetting the timer, creating tasks, or scheduling new events.",
    "Keep responses short — 1-3 sentences unless the user asks for detail.",
    `Today's date is ${today}.`,
    "",
    "--- Current App State ---",
    timerLine,
    `Tasks: ${tasksLine}`,
    `Upcoming schedule: ${eventsLine}`,
    `Stats: ${statsLine}`,
  ].join("\n");
}

const MUTATION_TOOLS = new Set([
  "start_timer",
  "pause_timer",
  "reset_timer",
  "create_task",
  "schedule_event",
]);

const TOOL_TO_WIDGET: Record<string, string> = {
  start_timer: "timer",
  pause_timer: "timer",
  reset_timer: "timer",
  create_task: "board",
  schedule_event: "calendar",
};

function buildConfirmation(actions: ChatAction[]): string {
  return actions
    .map(({ tool, args }) => {
      switch (tool) {
        case "start_timer": {
          const label =
            args.phase === "WORK"
              ? "focus timer"
              : args.phase === "BREAK_SHORT"
                ? "short break"
                : "long break";
          return `Starting a ${label}.`;
        }
        case "pause_timer":
          return "Timer paused.";
        case "reset_timer":
          return "Timer reset.";
        case "create_task":
          return `Task created: ${args.title}.`;
        case "schedule_event":
          return `Event scheduled: ${args.title}.`;
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join(" ");
}

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE")
  );
}

async function callGeminiWithFallback(
  config: Omit<Parameters<typeof genai.models.generateContent>[0], "model"> & {
    model?: string;
  },
): ReturnType<typeof genai.models.generateContent> {
  let lastError: unknown;

  for (const model of MODELS) {
    try {
      return await genai.models.generateContent({ ...config, model });
    } catch (error: unknown) {
      lastError = error;
      if (!isRateLimitError(error)) throw error;
      console.warn(`[chat] ${model} rate-limited, trying next model`);
    }
  }

  throw lastError;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: GENERIC_ERROR }, { status: 503 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return Response.json({ error: GENERIC_ERROR }, { status: 503 });
  }

  /* ---------- Input validation ---------- */

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: GENERIC_ERROR }, { status: 413 });
  }

  let body: { messages?: unknown[]; context?: AppContext };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { messages, context } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  if (messages.length > MAX_MESSAGES) {
    return Response.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  if (!context || typeof context !== "object") {
    return Response.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  /* ---------- Stream response ---------- */

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const response = await callGeminiWithFallback({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contents: [...messages] as any,
          config: {
            systemInstruction: buildSystemPrompt(context),
            tools: [{ functionDeclarations: poomoTools }],
          },
        });

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts) {
          send({ type: "error", message: GENERIC_ERROR });
        } else {
          const parts = candidate.content.parts;
          const fnCalls = parts.filter(
            (p: { functionCall?: unknown }) => p.functionCall,
          );

          if (fnCalls.length === 0) {
            const text = parts
              .map((p: { text?: string }) => p.text ?? "")
              .join("");
            if (text) {
              send({ type: "text_delta", content: text });
            }
          } else {
            const actions: ChatAction[] = [];
            let widgetType: string | null = null;
            for (const part of fnCalls) {
              const { name, args } = part.functionCall as {
                name: string;
                args: Record<string, unknown>;
              };
              if (MUTATION_TOOLS.has(name)) {
                actions.push({ tool: name, args });
              }
              if (!widgetType && TOOL_TO_WIDGET[name]) {
                widgetType = TOOL_TO_WIDGET[name];
              }
            }

            if (actions.length > 0) {
              const confirmation = buildConfirmation(actions);
              if (confirmation) {
                send({ type: "text_delta", content: confirmation });
              }
              send({ type: "actions", actions });
            }

            if (widgetType) {
              send({ type: "widget", widget: widgetType });
            }
          }
        }
      } catch (error) {
        console.error("[chat] stream error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: GENERIC_ERROR })}\n\n`,
          ),
        );
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
