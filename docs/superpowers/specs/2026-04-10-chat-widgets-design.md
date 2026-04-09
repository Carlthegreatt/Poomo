# Chat Inline Widgets & Profile Icon Removal

**Date:** 2026-04-10
**Status:** Approved

## Overview

Add live, interactive mini-widgets to assistant chat messages when the conversation involves a specific app feature (timer, board, calendar, stats). Each widget shows real-time data from Zustand stores and navigates to the corresponding page on click. Also remove the User/Bot profile icon circles from all chat messages.

## Scope

Two changes:

1. **Remove profile icons** from `MessageBubble` and `TypingIndicator`
2. **Add inline widgets** to assistant messages — live data cards that link to feature pages

## Data Model

Extend `ChatMessage` with an optional `widget` field:

```typescript
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  widget?: "timer" | "board" | "calendar" | "stats";
}
```

- Persisted to localStorage with the message (widgets reappear on reload)
- `toGeminiMessages` ignores the field — it is client-only metadata, never sent to the AI
- Only assistant messages use the field; user messages leave it undefined

## Profile Icon Removal

Remove from `MessageBubble`:
- The 7×7 `rounded-full` avatar `div` containing the `User` or `Bot` Lucide icon
- The `gap-2.5` flex layout that spaces avatar + bubble (adjust to simple alignment)

Remove from `TypingIndicator`:
- The same bot avatar `div`

After removal:
- User messages still align right (`flex-row-reverse` on the row, or simply `ml-auto` on the bubble)
- Assistant messages still align left
- Bubbles keep their existing border/shadow/color styling

## Widget Components

Four components in `frontend/components/chat/widgets/`:

### TimerWidget

- **Store:** `useTimer`
- **Display:** Phase label (Focus / Short Break / Long Break / Idle), live countdown or "Ready" if idle, running/paused indicator
- **Link:** `/timer`

### BoardWidget

- **Store:** `useKanban`
- **Display:** Task count per column (e.g., "To Do: 3, In Progress: 2, Done: 5"), or "No tasks yet" if empty
- **Link:** `/board`

### CalendarWidget

- **Store:** `useCalendar`
- **Display:** Next 2–3 upcoming events with date/time, or "No upcoming events" if empty
- **Link:** `/calendar`

### StatsWidget

- **Store:** `useStats`
- **Display:** Today's sessions and minutes focused, current streak
- **Link:** `/stats`

### Shared Widget Style

All widgets share a consistent card appearance:

- Rendered below the message text, inside the assistant bubble area (separated by a small gap)
- Neo-brutalist card: `border-2 border-border`, `shadow-[2px_2px_0_black]`, `rounded-xl`
- Small icon + label header row (matching Lucide icon for each feature)
- Live data body
- Subtle "Open →" footer text
- Entire card is clickable via `useRouter().push()`
- `cursor-pointer` with a hover lift effect (`hover:translate-y-[-1px]`)

## Widget Rendering in MessageBubble

A `WidgetRenderer` component maps the widget type string to the correct component:

```typescript
function WidgetRenderer({ type }: { type: ChatMessage["widget"] }) {
  switch (type) {
    case "timer": return <TimerWidget />;
    case "board": return <BoardWidget />;
    case "calendar": return <CalendarWidget />;
    case "stats": return <StatsWidget />;
    default: return null;
  }
}
```

In `MessageBubble`, if `message.widget` is set and the message is from the assistant, render `<WidgetRenderer type={message.widget} />` below the text content.

## Widget Assignment Logic

Widgets are attached in two places:

### 1. Intent System (client-side, no API call)

Each intent in `intents.ts` gains a `widget` field on its definition:

| Intent category | Widget value |
|---|---|
| Timer actions (start, pause, reset, breaks) | `"timer"` |
| Timer status read | `"timer"` |
| Task/board read | `"board"` |
| Calendar/schedule read | `"calendar"` |
| Stats/progress read | `"stats"` |

`IntentMatch` return type adds `widget?: ChatMessage["widget"]`. In `useChat`, when an intent matches, set `widget` on the assistant `ChatMessage` before saving.

### 2. SSE Stream (server path via Gemini)

The server emits a new `widget` SSE event when function calls are detected. The server maps tool names to widget types:

| Tool name | Widget |
|---|---|
| `start_timer`, `pause_timer`, `reset_timer` | `"timer"` |
| `create_task` | `"board"` |
| `schedule_event` | `"calendar"` |

The server is the single source for widget assignment on the Gemini path — the client does not duplicate this mapping. In `useChat`, on receiving a `widget` event, set the `widget` field on the current assistant message.

### SSE Event Format

```
data: {"type": "widget", "widget": "timer"}
```

Added to the existing union of SSE event types (`text_delta | actions | widget | error`).

## Files Changed

| File | Change |
|---|---|
| `frontend/lib/ai/chatStorage.ts` | Add `widget?` to `ChatMessage` |
| `frontend/components/chat/ChatView.tsx` | Remove avatars, add `WidgetRenderer`, render widgets in `MessageBubble` |
| `frontend/components/chat/widgets/TimerWidget.tsx` | New — live timer card |
| `frontend/components/chat/widgets/BoardWidget.tsx` | New — task summary card |
| `frontend/components/chat/widgets/CalendarWidget.tsx` | New — upcoming events card |
| `frontend/components/chat/widgets/StatsWidget.tsx` | New — stats summary card |
| `frontend/lib/ai/intents.ts` | Add `widget` field to intents, include in `IntentMatch` |
| `frontend/hooks/useChat.ts` | Set `widget` on assistant messages from intents and SSE |
| `frontend/app/api/chat/route.ts` | Emit `widget` SSE event based on function calls |
