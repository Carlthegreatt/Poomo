"use server";

import { z } from "zod";
import { getServerSessionUser } from "@/lib/supabase/serverSession";
import type { ActionResult } from "@/lib/actions/types";
import type { KanbanColumn, KanbanTask } from "@/lib/models/kanban";
import * as cloud from "@/lib/data/cloud/kanbanCloud";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createColumnSchema = z.object({
  title: z.string().min(1).max(200),
  position: z.number().int().nonnegative(),
});

const updateColumnSchema = z.object({
  id: z.string().uuid(),
  updates: z.object({
    title: z.string().min(1).max(200).optional(),
    position: z.number().int().nonnegative().optional(),
  }),
});

const deleteColumnSchema = z.object({
  id: z.string().uuid(),
});

const createTaskSchema = z.object({
  column_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  position: z.number().int().nonnegative(),
  description: z.string().max(4000).nullish(),
  color: z.string().max(20).nullish(),
  due_date: z.string().max(32).nullish(),
  due_time: z.string().max(8).nullish(),
  priority: z.enum(["low", "medium", "high"]).nullish(),
  task_type: z.string().max(80).nullish(),
});

const updateTaskSchema = z.object({
  id: z.string().uuid(),
  updates: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(4000).nullish(),
    color: z.string().max(20).nullish(),
    due_date: z.string().max(32).nullish(),
    due_time: z.string().max(8).nullish(),
    priority: z.enum(["low", "medium", "high"]).nullish(),
    task_type: z.string().max(80).nullish(),
    column_id: z.string().uuid().optional(),
    position: z.number().int().nonnegative().optional(),
  }),
});

const deleteTaskSchema = z.object({
  id: z.string().uuid(),
});

const batchColumnPositionsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    position: z.number().int().nonnegative(),
  }),
);

const batchTaskPositionsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    position: z.number().int().nonnegative(),
    column_id: z.string().uuid().optional(),
  }),
);

const registerTaskTypeLabelSchema = z.string().min(1).max(80);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createColumnAction(
  input: unknown,
): Promise<ActionResult<KanbanColumn>> {
  const parsed = createColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the board." };
  }
  try {
    const column = await cloud.createColumnCloud(supabase, parsed.data.title, parsed.data.position);
    return { ok: true, data: column };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to create column" };
  }
}

export async function updateColumnAction(
  input: unknown,
): Promise<ActionResult<KanbanColumn>> {
  const parsed = updateColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the board." };
  }
  try {
    const column = await cloud.updateColumnCloud(supabase, parsed.data.id, parsed.data.updates);
    return { ok: true, data: column };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to update column" };
  }
}

export async function deleteColumnAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = deleteColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the board." };
  }
  try {
    await cloud.deleteColumnCloud(supabase, parsed.data.id);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to delete column" };
  }
}

export async function createTaskAction(
  input: unknown,
): Promise<ActionResult<KanbanTask>> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the board." };
  }
  try {
    const task = await cloud.createTaskCloud(supabase, {
      column_id: parsed.data.column_id,
      title: parsed.data.title,
      position: parsed.data.position,
      description: parsed.data.description ?? undefined,
      color: parsed.data.color ?? undefined,
      due_date: parsed.data.due_date ?? undefined,
      due_time: parsed.data.due_time ?? undefined,
      priority: parsed.data.priority ?? undefined,
      task_type: parsed.data.task_type ?? undefined,
    });
    return { ok: true, data: task };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to create task" };
  }
}

export async function updateTaskAction(
  input: unknown,
): Promise<ActionResult<KanbanTask>> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the board." };
  }
  try {
    const task = await cloud.updateTaskCloud(supabase, parsed.data.id, parsed.data.updates);
    return { ok: true, data: task };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to update task" };
  }
}

export async function deleteTaskAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = deleteTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the board." };
  }
  try {
    await cloud.deleteTaskCloud(supabase, parsed.data.id);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to delete task" };
  }
}

export async function batchUpdateColumnPositionsAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = batchColumnPositionsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the board." };
  }
  try {
    await cloud.batchUpdateColumnPositionsCloud(supabase, parsed.data);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to save column order" };
  }
}

export async function batchUpdateTaskPositionsAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = batchTaskPositionsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the board." };
  }
  try {
    await cloud.batchUpdateTaskPositionsCloud(supabase, parsed.data);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to save task order" };
  }
}

export async function registerTaskTypeLabelAction(
  input: unknown,
): Promise<ActionResult<string[]>> {
  const parsed = registerTaskTypeLabelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the board." };
  }
  try {
    const labels = await cloud.registerTaskTypeLabelCloud(supabase, parsed.data);
    return { ok: true, data: labels };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to register task type" };
  }
}
