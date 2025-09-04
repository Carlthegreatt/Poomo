# 🎯 Project: Pomodoro+ — a Focus & Productivity Web App

A modern, offline‑capable Pomodoro app with accounts, stats, notifications, and optional social/Pro features. Built with **Next.js (App Router)** and a clean, scalable architecture.

---

## 0) Outcomes & Scope
- **MVP (Week 1–2):** Timer (25/5), custom lengths, tasks, local stats, sound, desktop/mobile responsive, installable PWA, notifications.
- **V1 (Week 3–4):** Accounts + sync, detailed analytics, categories/labels, streaks, export CSV, dark/light themes.
- **V2 (Stretch):** Real‑time sync across devices, teams (shared rooms), calendar integration, Pro plan with Stripe, leaderboards.

---

## 1) Core Tech Choices (with safe alternatives)
- **Framework:** Next.js (App Router, RSC + Server Actions). Alt: Remix.
- **Language:** TypeScript end‑to‑end.
- **UI:** Tailwind CSS + shadcn/ui + lucide‑react icons.
- **State:** Zustand (lightweight) + React Query (server cache) if needed.
- **DB & ORM:** PostgreSQL + Prisma. Alt: Supabase (hosted PG) or Planetscale (MySQL) + Prisma.
- **Auth:** Auth.js (next‑auth) with email/provider login. Alt: Supabase Auth, Clerk.
- **Caching & Realtime:** Next.js caching + built‑in WebSocket (Route Handlers) or Pusher/Ably.
- **PWA & Offline:** next‑pwa or custom SW; client cache in **IndexedDB** via `idb-keyval`.
- **Notifications:** Web Notifications API + Service Worker; optional Push (VAPID) later.
- **Testing:** Vitest/Jest (unit), Playwright (e2e), Testing Library (components).
- **Deploy:** Vercel (Web) + Supabase/Neon (DB). Monitoring with Sentry/Logtail.

---

## 2) UX & Feature Map
**Screens**
- Dashboard (timer, session controls, task picker)
- Tasks (CRUD, priorities, tags)
- History & Stats (by day/week/month)
- Settings (durations, sound, auto‑start, theme, notifications, PWA install)
- Auth (sign in/up, magic link)

**Timer behaviors**
- Work/Short break/Long break cycles; configurable long‑break interval.
- Options: auto‑start next session, pause protection, session notes.
- **Background reliability:** use a **Web Worker** ticker + visibility handling; schedule end‑time and compute diff on resume.

**Delight**
- Subtle sounds, keyboard shortcuts, gentle animations (Framer Motion), streak flame.

---

## 3) Suggested Project Structure
```
app/
  (marketing)/
    page.tsx
  dashboard/
    page.tsx
  api/
    tasks/route.ts        // RESTful handlers
    sessions/route.ts
    stats/route.ts
  auth/
    [...nextauth]/route.ts
  layout.tsx
  globals.css
components/
  timer/
    Timer.tsx
    useTimer.ts           // hook powered by Zustand
  charts/
    StreakChart.tsx
  ui/                     // shadcn wrappers
lib/
  db.ts                   // Prisma client
  auth.ts                 // Auth.js config
  idb.ts                  // IndexedDB helpers
  notifications.ts        // permission + SW registration
workers/
  timer.worker.ts         // precise timer in a Web Worker
prisma/
  schema.prisma
public/
  manifest.webmanifest
  icons/*
```

---

## 4) Data Model (Prisma)
```prisma
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  sessions  Session[]
  tasks     Task[]
  settings  Settings?
}

model Task {
  id        String   @id @default(cuid())
  userId    String
  title     String
  notes     String?
  tag       String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
  sessions  Session[]
}

model Session {
  id         String   @id @default(cuid())
  userId     String
  taskId     String?
  kind       SessionKind // WORK | BREAK_SHORT | BREAK_LONG
  startedAt  DateTime
  endedAt    DateTime
  durationMs Int
  note       String?
  user       User     @relation(fields: [userId], references: [id])
  task       Task?    @relation(fields: [taskId], references: [id])
}

enum SessionKind { WORK BREAK_SHORT BREAK_LONG }

model Settings {
  userId      String  @id
  workMin     Int     @default(25)
  shortMin    Int     @default(5)
  longMin     Int     @default(15)
  longEvery   Int     @default(4)
  autoStart   Boolean @default(false)
  sound       String? // key of bundled sounds
  theme       String? // 'system' | 'light' | 'dark'
  user        User    @relation(fields: [userId], references: [id])
}
```

---

## 5) API Surface (Route Handlers)
```ts
// app/api/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() { /* list sessions for user (filter by date range) */ }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const created = await prisma.session.create({ data: { userId: session.user.id, ...body } });
  return NextResponse.json(created);
}
```

```ts
// app/api/tasks/route.ts
export async function GET() { /* pagination + search */ }
export async function POST() { /* create */ }
export async function PATCH() { /* bulk update order/active */ }
```

**Server Actions (optional):** wrap common mutations (`createSession`, `updateSettings`) and call directly from RSC.

---

## 6) Timer Architecture (reliable & precise)
- **State store:** Zustand → `{ phase, remainingMs, cycleCount, selectedTaskId }`.
- **Ticker:** Web Worker posts `tick` every 200ms; UI uses `requestAnimationFrame` to render smoothly.
- **Truth source:** store `targetEndAt` (Date.now + remainingMs). On tab resume, recompute `remainingMs = targetEndAt - now`.
- **Visibility changes:** on `visibilitychange`, pause animations; keep worker running.
- **Notifications:** when remaining hits 0, show Notification + optional sound; if in background, Service Worker fires a notification.

```ts
// workers/timer.worker.ts
let interval: any;
self.onmessage = (e: MessageEvent) => {
  const { cmd, payload } = e.data;
  if (cmd === 'start') {
    clearInterval(interval);
    interval = setInterval(() => {
      (self as any).postMessage({ type: 'tick', now: Date.now() });
    }, 200);
  } else if (cmd === 'stop') clearInterval(interval);
};
```

```ts
// components/timer/useTimer.ts (sketch)
import { create } from 'zustand';

type Phase = 'WORK' | 'BREAK_SHORT' | 'BREAK_LONG' | 'IDLE' | 'PAUSED';
interface TimerState { phase: Phase; targetEndAt?: number; remainingMs: number; /* ... */ }
export const useTimer = create<TimerState>(() => ({ phase: 'IDLE', remainingMs: 25*60_000 }));
// actions: start(phase, minutes), pause(), resume(), reset(), complete()
```

---

## 7) Notifications & PWA
- Ask permission gracefully; fallback to in‑app toasts.
- Register SW; on session completion, post a message to SW to show a notification.
- Add `manifest.webmanifest` and icons for installability.
- Consider Push (web‑push) for cross‑device reminders in V2.

```json
// public/manifest.webmanifest
{
  "name": "Pomodoro+",
  "short_name": "Pomodoro+",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0b0f19",
  "theme_color": "#0ea5e9",
  "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" }]
}
```

---

## 8) Offline‑First Strategy
- Cache shell via SW; store **sessions & tasks** writes in an IndexedDB **outbox**, sync when online.
- Reconcile conflicts (last‑write‑wins by timestamp; surface conflicts in UI if needed).

---

## 9) Analytics & Charts
- Compute: finished sessions, focus time by tag, longest streak, avg session length.
- Render with `recharts` or `@tanstack/charts` in RSC streaming for snappy loads.

---

## 10) Auth.js Setup (email magic link)
- Add `/auth` route handler; provider Email (Resend/SMTP) + OAuth (Google/GitHub) as optional.
- Use **middleware** to protect `/dashboard`.

---

## 11) Testing Plan
- **Unit:** timer math (edge cases: pause/resume, tab sleep), reducers, utils.
- **Component:** Timer, TaskList, Settings dialogs.
- **E2E (Playwright):** start/pause/complete cycle; notification permission flow; offline session then sync.

---

## 12) Security & Perf
- Rate limit API routes (upstash/ratelimit). CSRF via same‑site cookies (Auth.js covers sessions).
- Input validation with Zod; handle timezone consistently (store UTC, display local).
- Fonts: prefer **local self‑hosted** to avoid next/font download hiccups.
- Images/icons: use SVG sprites where possible.

---

## 13) Deployment Checklist
- Vercel project + env vars (DATABASE_URL, NEXTAUTH_SECRET, EMAIL_SERVER, etc.)
- Neon/Supabase PG; run `prisma migrate deploy`.
- Set up Sentry + Vercel source maps.
- Add `Cache-Control` headers for static assets; enable ISR for marketing pages.

---

## 14) Stretch Features (V2+)
- **Real‑time rooms:** co‑focus with friends (WebSocket), presence, chat.
- **Calendar:** Google Calendar write‑backs (log focus blocks).
- **Native wrappers:** Tauri/Electron desktop with system tray + global shortcuts.
- **Mobile:** Capacitor wrap for push notifications on iOS/Android.
- **Gamification:** badges, heatmap, seasonal events.

---

## 15) 10‑Day Build Plan (concrete tasks)
**Day 1:** Repo, tooling, Tailwind + shadcn, base layout, theme toggle.  
**Day 2:** Timer UI + Zustand store + Worker ticker.  
**Day 3:** Settings screen; durations; sounds.  
**Day 4:** Tasks CRUD (local first, mock API).  
**Day 5:** PWA (manifest, SW), notifications.  
**Day 6:** PostgreSQL + Prisma schema; seed script.  
**Day 7:** Auth.js email login; protect dashboard.  
**Day 8:** Sessions API + server actions; write‑through cache to IDB.  
**Day 9:** History & Stats charts.  
**Day 10:** Playwright e2e, polish, deploy to Vercel + Supabase.

---

## 16) Quick Tips & Pitfalls
- **Timer accuracy:** never trust `setTimeout(1500000)`—store `targetEndAt` and compute drift.
- **Background tabs:** Chrome/Firefox throttle timers; Worker + end‑time diff avoids drift.
- **Mobile wake lock:** consider the Screen Wake Lock API (fallback to audio hack sparingly).
- **Sounds on iOS:** require a user gesture to start audio context; preload on first click.
- **next/font:** prefer local fonts to avoid remote fetch warnings; or ship system fonts.
- **Edge runtime:** route handlers using Prisma must use node runtime; mark `export const runtime = 'nodejs'`.
- **Server Actions:** mark `'use server'`; validate input with Zod; return plain objects (serializable).

---

## 17) Small Snippets You Can Paste
```ts
// lib/db.ts
import { PrismaClient } from '@prisma/client';
export const prisma = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') (globalThis as any).prisma = prisma;
```

```ts
// lib/notifications.ts
export async function ensurePermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const res = await Notification.requestPermission();
  return res === 'granted';
}
```

```ts
// app/api/stats/route.ts (daily totals)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = new Date(searchParams.get('from')!);
  const to = new Date(searchParams.get('to')!);
  const data = await prisma.session.groupBy({
    by: ['userId'],
    _sum: { durationMs: true },
    where: { startedAt: { gte: from }, endedAt: { lte: to }, kind: 'WORK' },
  });
  return Response.json(data);
}
```

```ts
// Server Action example
'use server';
import { prisma } from '@/lib/db';
export async function createSession(u: { userId: string; taskId?: string; kind: 'WORK'|'BREAK_SHORT'|'BREAK_LONG'; startedAt: Date; endedAt: Date; }) {
  return prisma.session.create({ data: { ...u, durationMs: u.endedAt.getTime() - u.startedAt.getTime() } });
}
```

---

## 18) Next Steps for You
1) Create the repo and scaffold Next.js + Tailwind.  
2) Build the **Timer** with Worker + end‑time math.  
3) Decide DB host (Supabase/Neon), then add Prisma + Auth.js.  
4) Ship MVP to Vercel; iterate from real usage.

If you want, I can generate starter files (pages, components, Prisma schema, and a basic timer) next.
