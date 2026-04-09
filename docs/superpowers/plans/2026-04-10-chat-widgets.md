# Chat Inline Widgets & Profile Icon Removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live mini-widgets (timer, board, calendar, stats) to assistant chat messages and remove profile icon avatars from the chat UI.

**Architecture:** Extend `ChatMessage` with an optional `widget` field. The intent system and SSE stream set this field on assistant messages. `MessageBubble` renders the matching widget component below the text. Four widget components read live data from Zustand stores and navigate to their feature page on click.

**Tech Stack:** React, Next.js App Router, Zustand, Framer Motion, Lucide Icons, Tailwind CSS

---

### Task 1: Extend ChatMessage Data Model

**Files:**
- Modify: `frontend/lib/ai/chatStorage.ts`

- [ ] **Step 1: Add `widget` field to `ChatMessage` interface**

In `frontend/lib/ai/chatStorage.ts`, change the interface:

```typescript
export type WidgetType = "timer" | "board" | "calendar" | "stats";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  widget?: WidgetType;
}
```

Add the `WidgetType` export above the `ChatMessage` interface. No other changes to this file.

- [ ] **Step 2: Verify the app compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds (the new optional field is backward-compatible with existing stored messages).

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/ai/chatStorage.ts
git commit -m "feat: add widget field to ChatMessage type"
```

---

### Task 2: Remove Profile Icons from Chat

**Files:**
- Modify: `frontend/components/chat/ChatView.tsx`

- [ ] **Step 1: Remove avatar from `MessageBubble`**

In `frontend/components/chat/ChatView.tsx`, replace the entire `MessageBubble` function (lines 60–103) with:

```tsx
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
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl border-2 border-border px-4 py-2.5 text-sm leading-relaxed shadow-[2px_2px_0_black] ${
          isUser ? "bg-primary text-white" : "bg-white text-foreground"
        }`}
      >
        {message.content || "\u00A0"}
        {showCursor && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-foreground ml-0.5 align-text-bottom"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
          />
        )}
      </div>
    </motion.div>
  );
}
```

Key changes: removed the avatar `div` entirely, changed outer flex from `gap-2.5` + `flex-row-reverse` to `justify-end`/`justify-start`.

- [ ] **Step 2: Remove avatar from `TypingIndicator`**

Replace the entire `TypingIndicator` function (lines 106–133) with:

```tsx
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex justify-start"
    >
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
```

- [ ] **Step 3: Remove unused icon imports**

In the imports at the top of `ChatView.tsx`, change:

```typescript
import { SendHorizontal, Bot, User, Sparkles, Trash2 } from "lucide-react";
```

to:

```typescript
import { SendHorizontal, Sparkles, Trash2 } from "lucide-react";
```

Remove `Bot` and `User` since they are no longer used.

- [ ] **Step 4: Verify the app compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/chat/ChatView.tsx
git commit -m "feat: remove profile icons from chat messages"
```

---

### Task 3: Create TimerWidget

**Files:**
- Create: `frontend/components/chat/widgets/TimerWidget.tsx`

- [ ] **Step 1: Create the TimerWidget component**

Create `frontend/components/chat/widgets/TimerWidget.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Timer, ArrowRight } from "lucide-react";
import { useTimer } from "@/stores/timerStore";

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
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TimerWidget() {
  const router = useRouter();
  const { phase, isRunning, remainingMs } = useTimer();
  const label = PHASE_LABELS[phase] ?? phase;

  return (
    <button
      onClick={() => router.push("/timer")}
      className="mt-2 w-full flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-[2px_2px_0_black] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-[2px_3px_0_black] text-left"
    >
      <div className="size-8 rounded-lg bg-primary/10 border border-border flex items-center justify-center shrink-0">
        <Timer className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">
          {phase === "IDLE"
            ? "Ready to start"
            : `${formatMs(remainingMs)} ${isRunning ? "remaining" : "paused"}`}
        </p>
      </div>
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        Open <ArrowRight className="size-3" />
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/chat/widgets/TimerWidget.tsx
git commit -m "feat: add TimerWidget for chat inline display"
```

---

### Task 4: Create BoardWidget

**Files:**
- Create: `frontend/components/chat/widgets/BoardWidget.tsx`

- [ ] **Step 1: Create the BoardWidget component**

Create `frontend/components/chat/widgets/BoardWidget.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { LayoutList, ArrowRight } from "lucide-react";
import { useKanban } from "@/stores/kanbanStore";

export function BoardWidget() {
  const router = useRouter();
  const { columns, tasks } = useKanban();

  const summary =
    tasks.length === 0
      ? "No tasks yet"
      : columns
          .map((col) => {
            const count = tasks.filter((t) => t.column_id === col.id).length;
            return count > 0 ? `${col.title}: ${count}` : null;
          })
          .filter(Boolean)
          .join(" · ");

  return (
    <button
      onClick={() => router.push("/board")}
      className="mt-2 w-full flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-[2px_2px_0_black] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-[2px_3px_0_black] text-left"
    >
      <div className="size-8 rounded-lg bg-primary/10 border border-border flex items-center justify-center shrink-0">
        <LayoutList className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Board</p>
        <p className="text-xs text-muted-foreground truncate">{summary}</p>
      </div>
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        Open <ArrowRight className="size-3" />
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/chat/widgets/BoardWidget.tsx
git commit -m "feat: add BoardWidget for chat inline display"
```

---

### Task 5: Create CalendarWidget

**Files:**
- Create: `frontend/components/chat/widgets/CalendarWidget.tsx`

- [ ] **Step 1: Create the CalendarWidget component**

Create `frontend/components/chat/widgets/CalendarWidget.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, ArrowRight } from "lucide-react";
import { useCalendar } from "@/stores/calendarStore";

export function CalendarWidget() {
  const router = useRouter();
  const { events } = useCalendar();

  const now = new Date().toISOString();
  const upcoming = events
    .filter((e) => e.end >= now)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);

  const summary =
    upcoming.length === 0
      ? "No upcoming events"
      : upcoming
          .map((e) => {
            const start = new Date(e.start);
            const time = e.all_day
              ? "all day"
              : start.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                });
            return `${e.title} (${time})`;
          })
          .join(" · ");

  return (
    <button
      onClick={() => router.push("/calendar")}
      className="mt-2 w-full flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-[2px_2px_0_black] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-[2px_3px_0_black] text-left"
    >
      <div className="size-8 rounded-lg bg-primary/10 border border-border flex items-center justify-center shrink-0">
        <CalendarDays className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Calendar</p>
        <p className="text-xs text-muted-foreground truncate">{summary}</p>
      </div>
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        Open <ArrowRight className="size-3" />
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/chat/widgets/CalendarWidget.tsx
git commit -m "feat: add CalendarWidget for chat inline display"
```

---

### Task 6: Create StatsWidget

**Files:**
- Create: `frontend/components/chat/widgets/StatsWidget.tsx`

- [ ] **Step 1: Create the StatsWidget component**

Create `frontend/components/chat/widgets/StatsWidget.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { BarChart3, ArrowRight } from "lucide-react";
import { useStats } from "@/stores/statsStore";

export function StatsWidget() {
  const router = useRouter();
  const todayCount = useStats((s) => s.getTodayCount());
  const todayMinutes = useStats((s) => s.getTodayMinutes());
  const streaks = useStats((s) => s.getStreaks());

  const summary = `${todayCount} session${todayCount !== 1 ? "s" : ""} · ${todayMinutes}min today · ${streaks.current}d streak`;

  return (
    <button
      onClick={() => router.push("/stats")}
      className="mt-2 w-full flex items-center gap-3 rounded-xl border-2 border-border bg-background p-3 shadow-[2px_2px_0_black] cursor-pointer transition-transform hover:translate-y-[-1px] hover:shadow-[2px_3px_0_black] text-left"
    >
      <div className="size-8 rounded-lg bg-primary/10 border border-border flex items-center justify-center shrink-0">
        <BarChart3 className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">Stats</p>
        <p className="text-xs text-muted-foreground truncate">{summary}</p>
      </div>
      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
        Open <ArrowRight className="size-3" />
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/chat/widgets/StatsWidget.tsx
git commit -m "feat: add StatsWidget for chat inline display"
```

---

### Task 7: Wire Widgets into MessageBubble

**Files:**
- Modify: `frontend/components/chat/ChatView.tsx`

- [ ] **Step 1: Add widget imports and WidgetRenderer**

At the top of `frontend/components/chat/ChatView.tsx`, add these imports (alongside the existing ones):

```typescript
import { TimerWidget } from "@/components/chat/widgets/TimerWidget";
import { BoardWidget } from "@/components/chat/widgets/BoardWidget";
import { CalendarWidget } from "@/components/chat/widgets/CalendarWidget";
import { StatsWidget } from "@/components/chat/widgets/StatsWidget";
import type { WidgetType } from "@/lib/ai/chatStorage";
```

Then add this component before `MessageBubble`:

```tsx
function WidgetRenderer({ type }: { type: WidgetType }) {
  switch (type) {
    case "timer":
      return <TimerWidget />;
    case "board":
      return <BoardWidget />;
    case "calendar":
      return <CalendarWidget />;
    case "stats":
      return <StatsWidget />;
    default:
      return null;
  }
}
```

- [ ] **Step 2: Render widget inside MessageBubble**

In the `MessageBubble` function, after the text content and streaming cursor, add the widget renderer. Replace the inner `<div>` (the bubble) with:

```tsx
      <div
        className={`max-w-[75%] rounded-2xl border-2 border-border px-4 py-2.5 text-sm leading-relaxed shadow-[2px_2px_0_black] ${
          isUser ? "bg-primary text-white" : "bg-white text-foreground"
        }`}
      >
        {message.content || "\u00A0"}
        {showCursor && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-foreground ml-0.5 align-text-bottom"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
          />
        )}
        {!isUser && message.widget && <WidgetRenderer type={message.widget} />}
      </div>
```

The only new line is `{!isUser && message.widget && <WidgetRenderer type={message.widget} />}`.

- [ ] **Step 3: Verify the app compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/chat/ChatView.tsx
git commit -m "feat: render inline widgets in chat message bubbles"
```

---

### Task 8: Add Widget Field to Intent System

**Files:**
- Modify: `frontend/lib/ai/intents.ts`

- [ ] **Step 1: Add `widget` to intent interfaces and IntentMatch**

In `frontend/lib/ai/intents.ts`, add the import at the top:

```typescript
import type { WidgetType } from "@/lib/ai/chatStorage";
```

Change the `ActionIntent` interface to:

```typescript
interface ActionIntent {
  type: "action";
  pattern: RegExp;
  action: ChatAction;
  response: string;
  widget: WidgetType;
}
```

Change the `ReadIntent` interface to:

```typescript
interface ReadIntent {
  type: "read";
  pattern: RegExp;
  resolve: () => string;
  widget: WidgetType;
}
```

Change the `IntentMatch` interface to:

```typescript
export interface IntentMatch {
  response: string;
  execute: () => Promise<void>;
  widget?: WidgetType;
}
```

- [ ] **Step 2: Add `widget` values to all ACTION_INTENTS**

Update every entry in the `ACTION_INTENTS` array to include a `widget` field. All timer-related intents get `widget: "timer"`:

```typescript
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
```

- [ ] **Step 3: Add `widget` values to all READ_INTENTS**

Update every entry in the `READ_INTENTS` array:

```typescript
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
```

- [ ] **Step 4: Pass `widget` through in `matchIntent`**

Update the return statements in `matchIntent` to include `widget`:

```typescript
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
```

- [ ] **Step 5: Verify the app compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/ai/intents.ts
git commit -m "feat: add widget type to all chat intents"
```

---

### Task 9: Wire Widget into useChat (Intent Path)

**Files:**
- Modify: `frontend/hooks/useChat.ts`

- [ ] **Step 1: Set `widget` on assistant message for intent matches**

In `frontend/hooks/useChat.ts`, find the intent-handling block inside `sendMessage` (around line 52–61):

```typescript
      if (intent) {
        const filled: ChatMessage = { ...assistantMsg, content: intent.response };
        setMessages((prev) => {
          const next = [...prev, userMsg, filled];
          saveChatHistory(next);
          return next;
        });
        await intent.execute();
        return;
      }
```

Replace it with:

```typescript
      if (intent) {
        const filled: ChatMessage = {
          ...assistantMsg,
          content: intent.response,
          widget: intent.widget,
        };
        setMessages((prev) => {
          const next = [...prev, userMsg, filled];
          saveChatHistory(next);
          return next;
        });
        await intent.execute();
        return;
      }
```

The only change is adding `widget: intent.widget` to the `filled` message.

- [ ] **Step 2: Verify the app compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/hooks/useChat.ts
git commit -m "feat: attach widget to assistant message on intent match"
```

---

### Task 10: Emit Widget SSE Event from Server

**Files:**
- Modify: `frontend/app/api/chat/route.ts`

- [ ] **Step 1: Add `TOOL_TO_WIDGET` mapping and emit widget event**

In `frontend/app/api/chat/route.ts`, add this constant after the `MUTATION_TOOLS` set (around line 162):

```typescript
const TOOL_TO_WIDGET: Record<string, string> = {
  start_timer: "timer",
  pause_timer: "timer",
  reset_timer: "timer",
  create_task: "board",
  schedule_event: "calendar",
};
```

Then, inside the `start(controller)` callback, find the block where function calls are processed (around line 308–326):

```typescript
          } else {
            const actions: ChatAction[] = [];
            for (const part of fnCalls) {
              const { name, args } = part.functionCall as {
                name: string;
                args: Record<string, unknown>;
              };
              if (MUTATION_TOOLS.has(name)) {
                actions.push({ tool: name, args });
              }
            }

            if (actions.length > 0) {
              const confirmation = buildConfirmation(actions);
              if (confirmation) {
                send({ type: "text_delta", content: confirmation });
              }
              send({ type: "actions", actions });
            }
          }
```

Replace it with:

```typescript
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
```

Changes: added `widgetType` variable, populated from first matching tool, and sent as a new `widget` SSE event after `actions`.

- [ ] **Step 2: Verify the app compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/api/chat/route.ts
git commit -m "feat: emit widget SSE event from chat API route"
```

---

### Task 11: Handle Widget SSE Event in useChat

**Files:**
- Modify: `frontend/hooks/useChat.ts`

- [ ] **Step 1: Add `widget` to the SSE event type union and handle it**

In `frontend/hooks/useChat.ts`, find the SSE event parsing block (around line 110–141). The current type union is:

```typescript
              const event = JSON.parse(payload) as
                | { type: "text_delta"; content: string }
                | { type: "actions"; actions: ChatAction[] }
                | { type: "error"; message: string };
```

Replace it with:

```typescript
              const event = JSON.parse(payload) as
                | { type: "text_delta"; content: string }
                | { type: "actions"; actions: ChatAction[] }
                | { type: "widget"; widget: string }
                | { type: "error"; message: string };
```

Then add a new handler after the `actions` handler and before the `error` handler:

```typescript
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
              } else if (event.type === "widget") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      widget: event.widget as ChatMessage["widget"],
                    };
                  }
                  return updated;
                });
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
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd frontend && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/hooks/useChat.ts
git commit -m "feat: handle widget SSE event in useChat hook"
```

---

### Task 12: Manual Verification

- [ ] **Step 1: Start the dev server**

Run: `cd frontend && npm run dev`

- [ ] **Step 2: Test intent-driven widgets**

Open the app at `http://localhost:3000`. In the chat, try these messages and verify each shows a live widget below the response text:

- "Start a focus session" → timer widget with live countdown, click navigates to `/timer`
- "What's on my todo list?" → board widget with task counts, click navigates to `/board`
- "Show my schedule" → calendar widget with upcoming events, click navigates to `/calendar`
- "How am I doing today?" → stats widget with session/streak info, click navigates to `/stats`

- [ ] **Step 3: Test that profile icons are gone**

Verify that neither user nor assistant messages show the round avatar icons. Messages should show as standalone bubbles aligned left (assistant) or right (user).

- [ ] **Step 4: Test persistence**

Refresh the page. Verify that previously sent messages with widgets still show the widget card on reload.

- [ ] **Step 5: Test Gemini path (if API key configured)**

Type a message that goes through the Gemini API (something the intents don't catch, like "Create a task called 'Read chapter 5'"). Verify the board widget appears in the assistant's response.
