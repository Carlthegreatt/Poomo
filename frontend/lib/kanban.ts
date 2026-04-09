import { readJSON, writeJSON, generateId } from "@/lib/storage";
import { ACCENT_COLORS, STORAGE_KEYS } from "@/lib/constants";

export { ACCENT_COLORS as TASK_COLORS };

export interface KanbanColumn {
  id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface KanbanTask {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  color: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
}

interface BoardData {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
}

const EMPTY_BOARD: BoardData = { columns: [], tasks: [] };
const DEFAULT_COLUMNS = ["Todo", "Ongoing", "Done"];

function readBoard(): BoardData {
  return readJSON<BoardData>(STORAGE_KEYS.KANBAN, EMPTY_BOARD);
}

function writeBoard(data: BoardData): void {
  writeJSON(STORAGE_KEYS.KANBAN, data);
}

export async function fetchBoard(): Promise<BoardData> {
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
  return data;
}

export async function createColumn(
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

export async function updateColumn(
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

export async function deleteColumn(id: string): Promise<void> {
  const data = readBoard();
  data.columns = data.columns.filter((c) => c.id !== id);
  data.tasks = data.tasks.filter((t) => t.column_id !== id);
  writeBoard(data);
}

export async function createTask(
  task: Pick<KanbanTask, "column_id" | "title" | "position"> &
    Partial<Pick<KanbanTask, "description" | "color" | "due_date">>,
): Promise<KanbanTask> {
  const data = readBoard();
  const newTask: KanbanTask = {
    id: generateId(),
    column_id: task.column_id,
    title: task.title,
    description: task.description ?? null,
    color: task.color ?? null,
    due_date: task.due_date ?? null,
    position: task.position,
    created_at: new Date().toISOString(),
  };
  data.tasks.push(newTask);
  writeBoard(data);
  return newTask;
}

export async function updateTask(
  id: string,
  updates: Partial<
    Pick<
      KanbanTask,
      "title" | "description" | "color" | "due_date" | "column_id" | "position"
    >
  >,
): Promise<KanbanTask> {
  const data = readBoard();
  const idx = data.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");

  data.tasks[idx] = { ...data.tasks[idx], ...updates };
  writeBoard(data);
  return data.tasks[idx];
}

export async function deleteTask(id: string): Promise<void> {
  const data = readBoard();
  data.tasks = data.tasks.filter((t) => t.id !== id);
  writeBoard(data);
}

export async function batchUpdateColumnPositions(
  items: { id: string; position: number }[],
): Promise<void> {
  const data = readBoard();
  for (const item of items) {
    const entry = data.columns.find((c) => c.id === item.id);
    if (entry) entry.position = item.position;
  }
  writeBoard(data);
}

export async function batchUpdateTaskPositions(
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
