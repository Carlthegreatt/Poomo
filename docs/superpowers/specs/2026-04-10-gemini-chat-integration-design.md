# Gemini Chat Integration — Design Spec

## Overview

Integrate Google Gemini into Poomo's existing placeholder chat UI so users can control the app through natural language — starting timers, creating tasks, scheduling events, querying stats, and getting productivity advice.

## Architecture: Hybrid Server Loop + Client Actions

A single Next.js API route (`POST /api/chat`) owns the Gemini conversation, including the multi-turn function-call loop. The client makes one request per user message and receives a Server-Sent Events stream back.

### Why this approach

- **Single client round-trip** — the server resolves Gemini's function-call loop internally (potentially 2–3 Gemini round-trips), so the client never has to relay function call results.
- **Data stays in the browser** — all persistence is localStorage. The server can't mutate it directly, so mutation tools return structured "actions" for the client to execute against Zustand stores.
- **Read-only tools resolve on the server** — the client sends a context snapshot (tasks, events, timer state, stats) with each request. The server uses this to answer Gemini's read-only function calls without another client round-trip.

### Request format

```typescript
interface ChatRequest {
  messages: GeminiMessage[];
  context: {
    tasks: { title: string; column: string; due_date: string | null; description: string | null }[];
    events: { title: string; start: string; end: string; all_day: boolean }[];
    timer: { phase: string; isRunning: boolean; remainingMs: number };
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
  };
}
```

### Response format (SSE stream)

```
data: {"type":"text_delta","content":"Started"}
data: {"type":"text_delta","content":" a 25-minute"}
data: {"type":"text_delta","content":" focus session!"}
data: {"type":"actions","actions":[{"tool":"start_timer","args":{"phase":"WORK","minutes":25}}]}
data: [DONE]
```

Events:
- `text_delta` — incremental text for the assistant's response
- `actions` — array of mutation actions for the client to execute (sent once, before `[DONE]`)
- `error` — error message if something goes wrong
- `[DONE]` — stream complete

### Server-side conversation loop

1. Receive request, build Gemini `contents` from `messages`
2. Inject system instruction with today's date and tool context
3. Call `generateContent` (non-streaming) with function declarations
4. If Gemini returns `functionCall` parts:
   - Read-only tools (`get_tasks`, `get_stats`): resolve from the `context` payload
   - Mutation tools (`start_timer`, `create_task`, `schedule_event`): collect into `actions` array, return a synthetic success response to Gemini
5. Send function results back to Gemini, repeat from step 3 (non-streaming)
6. Max 5 loop iterations to prevent runaway loops
7. Once the loop resolves (Gemini returns text instead of function calls): make one final call using `generateContentStream` with the full conversation to stream the text response via SSE, append the `actions` event, send `[DONE]`

Note: the function-call loop uses non-streaming `generateContent` because we need the full response to detect function calls. Only the final text response is streamed.

## Tool Declarations

### Mutation tools

#### `start_timer`
Starts a Pomodoro focus timer, short break, or long break.

Parameters:
- `phase` (required, enum): `WORK` | `BREAK_SHORT` | `BREAK_LONG`
- `minutes` (optional, number): Custom duration. Omit to use the user's default.

#### `pause_timer`
Pauses the currently running timer. No parameters.

#### `reset_timer`
Resets the timer back to idle. No parameters.

#### `create_task`
Creates a new task on the kanban board.

Parameters:
- `title` (required, string): Task title
- `description` (optional, string): Task description
- `column` (optional, enum): `Todo` | `Ongoing` | `Done` — defaults to `Todo`
- `due_date` (optional, string): Due date in ISO 8601 format (YYYY-MM-DD)

#### `schedule_event`
Creates a calendar event.

Parameters:
- `title` (required, string): Event title
- `description` (optional, string): Event description
- `start` (required, string): Start time in ISO 8601 format
- `end` (required, string): End time in ISO 8601 format
- `all_day` (optional, boolean): Whether this is an all-day event, defaults to false

### Read-only tools

#### `get_tasks`
Returns all kanban tasks with their column name, due date, and description. No parameters. Resolved from client context.

#### `get_stats`
Returns focus session statistics.

Parameters:
- `period` (optional, enum): `today` | `week` | `month` | `all` — defaults to `today`

Returns: session count, total focus time in minutes, average session length, tasks worked on.

## Client-Side Components

### Action Executor (`lib/ai/executor.ts`)

Maps action tool names to store/lib calls:

| Tool | Execution |
|------|-----------|
| `start_timer` | `useTimer.getState().start(phase, minutes)` |
| `pause_timer` | `useTimer.getState().pause()` |
| `reset_timer` | `useTimer.getState().reset()` |
| `create_task` | `createTask()` from `lib/kanban.ts` → `useKanban.getState().load()` |
| `schedule_event` | `createEvent()` from `lib/calendar.ts` → `useCalendar.getState().load()` |

Each execution is wrapped in try/catch. Failures log to console and show a sonner toast. The streamed text still displays regardless.

### Context Builder (`lib/ai/context.ts`)

Reads from Zustand stores to build the context snapshot sent with each request:
- `useKanban.getState()` → tasks with column names
- `useTimer.getState()` → phase, isRunning, remainingMs
- `useCalendar.getState()` → events
- `useStats.getState()` → recent focus sessions

### Chat Hook (`hooks/useChat.ts`)

Manages conversation state:

- **State**: `messages`, `isStreaming`
- **`sendMessage(text)`**: builds context via `buildContext()`, POSTs to `/api/chat`, processes SSE stream (appends text deltas to current assistant message, executes actions on `actions` event)
- **`clearHistory()`**: resets messages and clears localStorage
- **Persistence**: loads from localStorage on mount, saves after each completed exchange
- **Message cap**: stores last 50 messages to keep context and storage bounded

### Chat Persistence (`lib/ai/chatStorage.ts`)

Read/write under localStorage key `poomo-chat-history`. Stores only `role` and `content` — no function call internals. Messages sent to Gemini are rebuilt from this stored history.

## ChatView Changes

### Modified: `components/chat/ChatView.tsx`

- Replace fake `setTimeout` typing logic with `useChat()` hook
- Streaming: assistant message grows as `text_delta` events arrive; blinking cursor while `isStreaming` is true
- Action confirmation via sonner toasts (already used throughout the app)
- Remove "AI features coming soon" footer
- Update suggestion chips to actionable examples:
  - "Start a focus session"
  - "What's on my todo list?"
  - "Schedule a study session tomorrow at 3pm"

### Modified: `lib/constants.ts`

Add `CHAT_HISTORY: "poomo-chat-history"` to `STORAGE_KEYS`.

## Error Handling

- **Gemini API errors** (rate limit, invalid key, network): SSE `error` event with user-friendly message. Hook appends as an assistant message.
- **Action execution errors**: caught in executor, sonner toast shown, streamed text still displays.
- **Gemini safety filters**: server catches blocked responses, sends `error` event with friendly message.
- **Max loop guard**: function-call loop capped at 5 iterations.
- **Missing API key**: route returns 500 with clear error before attempting any Gemini call.

## New Files

| File | Purpose |
|------|---------|
| `app/api/chat/route.ts` | API route — Gemini loop, SSE streaming |
| `lib/ai/tools.ts` | Function declarations (shared schema) |
| `lib/ai/executor.ts` | Client-side action executor |
| `lib/ai/context.ts` | Builds app state snapshot |
| `lib/ai/chatStorage.ts` | localStorage persistence for chat |
| `hooks/useChat.ts` | Chat state management hook |

## Modified Files

| File | Change |
|------|--------|
| `components/chat/ChatView.tsx` | Wire real AI, streaming, updated suggestions |
| `lib/constants.ts` | Add `CHAT_HISTORY` storage key |

## Dependencies

- `@google/genai` — official Google GenAI SDK

## Out of Scope (future follow-ups)

- Delete/move/update tasks via chat (destructive actions)
- Delete/update calendar events via chat
- Markdown rendering in assistant messages
- Multi-modal input (images, voice)
- Conversation branching or editing past messages
