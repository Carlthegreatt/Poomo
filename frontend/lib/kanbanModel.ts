import { ACCENT_COLORS } from "@/lib/constants";

export { ACCENT_COLORS as TASK_COLORS };

/** Shared class for native `<select>` fields on task forms (matches Input styling). */
export const KANBAN_SELECT_CLASS =
  "w-full h-9 border-2 border-input rounded-lg bg-transparent px-2 text-sm outline-none focus:border-ring";

export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
  created_at: string;
}

export type KanbanTaskPriority = "low" | "medium" | "high";

export interface KanbanTask {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  color: string | null;
  due_date: string | null;
  /** Local time on due date, `HH:mm` (24h), only meaningful when `due_date` is set. */
  due_time: string | null;
  /** Task importance for sorting / scanning the board. */
  priority: KanbanTaskPriority | null;
  /** User-defined label (e.g. Bug, Feature); options live in `task_types` on the board. */
  task_type: string | null;
  position: number;
  created_at: string;
}

export const TASK_PRIORITY_OPTIONS: {
  value: KanbanTaskPriority;
  label: string;
}[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

/** Seeded when the board has no types yet; users can add more from the task type menu. */
export const DEFAULT_TASK_TYPE_LABELS: readonly string[] = [
  "Task",
  "Assignment",
  "Chore",
  "Meeting",
  "Bug",
  "Feature",
];

export interface KanbanBoardSnapshot {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  /** Distinct task type labels for dropdowns (user-extensible). */
  task_types: string[];
}
