import { isCloudDataBackend } from "@/lib/data/authSession";
import {
  DEFAULT_TASK_TYPE_LABELS,
  type KanbanBoardSnapshot,
  type KanbanColumn,
  type KanbanTask,
} from "@/lib/models/kanban";
import * as cloud from "@/lib/data/cloud/kanbanCloud";
import { browserSupabase } from "@/lib/supabase/client";
import {
  createColumnAction,
  updateColumnAction,
  deleteColumnAction,
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  batchUpdateColumnPositionsAction,
  batchUpdateTaskPositionsAction,
  registerTaskTypeLabelAction,
} from "@/lib/actions/kanban";

const EMPTY_BOARD_SNAPSHOT: KanbanBoardSnapshot = {
  columns: [],
  tasks: [],
  task_types: [...DEFAULT_TASK_TYPE_LABELS],
};

function notSignedIn(): Error {
  return new Error("Not signed in");
}

export async function registerTaskTypeLabel(label: string): Promise<string[]> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await registerTaskTypeLabelAction(label);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function getTaskTypeLabels(): Promise<string[]> {
  return isCloudDataBackend()
    ? cloud.getTaskTypeLabelsCloud(browserSupabase())
    : [...EMPTY_BOARD_SNAPSHOT.task_types];
}

export async function fetchBoard(): Promise<KanbanBoardSnapshot> {
  return isCloudDataBackend()
    ? cloud.fetchBoardCloud(browserSupabase())
    : EMPTY_BOARD_SNAPSHOT;
}

export async function createColumn(
  title: string,
  position: number,
): Promise<KanbanColumn> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await createColumnAction({ title, position });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateColumn(
  id: string,
  updates: Partial<Pick<KanbanColumn, "title" | "position">>,
): Promise<KanbanColumn> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await updateColumnAction({ id, updates });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function deleteColumn(id: string): Promise<void> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await deleteColumnAction({ id });
  if (!result.ok) throw new Error(result.message);
}

export async function createTask(
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
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await createTaskAction(task);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateTask(
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
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await updateTaskAction({ id, updates });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function deleteTask(id: string): Promise<void> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await deleteTaskAction({ id });
  if (!result.ok) throw new Error(result.message);
}

export async function batchUpdateColumnPositions(
  items: { id: string; position: number }[],
): Promise<void> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await batchUpdateColumnPositionsAction(items);
  if (!result.ok) throw new Error(result.message);
}

export async function batchUpdateTaskPositions(
  items: { id: string; position: number; column_id?: string }[],
): Promise<void> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await batchUpdateTaskPositionsAction(items);
  if (!result.ok) throw new Error(result.message);
}
