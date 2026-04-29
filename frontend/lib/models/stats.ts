export interface FocusSession {
  id: string;
  startedAt: string;
  endedAt: string;
  phase: "focus" | "shortBreak" | "longBreak";
  durationMs: number;
  taskId: string | null;
  taskTitle: string | null;
}
