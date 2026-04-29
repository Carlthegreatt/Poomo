"use server";

import { z } from "zod";
import { getServerSessionUser } from "@/lib/supabase/serverSession";
import type { ActionResult } from "@/lib/actions/types";
import type { Note } from "@/lib/models/notes";
import * as cloud from "@/lib/data/cloud/notesCloud";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createNoteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().max(100_000),
  color: z.string().max(20).nullable(),
  pinned: z.boolean(),
});

const updateNoteSchema = z.object({
  id: z.string().uuid(),
  updates: z.object({
    title: z.string().min(1).max(500).optional(),
    content: z.string().max(100_000).optional(),
    color: z.string().max(20).nullable().optional(),
    pinned: z.boolean().optional(),
  }),
});

const deleteNoteSchema = z.object({
  id: z.string().uuid(),
});

const saveNoteOrderSchema = z.array(
  z.object({
    id: z.string().uuid(),
    position: z.number().int().nonnegative(),
  }),
);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createNoteAction(
  input: unknown,
): Promise<ActionResult<Note>> {
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use notes." };
  }
  try {
    const note = await cloud.createNoteCloud(supabase, parsed.data);
    return { ok: true, data: note };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to create note" };
  }
}

export async function updateNoteAction(
  input: unknown,
): Promise<ActionResult<Note>> {
  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use notes." };
  }
  try {
    const note = await cloud.updateNoteCloud(supabase, parsed.data.id, parsed.data.updates);
    return { ok: true, data: note };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to update note" };
  }
}

export async function deleteNoteAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = deleteNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use notes." };
  }
  try {
    await cloud.deleteNoteCloud(supabase, parsed.data.id);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to delete note" };
  }
}

export async function saveNoteOrderAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = saveNoteOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use notes." };
  }
  try {
    // Build minimal Note-shaped objects for the cloud function
    const notes = parsed.data.map((item) => ({
      id: item.id,
      title: "",
      content: "",
      color: null,
      pinned: false,
      created_at: "",
      updated_at: "",
    }));
    await cloud.saveNoteOrderCloud(supabase, notes);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to save note order" };
  }
}
