# Chat navigation, footer, and Kanban motion — design spec

**Date:** 2026-04-10  
**Status:** Approved for implementation planning

## Problem

1. After switching away from Chat via the sidebar and returning, the transcript does not reliably land on the **most recent** messages.
2. “Clear chat” is easy to miss when attention stays near the **composer** on long threads.
3. Kanban **column** dragging feels wrong: entrance animations compete with `@dnd-kit/sortable` transforms; task cards mix hover motion with drag transitions.
4. The **composer** should stay visually anchored to the **bottom** of the chat panel (including the empty/welcome state), not centered mid-screen.

## Goals

- Returning to `/` (Chat) always shows the **latest** part of the conversation.
- **Clear chat** is one tap away without hunting: a compact strip **between** the scrollable transcript and the composer (option **B**); no duplicate control above the transcript.
- **Composer** uses a **sticky footer** pattern: shared shell for welcome and threaded views so the input sits at the **bottom** with opaque/blurred backdrop and survives layout edge cases; respect mobile bottom nav / safe area (`pb` on page already reserves space — footer background must not let scrolled text show through).
- Kanban drags are smooth: no competing `transform` animations on the same node as sortable transforms; cards do not fight hover styles while dragging.

## Non-goals

- Changing chat storage, API, or widget payloads.
- Replacing `@dnd-kit` or redesigning the board layout.
- Keyboard shortcuts for clear (explicitly out of scope unless added later).

## Chat — architecture

### Layout (both empty and threaded)

- Outer: `flex flex-col flex-1 min-h-0 overflow-hidden` (matches current constrained height).
- **Scroll region:** `flex-1 min-h-0 overflow-y-auto` containing only “main” content:
  - **Welcome:** hero, suggestions (and optional spacing) — scrollable if tall on small screens.
  - **Thread:** message list, typing indicator, sentinel `messagesEndRef`.
- **Footer (sticky):** `shrink-0 sticky bottom-0 z-20 border-t bg-background` (+ optional `backdrop-blur-sm` / high opacity) containing:
  - **Clear strip** — only when `messages.length > 0` (trailing “Clear chat” control, same semantics as today).
  - **InputBar** — always present in the footer.
- Remove the standalone `InputBar` from the middle of the welcome column and the duplicate clear row above the transcript.

### Scroll-to-recent

- Keep `useChat` initialization (`loadChatHistory`) as today.
- Add a **ref** to the scrollable message container.
- On **mount** and when **messages** (or streaming tail) change, scroll to bottom after layout:
  - Prefer `scrollTop = scrollHeight` (or double `requestAnimationFrame`) in addition to or instead of `scrollIntoView` on the sentinel, to avoid Framer layout races.

### Clear chat

- Single location: footer strip above `InputBar` when there is history.
- `clearHistory` behavior unchanged (storage + local state).

## Kanban — motion

### Columns (`Column.tsx` + `globals.css`)

- **`columnEntrance`:** stop animating **`transform`** on the same element that receives `useSortable` `transform`. Prefer **opacity-only** entrance (or a wrapper-only animation not applied to the draggable node).
- While **`isDragging`** on a column: **`animation: none`** (or equivalent class) so drag transform always wins.

### Task cards (`TaskCard.tsx`)

- When **`isDragging`**, disable **hover translate / shadow** classes that conflict with sortable `transition`.

### Drag overlay (`Board.tsx`)

- **Nice-to-have:** column overlay width follows **`columnWidths[col.id]`** so the preview matches the real column.

## Error handling

- Scroll failures: no throw; best-effort `scrollTo` in `requestAnimationFrame`.
- Clear: unchanged — `clearStorage()` + empty messages.

## Testing

- **Manual:** Long thread → navigate to Board → back to Chat → viewport shows **bottom** of transcript.
- **Manual:** Long thread → scroll transcript up → **Clear** and **Input** remain visible at bottom; clear works.
- **Manual:** Welcome screen → **Input** at bottom; suggestions scroll above if needed.
- **Manual:** Drag column and task — no jitter; first paint still has a subtle column entrance if desired.

## Files (expected touch list)

- `frontend/components/chat/ChatView.tsx`
- `frontend/styles/globals.css` (keyframes)
- `frontend/components/kanban/Column.tsx`
- `frontend/components/kanban/TaskCard.tsx`
- `frontend/components/kanban/Board.tsx` (overlay sizing, optional)
