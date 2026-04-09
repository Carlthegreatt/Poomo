import { GoogleGenAI } from "@google/genai";
import { poomoTools, type ChatAction } from "@/lib/ai/tools";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

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

function buildSystemPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  return [
    "You are Poomo AI, a friendly and concise productivity assistant inside a Pomodoro timer app called Poomo.",
    "You can start/pause/reset the user's focus timer, create tasks on their kanban board, schedule calendar events, and look up their focus stats.",
    "When the user asks you to do something actionable, use the available tools. Always confirm what you did after using a tool.",
    "Keep responses short — 1-3 sentences unless the user asks for detail.",
    `Today's date is ${today}.`,
  ].join(" ");
}

function resolveReadOnlyTool(
  name: string,
  args: Record<string, unknown>,
  context: AppContext,
): unknown {
  switch (name) {
    case "get_tasks":
      return { tasks: context.tasks };
    case "get_stats": {
      return {
        todayFocusSessions: context.stats.todayCount,
        todayFocusMinutes: context.stats.todayMinutes,
        thisWeekSessions: context.stats.thisWeekSessions,
        thisWeekMinutes: context.stats.thisWeekMinutes,
        totalSessions: context.stats.totalSessions,
        totalFocusMinutes: context.stats.totalFocusMinutes,
        currentStreak: context.stats.currentStreak,
        bestStreak: context.stats.bestStreak,
      };
    }
    default:
      return null;
  }
}

const MUTATION_TOOLS = new Set([
  "start_timer",
  "pause_timer",
  "reset_timer",
  "create_task",
  "schedule_event",
]);

const MAX_LOOP_ITERATIONS = 5;

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const { messages, context } = (await req.json()) as {
    messages: unknown[];
    context: AppContext;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let contents: any[] = [...messages];
        const actions: ChatAction[] = [];
        let iterations = 0;

        while (iterations < MAX_LOOP_ITERATIONS) {
          const response = await genai.models.generateContent({
            model: "gemini-2.0-flash",
            contents,
            config: {
              systemInstruction: buildSystemPrompt(),
              tools: [{ functionDeclarations: poomoTools }],
            },
          });

          const candidate = response.candidates?.[0];
          if (!candidate?.content?.parts) {
            send({ type: "error", message: "No response from AI. Please try again." });
            break;
          }

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
            break;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fnResponseParts: any[] = [];
          for (const part of fnCalls) {
            const { name, args } = part.functionCall as {
              name: string;
              args: Record<string, unknown>;
            };

            let result: unknown;
            if (MUTATION_TOOLS.has(name)) {
              actions.push({ tool: name, args });
              result = { success: true };
            } else {
              result = resolveReadOnlyTool(name, args, context);
              if (result === null) {
                result = { error: `Unknown tool: ${name}` };
              }
            }

            fnResponseParts.push({
              functionResponse: { name, response: result },
            });
          }

          contents = [
            ...contents,
            candidate.content,
            { role: "user", parts: fnResponseParts },
          ];

          iterations++;
        }

        if (actions.length > 0) {
          send({ type: "actions", actions });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Something went wrong";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message })}\n\n`,
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
