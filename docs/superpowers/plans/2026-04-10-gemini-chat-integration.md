# Gemini Chat Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Google Gemini into the Poomo AI chat so users can control timers, create tasks, schedule events, and query stats through natural language.

**Architecture:** A single Next.js API route runs the Gemini conversation loop (including function calls) server-side, streaming text back via SSE. Mutation actions are returned as a structured payload for the client to execute against Zustand stores. All data stays in localStorage.

**Tech Stack:** Next.js 15 App Router, `@google/genai` SDK, Zustand, Server-Sent Events, localStorage.

---

### Task 1: Install Dependency and Add Storage Key

**Files:**
- Modify: `frontend/package.json` (dependency added via npm)
- Modify: `frontend/lib/constants.ts:12-17`

- [ ] **Step 1: Install the Google GenAI SDK**

Run from the `frontend/` directory:

```bash
npm install @google/genai
```

Expected: `@google/genai` appears in `frontend/package.json` under `dependencies`.

- [ ] **Step 2: Add chat history storage key**

In `frontend/lib/constants.ts`, add the `CHAT_HISTORY` key to `STORAGE_KEYS`:

```typescript
export const STORAGE_KEYS = {
  KANBAN: "poomo-kanban",
  CALENDAR: "poomo-calendar",
  SESSIONS: "poomo-sessions",
  DAILY_GOAL: "poomo-daily-goal",
  CHAT_HISTORY: "poomo-chat-history",
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/lib/constants.ts
git commit -m "feat: add @google/genai dependency and chat storage key"
```

---

### Task 2: Tool Declarations

**Files:**
- Create: `frontend/lib/ai/tools.ts`

This file defines the function declarations Gemini uses to decide which tools to call. It's used by the API route.

- [ ] **Step 1: Create `frontend/lib/ai/tools.ts`**

```typescript
import { Type, type FunctionDeclaration } from "@google/genai";

export const poomoTools: FunctionDeclaration[] = [
  {
    name: "start_timer",
    description: "Start a Pomodoro focus timer, short break, or long break",
    parameters: {
      type: Type.OBJECT,
      properties: {
        phase: {
          type: Type.STRING,
          description: "The timer phase to start",
          enum: ["WORK", "BREAK_SHORT", "BREAK_LONG"],
        },
        minutes: {
          type: Type.NUMBER,
          description:
            "Custom duration in minutes. Omit to use the user's default duration.",
        },
      },
      required: ["phase"],
    },
  },
  {
    name: "pause_timer",
    description: "Pause the currently running timer",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "reset_timer",
    description: "Reset the timer back to idle state",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "create_task",
    description: "Create a new task on the kanban board",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Task title",
        },
        description: {
          type: Type.STRING,
          description: "Optional task description",
        },
        column: {
          type: Type.STRING,
          description: "Which kanban column to add the task to. Defaults to Todo.",
          enum: ["Todo", "Ongoing", "Done"],
        },
        due_date: {
          type: Type.STRING,
          description: "Optional due date in YYYY-MM-DD format",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "schedule_event",
    description: "Create a new calendar event",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Event title",
        },
        description: {
          type: Type.STRING,
          description: "Optional event description",
        },
        start: {
          type: Type.STRING,
          description: "Event start time in ISO 8601 format",
        },
        end: {
          type: Type.STRING,
          description: "Event end time in ISO 8601 format",
        },
        all_day: {
          type: Type.BOOLEAN,
          description: "Whether this is an all-day event. Defaults to false.",
        },
      },
      required: ["title", "start", "end"],
    },
  },
  {
    name: "get_tasks",
    description:
      "Get all tasks from the kanban board to see what the user is working on",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "get_stats",
    description: "Get the user's focus session statistics",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description: "Time period for stats. Defaults to today.",
          enum: ["today", "week", "all"],
        },
      },
    },
  },
];

export interface ChatAction {
  tool: string;
  args: Record<string, unknown>;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to `lib/ai/tools.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/ai/tools.ts
git commit -m "feat: add Gemini function declarations for Poomo tools"
```

---

### Task 3: API Route — Gemini Conversation Loop with SSE

**Files:**
- Create: `frontend/app/api/chat/route.ts`

This is the core of the integration. It receives messages + app context, runs the Gemini function-call loop, and streams text back via SSE.

- [ ] **Step 1: Create `frontend/app/api/chat/route.ts`**

```typescript
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
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to `app/api/chat/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/chat/route.ts
git commit -m "feat: add /api/chat route with Gemini function-call loop and SSE"
```

---

### Task 4: Context Builder

**Files:**
- Create: `frontend/lib/ai/context.ts`

Reads from all Zustand stores and builds the context snapshot sent with each chat request.

- [ ] **Step 1: Create `frontend/lib/ai/context.ts`**

```typescript
import { useTimer } from "@/stores/timerStore";
import { useKanban } from "@/stores/kanbanStore";
import { useCalendar } from "@/stores/calendarStore";
import { useStats } from "@/stores/statsStore";

export interface AppContext {
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

export function buildContext(): AppContext {
  const kanban = useKanban.getState();
  const timer = useTimer.getState();
  const calendar = useCalendar.getState();
  const stats = useStats.getState();

  const columnMap = new Map(kanban.columns.map((c) => [c.id, c.title]));

  const streaks = stats.getStreaks();
  const lifetime = stats.getLifetimeStats();

  return {
    tasks: kanban.tasks.map((t) => ({
      title: t.title,
      column: columnMap.get(t.column_id) ?? "Unknown",
      due_date: t.due_date,
      description: t.description,
    })),
    events: calendar.events.map((e) => ({
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
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/ai/context.ts
git commit -m "feat: add context builder for Gemini chat requests"
```

---

### Task 5: Action Executor

**Files:**
- Create: `frontend/lib/ai/executor.ts`

Receives mutation actions from the API and executes them against Zustand stores.

- [ ] **Step 1: Create `frontend/lib/ai/executor.ts`**

```typescript
import { toast } from "sonner";
import { useTimer } from "@/stores/timerStore";
import { useKanban } from "@/stores/kanbanStore";
import { useCalendar } from "@/stores/calendarStore";
import type { ChatAction } from "@/lib/ai/tools";

export async function executeAction(action: ChatAction): Promise<void> {
  const { tool, args } = action;

  try {
    switch (tool) {
      case "start_timer": {
        const phase = args.phase as "WORK" | "BREAK_SHORT" | "BREAK_LONG";
        const minutes = args.minutes as number | undefined;
        useTimer.getState().start(phase, minutes);
        toast.success(
          `Timer started: ${phase === "WORK" ? "Focus" : phase === "BREAK_SHORT" ? "Short break" : "Long break"}`,
        );
        break;
      }

      case "pause_timer":
        useTimer.getState().pause();
        toast.success("Timer paused");
        break;

      case "reset_timer":
        useTimer.getState().reset();
        toast.success("Timer reset");
        break;

      case "create_task": {
        const kanban = useKanban.getState();
        const targetTitle = (args.column as string) ?? "Todo";
        const column = kanban.columns.find((c) => c.title === targetTitle);
        if (!column) {
          toast.error(`Column "${targetTitle}" not found`);
          return;
        }

        await kanban.addTask(column.id, {
          title: args.title as string,
          description: args.description as string | undefined,
          due_date: args.due_date as string | undefined,
        });
        toast.success(`Task created: ${args.title}`);
        break;
      }

      case "schedule_event": {
        await useCalendar.getState().addEvent({
          title: args.title as string,
          description: (args.description as string) ?? null,
          start: args.start as string,
          end: args.end as string,
          all_day: (args.all_day as boolean) ?? false,
          color: null,
        });
        toast.success(`Event scheduled: ${args.title}`);
        break;
      }

      default:
        console.warn(`Unknown action tool: ${tool}`);
    }
  } catch (error) {
    console.error(`Failed to execute action ${tool}:`, error);
    toast.error(`Failed to execute: ${tool}`);
  }
}

export async function executeActions(actions: ChatAction[]): Promise<void> {
  for (const action of actions) {
    await executeAction(action);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/ai/executor.ts
git commit -m "feat: add client-side action executor for AI chat"
```

---

### Task 6: Chat Storage

**Files:**
- Create: `frontend/lib/ai/chatStorage.ts`

Persists chat history in localStorage so conversations survive page reloads.

- [ ] **Step 1: Create `frontend/lib/ai/chatStorage.ts`**

```typescript
import { readJSON, writeJSON } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 50;

export function loadChatHistory(): ChatMessage[] {
  return readJSON<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY, []);
}

export function saveChatHistory(messages: ChatMessage[]): void {
  const trimmed = messages.slice(-MAX_MESSAGES);
  writeJSON(STORAGE_KEYS.CHAT_HISTORY, trimmed);
}

export function clearChatHistory(): void {
  writeJSON(STORAGE_KEYS.CHAT_HISTORY, []);
}

export function toGeminiMessages(
  messages: ChatMessage[],
): { role: string; parts: { text: string }[] }[] {
  return messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/ai/chatStorage.ts
git commit -m "feat: add chat history persistence for AI chat"
```

---

### Task 7: useChat Hook

**Files:**
- Create: `frontend/hooks/useChat.ts`

Manages chat state, sends messages to the API, processes the SSE stream, and triggers action execution.

- [ ] **Step 1: Create `frontend/hooks/useChat.ts`**

```typescript
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  loadChatHistory,
  saveChatHistory,
  clearChatHistory as clearStorage,
  toGeminiMessages,
  type ChatMessage,
} from "@/lib/ai/chatStorage";
import { buildContext } from "@/lib/ai/context";
import { executeActions } from "@/lib/ai/executor";
import type { ChatAction } from "@/lib/ai/tools";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setMessages(loadChatHistory());
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => {
        const next = [...prev, userMsg, assistantMsg];
        saveChatHistory(next);
        return next;
      });

      setIsStreaming(true);
      abortRef.current = new AbortController();

      try {
        const allMessages = [...messages, userMsg];
        const geminiMessages = toGeminiMessages(allMessages);
        const context = buildContext();

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: geminiMessages, context }),
          signal: abortRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let pendingActions: ChatAction[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data: ")) continue;
            const payload = trimmedLine.slice(6);

            if (payload === "[DONE]") continue;

            try {
              const event = JSON.parse(payload) as
                | { type: "text_delta"; content: string }
                | { type: "actions"; actions: ChatAction[] }
                | { type: "error"; message: string };

              if (event.type === "text_delta") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + event.content,
                    };
                  }
                  return updated;
                });
              } else if (event.type === "actions") {
                pendingActions = event.actions;
              } else if (event.type === "error") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: event.message,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        if (pendingActions.length > 0) {
          await executeActions(pendingActions);
        }

        setMessages((prev) => {
          saveChatHistory(prev);
          return prev;
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: "Sorry, something went wrong. Please try again.",
            };
          }
          saveChatHistory(updated);
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming],
  );

  const clearHistory = useCallback(() => {
    clearStorage();
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, clearHistory };
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to `hooks/useChat.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/hooks/useChat.ts
git commit -m "feat: add useChat hook with SSE streaming and action execution"
```

---

### Task 8: Update ChatView

**Files:**
- Modify: `frontend/components/chat/ChatView.tsx`

Replace the placeholder chat with the real Gemini-powered implementation. The existing UI structure (message bubbles, input bar, typing indicator, suggestions) stays — we wire it to `useChat()`.

- [ ] **Step 1: Replace the full contents of `frontend/components/chat/ChatView.tsx`**

```typescript
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendHorizontal, Bot, User, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import type { ChatMessage } from "@/lib/ai/chatStorage";

const SUGGESTIONS = [
  "Start a focus session",
  "What's on my todo list?",
  "Schedule a study session tomorrow at 3pm",
];

function InputBar({
  input,
  disabled,
  textareaRef,
  onSend,
  onChange,
  onKeyDown,
}: {
  input: string;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onSend: () => void;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-end gap-2 border-2 border-border bg-white rounded-2xl px-3 py-2 shadow-[3px_3px_0_black]">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none py-1 disabled:opacity-50"
        />
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="filled"
            size="icon"
            onClick={onSend}
            disabled={!input.trim() || disabled}
            className="shrink-0 size-8 rounded-xl"
          >
            <SendHorizontal className="size-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const showCursor = !isUser && isStreaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`size-7 rounded-full border-2 border-border flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0_black] ${
          isUser ? "bg-primary text-white" : "bg-white"
        }`}
      >
        {isUser ? (
          <User className="size-3.5" />
        ) : (
          <Bot className="size-3.5" />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl border-2 border-border px-4 py-2.5 text-sm leading-relaxed shadow-[2px_2px_0_black] ${
          isUser ? "bg-primary text-white" : "bg-white text-foreground"
        }`}
      >
        {message.content || "\u00A0"}
        {showCursor && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-foreground ml-0.5 align-text-bottom"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "steps(2)" }}
          />
        )}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex gap-2.5"
    >
      <div className="size-7 rounded-full border-2 border-border flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0_black] bg-white">
        <Bot className="size-3.5" />
      </div>
      <div className="rounded-2xl border-2 border-border px-4 py-3 bg-white shadow-[2px_2px_0_black] flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-muted-foreground"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function ChatView() {
  const { messages, isStreaming, sendMessage, clearHistory } = useChat();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    sendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    },
    [],
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  const hasMessages = messages.length > 0;
  const showTyping =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant" &&
    !messages[messages.length - 1]?.content;

  return (
    <AnimatePresence mode="wait">
      {!hasMessages ? (
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col items-center justify-center min-h-0 px-4 gap-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="size-14 rounded-2xl bg-primary/10 border-2 border-border shadow-[3px_3px_0_black] flex items-center justify-center">
              <Sparkles className="size-7 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">Poomo AI</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your productivity assistant — start timers, add tasks, check
                stats
              </p>
            </div>
          </motion.div>

          <InputBar
            input={input}
            disabled={isStreaming}
            textareaRef={textareaRef}
            onSend={handleSend}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
          />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {SUGGESTIONS.map((s) => (
              <motion.button
                key={s}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSuggestion(s)}
                className="border-2 border-border rounded-full px-4 py-1.5 text-sm font-medium bg-white shadow-[2px_2px_0_black] hover:bg-secondary hover:text-secondary-foreground active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-colors cursor-pointer"
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="chat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="flex items-center justify-end px-4 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="text-xs text-muted-foreground gap-1"
            >
              <Trash2 className="size-3" />
              Clear chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto flex flex-col gap-4 p-4 sm:p-6 pb-4">
              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1;
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isStreaming={isLast && isStreaming}
                  />
                );
              })}
              <AnimatePresence>{showTyping && <TypingIndicator />}</AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-border/20 bg-background p-4">
            <InputBar
              input={input}
              disabled={isStreaming}
              textareaRef={textareaRef}
              onSend={handleSend}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Key changes from original:**
- `useChat()` hook replaces local `useState`/`setTimeout` logic
- `MessageBubble` shows a blinking cursor during streaming
- `TypingIndicator` shows only while waiting for first content
- Input is disabled during streaming
- Suggestions are actionable ("Start a focus session", etc.)
- "AI features coming soon" removed
- "Clear chat" button added to reset conversation
- `InputBar` accepts a `disabled` prop

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to `components/chat/ChatView.tsx`.

- [ ] **Step 3: Manual smoke test**

Start the dev server:

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000`. The chat view should load with the "Poomo AI" welcome screen and three suggestion chips. Try:
1. Type "Start a focus session" — should see typing indicator, then response, timer should start
2. Type "Add 'Read chapter 5' to my todo list" — should see response, task should appear on the board
3. Type "What's on my todo list?" — should see response listing tasks
4. Type "How many focus sessions today?" — should see stats response
5. Click "Clear chat" — should reset to welcome screen

- [ ] **Step 4: Commit**

```bash
git add frontend/components/chat/ChatView.tsx
git commit -m "feat: wire ChatView to Gemini AI with streaming and function calling"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run the full TypeScript check**

```bash
cd frontend && npx tsc --noEmit --pretty
```

Expected: No errors.

- [ ] **Step 2: Run the linter**

```bash
cd frontend && npm run lint
```

Expected: No new errors.

- [ ] **Step 3: Test the full flow end-to-end**

With the dev server running (`npm run dev` in `frontend/`):

1. Open `http://localhost:3000` (chat page)
2. Send: "Start a 30 minute focus session" → timer should start, response confirms
3. Navigate to Timer page → verify timer is running at ~30 minutes
4. Go back to Chat → send: "Add 'Finish homework' to my todo list, due Friday" → response confirms
5. Navigate to Board page → verify "Finish homework" task exists in Todo column with correct due date
6. Go back to Chat → send: "Schedule a meeting tomorrow at 2pm to 3pm" → response confirms
7. Navigate to Calendar page → verify event exists
8. Go back to Chat → send: "How many focus sessions have I done today?" → response shows stats
9. Click "Clear chat" → conversation resets
10. Reload page → chat should be empty (cleared)
11. Send a new message → have a conversation → reload page → conversation persists

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues from end-to-end testing"
```

(Skip this step if no fixes were needed.)
