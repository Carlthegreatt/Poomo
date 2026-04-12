import { readJSON, writeJSON, generateId } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import type { FocusSession } from "@/lib/statsTypes";

const DEFAULT_GOAL = 8;

function readSessions(): FocusSession[] {
  return readJSON<FocusSession[]>(STORAGE_KEYS.SESSIONS, []);
}

function writeSessions(sessions: FocusSession[]): void {
  writeJSON(STORAGE_KEYS.SESSIONS, sessions);
}

export async function fetchSessionsLocal(): Promise<FocusSession[]> {
  return readSessions().sort(
    (a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime(),
  );
}

export function logSessionLocal(session: Omit<FocusSession, "id">): FocusSession {
  const sessions = readSessions();
  const entry: FocusSession = { ...session, id: generateId() };
  sessions.push(entry);
  writeSessions(sessions);
  return entry;
}

export async function clearSessionsLocal(): Promise<void> {
  writeSessions([]);
}

export function getDailyGoalLocal(): number {
  if (typeof window === "undefined") return DEFAULT_GOAL;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_GOAL);
    if (!raw) return DEFAULT_GOAL;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
}

export function setDailyGoalLocal(goal: number): void {
  localStorage.setItem(
    STORAGE_KEYS.DAILY_GOAL,
    String(Math.max(1, Math.floor(goal))),
  );
}
