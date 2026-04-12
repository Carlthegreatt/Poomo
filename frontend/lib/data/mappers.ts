import type { FocusSession } from "@/lib/statsTypes";

export type { FocusSession };

/** DB row shape for public.focus_sessions */
export interface FocusSessionRow {
  id: string;
  started_at: string;
  ended_at: string;
  phase: string;
  duration_ms: number;
  task_id: string | null;
  task_title: string | null;
}

export function focusSessionFromRow(row: FocusSessionRow): FocusSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    phase: row.phase as FocusSession["phase"],
    durationMs: row.duration_ms,
    taskId: row.task_id,
    taskTitle: row.task_title,
  };
}

export function focusSessionToRow(
  userId: string,
  s: Omit<FocusSession, "id"> & { id?: string },
): Record<string, unknown> {
  return {
    ...(s.id ? { id: s.id } : {}),
    user_id: userId,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    phase: s.phase,
    duration_ms: s.durationMs,
    task_id: s.taskId,
    task_title: s.taskTitle,
  };
}
