import { createHash, timingSafeEqual } from "node:crypto";
import { ApiError, GoogleGenAI } from "@google/genai";
import {
  chatPostBodySchema,
  type ValidatedAppContext,
} from "@/lib/ai/chatApiSchema";
import { parseChatAction } from "@/lib/ai/chatActionSchema";
import { poomoTools, type ChatAction } from "@/lib/ai/tools";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

/* ------------------------------------------------------------------ */
/*  Rate limiter – daily + burst, in-memory, resets on deploy         */
/* ------------------------------------------------------------------ */

const DAILY_MAX = 35;
const BURST_WINDOW_MS = 10_000;
const BURST_MAX = 3;
const RATE_LIMIT_RETRY_AFTER_SEC = 60;

const dailyLog = new Map<string, { date: string; count: number }>();
const burstLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];

  const daily = dailyLog.get(ip);
  if (daily && daily.date === today && daily.count >= DAILY_MAX) {
    return true;
  }

  const timestamps = burstLog.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < BURST_WINDOW_MS);
  if (recent.length >= BURST_MAX) {
    burstLog.set(ip, recent);
    return true;
  }

  if (daily && daily.date === today) {
    daily.count++;
  } else {
    dailyLog.set(ip, { date: today, count: 1 });
  }
  recent.push(now);
  burstLog.set(ip, recent);

  return false;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const GENERIC_ERROR = "I'm temporarily unavailable. Please try again shortly.";
const MAX_BODY_BYTES = 128_000;

/** Set `POOMO_CHAT_DEBUG=1` in `.env.local` for verbose server logs. */
function chatDebug(...args: unknown[]) {
  const on =
    process.env.POOMO_CHAT_DEBUG === "1" ||
    process.env.POOMO_CHAT_DEBUG === "true";
  if (on) console.log("[chat:debug]", ...args);
}
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

function buildSystemPrompt(ctx: ValidatedAppContext): string {
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
    "IMPORTANT: The user's full app state is provided below — their timer, kanban columns (including empty ones), tasks, upcoming schedule, and focus stats. You already have this data. When the user asks about their schedule, tasks, board columns, timer, or stats, answer directly from the data below. You do NOT need any tool to read this information.",
    "",
    'For create_task, the "column" argument must be the exact title of one of the kanban columns listed below (match spelling/case).',
    "",
    "Use the available tools ONLY for actions: starting/pausing/resetting the timer, creating tasks, or scheduling new events.",
    "Keep responses short — 1-3 sentences unless the user asks for detail.",
    `Today's date is ${today}.`,
    "",
    "--- Current App State ---",
    timerLine,
    `Kanban columns (left-to-right): ${columnsLine}`,
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
  if (error instanceof ApiError) {
    const s = error.status;
    if (s === 429 || s === 503) return true;
  }
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
      chatDebug("calling Gemini", model);
      const out = await genai.models.generateContent({ ...config, model });
      chatDebug("Gemini ok", model, {
        candidates: out.candidates?.length ?? 0,
      });
      return out;
    } catch (error: unknown) {
      lastError = error;
      if (!isRateLimitError(error)) throw error;
      console.warn(`[chat] ${model} rate-limited, trying next model`);
      chatDebug("rate-limit / overload, next model", model, {
        status: error instanceof ApiError ? error.status : undefined,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  throw lastError;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function hashToken(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function isAuthorizedChatRequest(req: Request): boolean {
  const secret = process.env.POOMO_CHAT_API_SECRET;
  if (!secret) return true;

  const auth = req.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  if (!auth.startsWith(prefix)) return false;
  const token = auth.slice(prefix.length);

  const a = hashToken(token);
  const b = hashToken(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function readRequestTextWithLimit(
  req: Request,
  maxBytes: number,
): Promise<{ ok: true; text: string } | { ok: false; reason: "too_large" }> {
  const lenHeader = req.headers.get("content-length");
  if (lenHeader) {
    const n = Number(lenHeader);
    if (Number.isFinite(n) && n > maxBytes) {
      return { ok: false, reason: "too_large" };
    }
  }

  const stream = req.body;
  if (!stream) {
    return { ok: true, text: "" };
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.length) continue;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel().catch(() => {});
    return { ok: false, reason: "too_large" };
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  return { ok: true, text: new TextDecoder().decode(merged) };
}

type ContentPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
};

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    chatDebug("reject: GEMINI_API_KEY missing");
    return Response.json({ error: GENERIC_ERROR }, { status: 503 });
  }

  if (!isAuthorizedChatRequest(req)) {
    chatDebug("reject: unauthorized");
    return Response.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    chatDebug("reject: app rate limit", { ip });
    return Response.json(
      { error: GENERIC_ERROR },
      {
        status: 429,
        headers: { "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SEC) },
      },
    );
  }

  const rawBody = await readRequestTextWithLimit(req, MAX_BODY_BYTES);
  if (!rawBody.ok) {
    return Response.json({ error: GENERIC_ERROR }, { status: 413 });
  }

  let json: unknown;
  try {
    json = rawBody.text ? JSON.parse(rawBody.text) : null;
  } catch (err) {
    chatDebug("reject: invalid JSON", err);
    return Response.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const parsed = chatPostBodySchema.safeParse(json);
  if (!parsed.success) {
    chatDebug("reject: body validation", parsed.error.flatten());
    return Response.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { messages, context: validatedContext } = parsed.data;
  chatDebug("request", {
    ip,
    messageCount: messages.length,
    lastRole: messages[messages.length - 1]?.role,
    tasks: validatedContext.tasks.length,
    events: validatedContext.events.length,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const response = await callGeminiWithFallback({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contents: messages as any,
          config: {
            systemInstruction: buildSystemPrompt(validatedContext),
            tools: [{ functionDeclarations: poomoTools }],
          },
        });

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts) {
          chatDebug("empty candidate", {
            finishReason: candidate?.finishReason,
            finishMessage: candidate?.finishMessage,
            promptFeedback: response.promptFeedback,
            modelVersion: response.modelVersion,
          });
          send({ type: "error", message: GENERIC_ERROR });
        } else {
          const parts = candidate.content.parts as ContentPart[];
          const fnCalls = parts.filter((p) => p.functionCall);

          const textFromModel = parts
            .filter((p) => !p.functionCall)
            .map((p) => p.text ?? "")
            .join("");

          if (fnCalls.length === 0) {
            if (textFromModel) {
              send({ type: "text_delta", content: textFromModel });
            }
          } else {
            if (textFromModel.trim()) {
              const suffix = /\s$/.test(textFromModel) ? "" : " ";
              send({
                type: "text_delta",
                content: textFromModel + suffix,
              });
            }

            const actions: ChatAction[] = [];
            let widgetType: string | null = null;
            for (const part of fnCalls) {
              const fc = part.functionCall;
              if (!fc?.name) continue;
              const { name, args } = fc;
              if (!MUTATION_TOOLS.has(name)) continue;

              const validated = parseChatAction({
                tool: name,
                args: (args as Record<string, unknown>) ?? {},
              });
              if (!validated) continue;

              actions.push({
                tool: validated.tool,
                args: validated.args as unknown as Record<string, unknown>,
              });
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
              chatDebug("stream actions", {
                count: actions.length,
                tools: actions.map((a) => a.tool),
              });
            }

            if (widgetType) {
              send({ type: "widget", widget: widgetType });
            }
          }
        }
      } catch (error) {
        console.error("[chat] stream error:", error);
        chatDebug("stream error detail", {
          status: error instanceof ApiError ? error.status : undefined,
          message: error instanceof Error ? error.message : String(error),
        });
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
