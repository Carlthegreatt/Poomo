import { readJSON, writeJSON, generateId } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import type {
  KanbanBoardSnapshot,
  KanbanColumn,
  KanbanTask,
} from "@/lib/kanbanModel";
import { DEFAULT_TASK_TYPE_LABELS } from "@/lib/kanbanModel";

interface BoardData {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  task_types: string[];
}

const EMPTY_BOARD: BoardData = { columns: [], tasks: [], task_types: [] };
const DEFAULT_COLUMNS = ["Todo", "Ongoing", "Done"];

function readBoard(): BoardData {
  const raw = readJSON<BoardData>(STORAGE_KEYS.KANBAN, EMPTY_BOARD);
  if (!raw.task_types) raw.task_types = [];
  if (migrateBoard(raw)) writeBoard(raw);
  return raw;
}

function writeBoard(data: BoardData): void {
  writeJSON(STORAGE_KEYS.KANBAN, data);
}

function ensureTaskTypeInCatalog(
  data: BoardData,
  label: string | null | undefined,
): void {
  const t = label?.trim();
  if (!t) return;
  if (!data.task_types.includes(t)) {
    data.task_types.push(t);
    data.task_types.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }
}

function migrateBoard(data: BoardData): boolean {
  let changed = false;
  if (!data.task_types) {
    data.task_types = [];
    changed = true;
  }
  if (data.task_types.length === 0) {
    data.task_types = [...DEFAULT_TASK_TYPE_LABELS];
    changed = true;
  }
  for (const task of data.tasks) {
    const row = task as unknown as Record<string, unknown>;
    if ("time_type" in row) {
      delete row.time_type;
      changed = true;
    }
    const kt = task as KanbanTask;
    if (!("priority" in kt) || kt.priority === undefined) {
      kt.priority = null;
      changed = true;
    }
    if (!("due_time" in kt) || kt.due_time === undefined) {
      kt.due_time = null;
      changed = true;
    }
    if (!("task_type" in kt) || kt.task_type === undefined) {
      kt.task_type = null;
      changed = true;
    }
  }
  return changed;
}

export async function registerTaskTypeLabelLocal(
  label: string,
): Promise<string[]> {
  const data = readBoard();
  ensureTaskTypeInCatalog(data, label);
  writeBoard(data);
  return [...data.task_types];
}

export async function getTaskTypeLabelsLocal(): Promise<string[]> {
  return [...readBoard().task_types];
}

export async function fetchBoardLocal(): Promise<KanbanBoardSnapshot> {
  const data = readBoard();

  if (data.columns.length === 0) {
    data.columns = DEFAULT_COLUMNS.map((title, i) => ({
      id: generateId(),
      title,
      position: i,
      created_at: new Date().toISOString(),
    }));
    writeBoard(data);
  }

  data.columns.sort((a, b) => a.position - b.position);
  data.tasks.sort((a, b) => a.position - b.position);

  return {
    columns: data.columns,
    tasks: data.tasks,
    task_types: [...data.task_types],
  };
}

export async function createColumnLocal(
  title: string,
  position: number,
): Promise<KanbanColumn> {
  const data = readBoard();
  const column: KanbanColumn = {
    id: generateId(),
    title,
    position,
    created_at: new Date().toISOString(),
  };
  data.columns.push(column);
  writeBoard(data);
  return column;
}

export async function updateColumnLocal(
  id: string,
  updates: Partial<Pick<KanbanColumn, "title" | "position">>,
): Promise<KanbanColumn> {
  const data = readBoard();
  const idx = data.columns.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Column not found");

  data.columns[idx] = { ...data.columns[idx], ...updates };
  writeBoard(data);
  return data.columns[idx];
}

export async function deleteColumnLocal(id: string): Promise<void> {
  const data = readBoard();
  data.columns = data.columns.filter((c) => c.id !== id);
  data.tasks = data.tasks.filter((t) => t.column_id !== id);
  writeBoard(data);
}

export async function createTaskLocal(
  task: Pick<KanbanTask, "column_id" | "title" | "position"> &
    Partial<
      Pick<
        KanbanTask,
        | "description"
        | "color"
        | "due_date"
        | "due_time"
        | "priority"
        | "task_type"
      >
    >,
): Promise<KanbanTask> {
  const data = readBoard();
  const dueDate = task.due_date ?? null;
  const dueTime =
    dueDate && task.due_time?.trim() ? task.due_time.trim() : null;
  const newTask: KanbanTask = {
    id: generateId(),
    column_id: task.column_id,
    title: task.title,
    description: task.description ?? null,
    color: task.color ?? null,
    due_date: dueDate,
    due_time: dueTime,
    priority: task.priority ?? null,
    task_type: task.task_type?.trim() || null,
    position: task.position,
    created_at: new Date().toISOString(),
  };
  ensureTaskTypeInCatalog(data, newTask.task_type);
  data.tasks.push(newTask);
  writeBoard(data);
  return newTask;
}

export async function updateTaskLocal(
  id: string,
  updates: Partial<
    Pick<
      KanbanTask,
      | "title"
      | "description"
      | "color"
      | "due_date"
      | "due_time"
      | "priority"
      | "task_type"
      | "column_id"
      | "position"
    >
  >,
): Promise<KanbanTask> {
  const data = readBoard();
  const idx = data.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");

  const prev = data.tasks[idx];
  const merged = { ...prev, ...updates };

  if (updates.due_date !== undefined || updates.due_time !== undefined) {
    const date =
      updates.due_date !== undefined ? updates.due_date : prev.due_date;
    const timeRaw =
      updates.due_time !== undefined ? updates.due_time : prev.due_time;
    merged.due_date = date;
    merged.due_time = date && timeRaw?.trim() ? timeRaw.trim() : null;
  }

  if (updates.task_type !== undefined) {
    merged.task_type = updates.task_type?.trim() || null;
    ensureTaskTypeInCatalog(data, merged.task_type);
  }

  data.tasks[idx] = merged;
  writeBoard(data);
  return data.tasks[idx];
}

export async function deleteTaskLocal(id: string): Promise<void> {
  const data = readBoard();
  data.tasks = data.tasks.filter((t) => t.id !== id);
  writeBoard(data);
}

export async function batchUpdateColumnPositionsLocal(
  items: { id: string; position: number }[],
): Promise<void> {
  const data = readBoard();
  for (const item of items) {
    const entry = data.columns.find((c) => c.id === item.id);
    if (entry) entry.position = item.position;
  }
  writeBoard(data);
}

export async function batchUpdateTaskPositionsLocal(
  items: { id: string; position: number; column_id?: string }[],
): Promise<void> {
  const data = readBoard();
  for (const item of items) {
    const entry = data.tasks.find((t) => t.id === item.id);
    if (!entry) continue;
    entry.position = item.position;
    if (item.column_id !== undefined) entry.column_id = item.column_id;
  }
  writeBoard(data);
}
