import { isCloudDataBackend } from "@/lib/data/authSession";
import type { KanbanBoardSnapshot, KanbanColumn, KanbanTask } from "@/lib/kanbanModel";
import * as local from "@/lib/data/local/kanbanLocal";
import * as cloud from "@/lib/data/cloud/kanbanCloud";
import { browserSupabase } from "@/lib/supabase/client";

export async function registerTaskTypeLabel(label: string): Promise<string[]> {
  return isCloudDataBackend()
    ? cloud.registerTaskTypeLabelCloud(browserSupabase(), label)
    : local.registerTaskTypeLabelLocal(label);
}

export async function getTaskTypeLabels(): Promise<string[]> {
  return isCloudDataBackend()
    ? cloud.getTaskTypeLabelsCloud(browserSupabase())
    : local.getTaskTypeLabelsLocal();
}

export async function fetchBoard(): Promise<KanbanBoardSnapshot> {
  return isCloudDataBackend()
    ? cloud.fetchBoardCloud(browserSupabase())
    : local.fetchBoardLocal();
}

export async function createColumn(
  title: string,
  position: number,
): Promise<KanbanColumn> {
  return isCloudDataBackend()
    ? cloud.createColumnCloud(browserSupabase(), title, position)
    : local.createColumnLocal(title, position);
}

export async function updateColumn(
  id: string,
  updates: Partial<Pick<KanbanColumn, "title" | "position">>,
): Promise<KanbanColumn> {
  return isCloudDataBackend()
    ? cloud.updateColumnCloud(browserSupabase(), id, updates)
    : local.updateColumnLocal(id, updates);
}

export async function deleteColumn(id: string): Promise<void> {
  return isCloudDataBackend()
    ? cloud.deleteColumnCloud(browserSupabase(), id)
    : local.deleteColumnLocal(id);
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
  return isCloudDataBackend()
    ? cloud.createTaskCloud(browserSupabase(), task)
    : local.createTaskLocal(task);
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
  return isCloudDataBackend()
    ? cloud.updateTaskCloud(browserSupabase(), id, updates)
    : local.updateTaskLocal(id, updates);
}

export async function deleteTask(id: string): Promise<void> {
  return isCloudDataBackend()
    ? cloud.deleteTaskCloud(browserSupabase(), id)
    : local.deleteTaskLocal(id);
}

export async function batchUpdateColumnPositions(
  items: { id: string; position: number }[],
): Promise<void> {
  return isCloudDataBackend()
    ? cloud.batchUpdateColumnPositionsCloud(browserSupabase(), items)
    : local.batchUpdateColumnPositionsLocal(items);
}

export async function batchUpdateTaskPositions(
  items: { id: string; position: number; column_id?: string }[],
): Promise<void> {
  return isCloudDataBackend()
    ? cloud.batchUpdateTaskPositionsCloud(browserSupabase(), items)
    : local.batchUpdateTaskPositionsLocal(items);
}
