"use server";

import { z } from "zod";
import { getServerSessionUser } from "@/lib/supabase/serverSession";
import type { ActionResult } from "@/lib/actions/types";
import type { CalendarEvent } from "@/lib/models/calendar";
import * as cloud from "@/lib/data/cloud/calendarCloud";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(4000).nullable(),
  start: z.string().min(1).max(64),
  end: z.string().min(1).max(64),
  all_day: z.boolean(),
  color: z.string().max(20).nullable(),
});

const updateEventSchema = z.object({
  id: z.string().uuid(),
  updates: z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(4000).nullable().optional(),
    start: z.string().min(1).max(64).optional(),
    end: z.string().min(1).max(64).optional(),
    all_day: z.boolean().optional(),
    color: z.string().max(20).nullable().optional(),
  }),
});

const deleteEventSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createEventAction(
  input: unknown,
): Promise<ActionResult<CalendarEvent>> {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the calendar." };
  }
  try {
    const event = await cloud.createEventCloud(supabase, parsed.data);
    return { ok: true, data: event };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to create event" };
  }
}

export async function updateEventAction(
  input: unknown,
): Promise<ActionResult<CalendarEvent>> {
  const parsed = updateEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the calendar." };
  }
  try {
    const event = await cloud.updateEventCloud(supabase, parsed.data.id, parsed.data.updates);
    return { ok: true, data: event };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to update event" };
  }
}

export async function deleteEventAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = deleteEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use the calendar." };
  }
  try {
    await cloud.deleteEventCloud(supabase, parsed.data.id);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to delete event" };
  }
}
