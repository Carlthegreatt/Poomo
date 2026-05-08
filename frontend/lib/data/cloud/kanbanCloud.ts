import type { SupabaseClient } from "@supabase/supabase-js";
import { generateId } from "@/lib/storage";
import type {
  KanbanBoardSnapshot,
  KanbanColumn,
  KanbanTask,
} from "@/lib/models/kanban";
import { requireDataUserId } from "@/lib/data/cloud/supabaseDataUser";

function mapColumn(row: {
  id: string;
  title: string;
  position: number;
  created_at: string;
}): KanbanColumn {
  return {
    id: row.id,
    title: row.title,
    position: row.position,
    created_at: row.created_at,
  };
}

function isoFromJson(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v))
    return new Date(v).toISOString();
  return new Date().toISOString();
}

function parseRpcSnapshot(data: unknown): KanbanBoardSnapshot {
  const root =
    typeof data === "string"
      ? (JSON.parse(data) as unknown)
      : data;
  if (root === null || typeof root !== "object" || Array.isArray(root)) {
    throw new Error("Invalid kanban snapshot");
  }
  const doc = root as Record<string, unknown>;
  const columnsRaw = doc.columns;
  const tasksRaw = doc.tasks;
  const typesRaw = doc.task_types;

  const columns: KanbanColumn[] = Array.isArray(columnsRaw)
    ? columnsRaw.map((c) => {
        const row = c as Record<string, unknown>;
        return mapColumn({
          id: String(row.id),
          title: String(row.title),
          position: Number(row.position),
          created_at: isoFromJson(row.created_at),
        });
      })
    : [];

  const tasks: KanbanTask[] = Array.isArray(tasksRaw)
    ? tasksRaw.map((t) => {
        const row = t as Record<string, unknown>;
        const due = row.due_date;
        const dueDate =
          due === null || due === undefined
            ? null
            : typeof due === "string"
              ? due
              : String(due);
        return mapTask({
          id: String(row.id),
          column_id: String(row.column_id),
          title: String(row.title),
          description:
            row.description != null ? String(row.description) : null,
          color: row.color != null ? String(row.color) : null,
          due_date: dueDate,
          due_time: row.due_time != null ? String(row.due_time) : null,
          priority: row.priority != null ? String(row.priority) : null,
          task_type: row.task_type != null ? String(row.task_type) : null,
          position: Number(row.position),
          created_at: isoFromJson(row.created_at),
        });
      })
    : [];

  const task_types: string[] = Array.isArray(typesRaw)
    ? typesRaw.map((x) => String(x))
    : [];

  columns.sort((a, b) => a.position - b.position);
  tasks.sort((a, b) => a.position - b.position);
  return { columns, tasks, task_types };
}

function mapTask(row: {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  color: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: string | null;
  task_type: string | null;
  position: number;
  created_at: string;
}): KanbanTask {
  return {
    id: row.id,
    column_id: row.column_id,
    title: row.title,
    description: row.description,
    color: row.color,
    due_date: row.due_date,
    due_time: row.due_time,
    priority: row.priority as KanbanTask["priority"],
    task_type: row.task_type,
    position: row.position,
    created_at: row.created_at,
  };
}

/**
 * Default task type seeding is handled by the `fetch_kanban_snapshot` RPC.
 * This function just reads the existing labels.
 */
async function fetchTaskTypes(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("task_type_labels")
    .select("label")
    .eq("user_id", userId)
    .order("label");
  if (error) throw error;
  return (data ?? []).map((r) => r.label as string);
}

async function ensureTaskTypeLabel(
  supabase: SupabaseClient,
  userId: string,
  label: string | null | undefined,
): Promise<void> {
  const t = label?.trim();
  if (!t) return;
  const { error } = await supabase.from("task_type_labels").upsert(
    { user_id: userId, label: t },
    { onConflict: "user_id,label" },
  );
  if (error) throw error;
}

export async function registerTaskTypeLabelCloud(
  supabase: SupabaseClient,
  label: string,
): Promise<string[]> {
  const userId = await requireDataUserId(supabase);
  await ensureTaskTypeLabel(supabase, userId, label);
  return fetchTaskTypes(supabase, userId);
}

export async function getTaskTypeLabelsCloud(
  supabase: SupabaseClient,
): Promise<string[]> {
  const userId = await requireDataUserId(supabase);
  return fetchTaskTypes(supabase, userId);
}

export async function fetchBoardCloud(
  supabase: SupabaseClient,
): Promise<KanbanBoardSnapshot> {
  // The fetch_kanban_snapshot RPC uses auth.uid() internally via RLS.
  // No need for requireDataUserId() here — avoids a getUser() roundtrip race during bootstrap.
  const { data, error } = await supabase.rpc("fetch_kanban_snapshot");
  if (error) throw error;
  return parseRpcSnapshot(data);
}

export async function createColumnCloud(
  supabase: SupabaseClient,
  title: string,
  position: number,
): Promise<KanbanColumn> {
  const userId = await requireDataUserId(supabase);
  const now = new Date().toISOString();
  const id = generateId();
  const row = {
    id,
    user_id: userId,
    title,
    position,
    created_at: now,
  };
  const { data, error } = await supabase
    .from("kanban_columns")
    .insert(row)
    .select("id,title,position,created_at")
    .single();
  if (error) throw error;
  return mapColumn(data as Parameters<typeof mapColumn>[0]);
}

export async function updateColumnCloud(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<KanbanColumn, "title" | "position">>,
): Promise<KanbanColumn> {
  const userId = await requireDataUserId(supabase);
  const { data, error } = await supabase
    .from("kanban_columns")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id,title,position,created_at")
    .single();
  if (error) throw error;
  return mapColumn(data as Parameters<typeof mapColumn>[0]);
}

export async function deleteColumnCloud(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const userId = await requireDataUserId(supabase);
  const { error } = await supabase
    .from("kanban_columns")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function createTaskCloud(
  supabase: SupabaseClient,
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
  const userId = await requireDataUserId(supabase);
  const dueDate = task.due_date ?? null;
  const dueTime =
    dueDate && task.due_time?.trim() ? task.due_time.trim() : null;
  const id = generateId();
  const now = new Date().toISOString();
  await ensureTaskTypeLabel(supabase, userId, task.task_type);
  const row = {
    id,
    user_id: userId,
    column_id: task.column_id,
    title: task.title,
    description: task.description ?? null,
    color: task.color ?? null,
    due_date: dueDate,
    due_time: dueTime,
    priority: task.priority ?? null,
    task_type: task.task_type?.trim() || null,
    position: task.position,
    created_at: now,
  };
  const { data, error } = await supabase
    .from("kanban_tasks")
    .insert(row)
    .select(
      "id,column_id,title,description,color,due_date,due_time,priority,task_type,position,created_at",
    )
    .single();
  if (error) throw error;
  return mapTask(data as Parameters<typeof mapTask>[0]);
}

export async function updateTaskCloud(
  supabase: SupabaseClient,
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
  const userId = await requireDataUserId(supabase);

  const patch: Record<string, unknown> = { ...updates };

  // Resolve due_date/due_time without a read-before-write:
  // - If due_date is being set to null, due_time must also be null.
  // - If only one is changing, omit the other from the patch (DB keeps its value).
  // - If both are in the patch, apply the mutual-dependency rule directly.
  if (updates.due_date !== undefined && updates.due_time !== undefined) {
    const date = updates.due_date;
    patch.due_date = date;
    patch.due_time = date && updates.due_time?.trim() ? updates.due_time.trim() : null;
  } else if (updates.due_date !== undefined) {
    // Clearing the date must also clear the time.
    if (updates.due_date === null) {
      patch.due_date = null;
      patch.due_time = null;
    } else {
      patch.due_date = updates.due_date;
      // due_time not in patch — leave DB value unchanged by omitting it.
    }
  } else if (updates.due_time !== undefined) {
    // Only time is changing; date remains what it is in the DB.
    // We can't null-check date here without a read, so just set the time.
    patch.due_time = updates.due_time?.trim() || null;
  }

  if (updates.task_type !== undefined) {
    patch.task_type = updates.task_type?.trim() || null;
    await ensureTaskTypeLabel(supabase, userId, patch.task_type as string | null);
  }

  const { data, error } = await supabase
    .from("kanban_tasks")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select(
      "id,column_id,title,description,color,due_date,due_time,priority,task_type,position,created_at",
    )
    .single();
  if (error) throw error;
  return mapTask(data as Parameters<typeof mapTask>[0]);
}

export async function deleteTaskCloud(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const userId = await requireDataUserId(supabase);
  const { error } = await supabase
    .from("kanban_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function batchUpdateColumnPositionsCloud(
  supabase: SupabaseClient,
  items: { id: string; position: number }[],
): Promise<void> {
  if (items.length === 0) return;
  // RLS on the RPC enforces auth — no extra requireDataUserId needed.
  const { error } = await supabase.rpc("batch_update_kanban_column_positions", {
    p_updates: items.map((item) => ({
      id: item.id,
      position: item.position,
    })),
  });
  if (error) throw error;
}

export async function batchUpdateTaskPositionsCloud(
  supabase: SupabaseClient,
  items: { id: string; position: number; column_id?: string }[],
): Promise<void> {
  if (items.length === 0) return;
  // RLS on the RPC enforces auth — no extra requireDataUserId needed.
  const { error } = await supabase.rpc("batch_update_kanban_task_positions", {
    p_updates: items.map((item) => ({
      id: item.id,
      position: item.position,
      column_id:
        item.column_id !== undefined ? item.column_id : null,
    })),
  });
  if (error) throw error;
}
