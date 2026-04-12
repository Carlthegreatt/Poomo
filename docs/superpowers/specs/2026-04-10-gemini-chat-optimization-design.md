# Gemini Chat Optimization Design

**Date**: 2026-04-10
**Goal**: Reduce Gemini API cost and latency for the Poomo AI chat by ~85-100% for common actions and ~75-92% for conversational queries.

## Context

The current chat implementation (`POST /api/chat`) uses `gemini-2.5-flash`, sends up to 50 messages of history per request, and makes 2 Gemini API calls for any tool-using interaction (one for the tool call, one for the confirmation). Most usage is simple productivity commands (start/pause timer, check status) where this overhead is unnecessary.

## Optimization Sections (ordered by cost impact)

### Section 1: Switch to gemini-2.0-flash

**File**: `frontend/app/api/chat/route.ts` (line 220)

Change the model string from `gemini-2.5-flash` to `gemini-2.0-flash`.

**Rationale**: Gemini 2.5 Flash charges $0.30/1M input and $2.50/1M output tokens. Gemini 2.0 Flash charges $0.10/1M input and $0.40/1M output — 3x cheaper input, 6.25x cheaper output. The "thinking" capability of 2.5 Flash provides no meaningful benefit for a 1-3 sentence productivity assistant. 2.0 Flash fully supports function calling.

**Risk**: None for this use case. Both models handle structured tool calling. If response quality noticeably degrades for complex conversational queries, the model can be conditionally upgraded per-request, but this is unlikely.

### Section 2: Client-side intent matching

**File**: New module `frontend/lib/ai/intents.ts`, changes to `frontend/hooks/useChat.ts`

Add a lightweight intent matcher that intercepts messages before they reach the API. A small set of regex patterns maps common commands directly to Zustand store actions:

**Intent registry:**

| Pattern (case-insensitive) | Action | Confirmation message |
|---|---|---|
| `start (a\|the)? (focus\|work\|pomodoro) (timer\|session)?` | `useTimer.start("WORK")` | "Starting a focus session." |
| `start (a\|the)? (short)? break` | `useTimer.start("BREAK_SHORT")` | "Starting a short break." |
| `start (a\|the)? long break` | `useTimer.start("BREAK_LONG")` | "Starting a long break." |
| `(pause\|stop) (the)? timer` | `useTimer.pause()` | "Timer paused." |
| `reset (the)? timer` | `useTimer.reset()` | "Timer reset." |

**Flow in `useChat.ts`:**
1. User sends message
2. Check against intent registry
3. If matched: execute store action, insert canned assistant message, show toast — no API call
4. If not matched: proceed to Gemini API as normal

**Cost**: Zero Gemini calls for matched patterns. These cover the most frequent user actions.

### Section 3: Trim conversation history

**Files**: `frontend/hooks/useChat.ts`, `frontend/app/api/chat/route.ts`

**Client-side (`useChat.ts`)**: Before building `geminiMessages`, slice the conversation to the last 8 messages. The full history (up to 50) remains in local storage and renders in the UI for scrollback.

**Server-side (`route.ts`)**: Reduce `MAX_MESSAGES` validation from 60 to 12 (8 history + small buffer for edge cases).

**Token savings**: Typical 50-message history is ~1000-2500 input tokens. Trimmed 8-message history is ~160-400 tokens. This saves ~80% of input tokens per call, and compounds in the tool loop where history is resent each iteration.

### Section 4: Context injection into system prompt

**Files**: `frontend/app/api/chat/route.ts`, `frontend/lib/ai/tools.ts`

**System prompt change**: `buildSystemPrompt()` now accepts the `AppContext` object and appends a formatted state block:

```
--- Current App State ---
Timer: Focus, running, 18m 32s remaining
Tasks: Study for exam (Todo, due 2026-04-12), Clean desk (Ongoing)
Upcoming events: Team standup Apr 11 9:00-9:30
Today's stats: 3 sessions, 75 minutes
```

**Remove read-only tools**: Delete `get_tasks`, `get_stats`, `get_timer_status`, `get_schedule` from `poomoTools` in `tools.ts`. Delete `resolveReadOnlyTool` from `route.ts`. This eliminates ~200 tokens of tool declarations per request AND eliminates the second Gemini call for all read-only queries.

Only mutation tools remain in the tools array: `start_timer`, `pause_timer`, `reset_timer`, `create_task`, `schedule_event`.

### Section 5: Skip confirmation round-trip for mutations

**File**: `frontend/app/api/chat/route.ts`

When the tool loop detects only mutation tool calls (no text response from Gemini), the server:
1. Collects the mutation actions as before
2. Generates a fixed confirmation message based on tool name + args
3. Sends the `text_delta` with the confirmation AND the `actions` event
4. Breaks out of the `while` loop — no second Gemini call

**Confirmation templates:**
- `start_timer(WORK)` → "Starting a focus timer."
- `start_timer(BREAK_SHORT)` → "Starting a short break."
- `start_timer(BREAK_LONG)` → "Starting a long break."
- `pause_timer` → "Timer paused."
- `reset_timer` → "Timer reset."
- `create_task({title})` → "Task created: {title}."
- `schedule_event({title})` → "Event scheduled: {title}."

**Edge case**: If Gemini returns both text AND function calls in the same response, use the text as-is and still collect the actions (current behavior). The shortcut only applies when there's no text alongside the tool calls.

## Files Changed

| File | Change |
|---|---|
| `frontend/app/api/chat/route.ts` | Model switch, context in system prompt, remove read-only tool resolution, mutation confirmation shortcut, lower MAX_MESSAGES |
| `frontend/lib/ai/tools.ts` | Remove 4 read-only tool declarations |
| `frontend/lib/ai/intents.ts` | New: intent registry with regex patterns and action mappings |
| `frontend/hooks/useChat.ts` | Trim history before API call, integrate intent matching |

## Out of Scope

- Response caching (low hit rate for productivity assistant)
- Per-request model selection (unnecessary unless quality degrades)
- Streaming token-by-token from Gemini (current batch-per-chunk is fine for short responses)
- Changes to chat UI, storage, or executor

## Expected Cost Impact

| Scenario | Before | After | Savings |
|---|---|---|---|
| Timer actions ("start focus") | 2 calls at 2.5 Flash pricing | 0 calls (client-side) | ~100% |
| Status queries ("timer status") | 2 calls at 2.5 Flash pricing | 1 call at 2.0 Flash pricing, trimmed history | ~92% |
| Scheduling / task creation | 2 calls at 2.5 Flash pricing | 1 call at 2.0 Flash pricing, skip confirmation | ~89% |
| General chat | 1 call at 2.5 Flash pricing | 1 call at 2.0 Flash pricing, trimmed history | ~85% |
