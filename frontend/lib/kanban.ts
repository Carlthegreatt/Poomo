export interface KanbanColumn {
  id: string;
  user_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface KanbanTask {
  id: string;
  user_id: string;
  column_id: string;
  title: string;
  description: string | null;
  color: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
}

export const TASK_COLORS = [
  "#FFC567",
  "#FB7DA8",
  "#FD5A46",
  "#552CB7",
  "#00995E",
  "#058CD7",
] as const;

const STORAGE_KEY = "poomo-kanban";

interface BoardData {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
}

function readStorage(): BoardData {
  if (typeof window === "undefined")
    return { columns: [], tasks: [] };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { columns: [], tasks: [] };
    return JSON.parse(raw) as BoardData;
  } catch {
    return { columns: [], tasks: [] };
  }
}

function writeStorage(data: BoardData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId(): string {
  return crypto.randomUUID();
}

const DEFAULT_COLUMNS = ["Todo", "Ongoing", "Done"];

export async function fetchBoard(): Promise<BoardData> {
  const data = readStorage();

  if (data.columns.length === 0) {
    data.columns = DEFAULT_COLUMNS.map((title, i) => ({
      id: generateId(),
      user_id: "local",
      title,
      position: i,
      created_at: new Date().toISOString(),
    }));
    writeStorage(data);
  }

  data.columns.sort((a, b) => a.position - b.position);
  data.tasks.sort((a, b) => a.position - b.position);
  return data;
}

export async function createColumn(
  title: string,
  position: number
): Promise<KanbanColumn> {
  const data = readStorage();
  const column: KanbanColumn = {
    id: generateId(),
    user_id: "local",
    title,
    position,
    created_at: new Date().toISOString(),
  };
  data.columns.push(column);
  writeStorage(data);
  return column;
}

export async function updateColumn(
  id: string,
  updates: Partial<Pick<KanbanColumn, "title" | "position">>
): Promise<KanbanColumn> {
  const data = readStorage();
  const idx = data.columns.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Column not found");

  data.columns[idx] = { ...data.columns[idx], ...updates };
  writeStorage(data);
  return data.columns[idx];
}

export async function deleteColumn(id: string): Promise<void> {
  const data = readStorage();
  data.columns = data.columns.filter((c) => c.id !== id);
  data.tasks = data.tasks.filter((t) => t.column_id !== id);
  writeStorage(data);
}

export async function createTask(
  task: Pick<KanbanTask, "column_id" | "title" | "position"> &
    Partial<Pick<KanbanTask, "description" | "color" | "due_date">>
): Promise<KanbanTask> {
  const data = readStorage();
  const newTask: KanbanTask = {
    id: generateId(),
    user_id: "local",
    column_id: task.column_id,
    title: task.title,
    description: task.description ?? null,
    color: task.color ?? null,
    due_date: task.due_date ?? null,
    position: task.position,
    created_at: new Date().toISOString(),
  };
  data.tasks.push(newTask);
  writeStorage(data);
  return newTask;
}

export async function updateTask(
  id: string,
  updates: Partial<
    Pick<
      KanbanTask,
      "title" | "description" | "color" | "due_date" | "column_id" | "position"
    >
  >
): Promise<KanbanTask> {
  const data = readStorage();
  const idx = data.tasks.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Task not found");

  data.tasks[idx] = { ...data.tasks[idx], ...updates };
  writeStorage(data);
  return data.tasks[idx];
}

export async function deleteTask(id: string): Promise<void> {
  const data = readStorage();
  data.tasks = data.tasks.filter((t) => t.id !== id);
  writeStorage(data);
}

export async function batchUpdatePositions(
  table: "kanban_columns" | "kanban_tasks",
  items: { id: string; position: number; column_id?: string }[]
): Promise<void> {
  const data = readStorage();
  const arr = table === "kanban_columns" ? data.columns : data.tasks;

  for (const item of items) {
    const entry = arr.find((e) => e.id === item.id);
    if (!entry) continue;
    (entry as { position: number }).position = item.position;
    if (item.column_id !== undefined && "column_id" in entry) {
      (entry as KanbanTask).column_id = item.column_id;
    }
  }

  writeStorage(data);
}
