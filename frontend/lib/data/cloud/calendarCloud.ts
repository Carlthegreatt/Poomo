import type { SupabaseClient } from "@supabase/supabase-js";
import { generateId } from "@/lib/storage";
import type { CalendarEvent } from "@/lib/models/calendar";
import { requireDataUserId } from "@/lib/data/cloud/supabaseDataUser";
import {
  CALENDAR_FUTURE_MONTHS,
  CALENDAR_PAST_MONTHS,
} from "@/lib/data/fetchLimits";

function mapEvent(row: {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string | null;
  created_at: string;
}): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    start: row.start_at,
    end: row.end_at,
    all_day: row.all_day,
    color: row.color,
    created_at: row.created_at,
  };
}

function calendarFetchWindow(): { windowStart: Date; windowEnd: Date } {
  const now = new Date();

  // Window start: first day of the month `CALENDAR_PAST_MONTHS` ago
  const windowStart = new Date(
    now.getFullYear(),
    now.getMonth() - CALENDAR_PAST_MONTHS,
    1,
    0, 0, 0, 0,
  );

  // Window end: last day of the month `CALENDAR_FUTURE_MONTHS` ahead
  // day=0 gives the last day of the previous month, so (month + future + 1, 0)
  const windowEnd = new Date(
    now.getFullYear(),
    now.getMonth() + CALENDAR_FUTURE_MONTHS + 1,
    0,
    23, 59, 59, 999,
  );
  return { windowStart, windowEnd };
}

export async function fetchEventsCloud(
  supabase: SupabaseClient,
): Promise<CalendarEvent[]> {
  // RLS policies filter by auth.uid() automatically.
  const { windowStart, windowEnd } = calendarFetchWindow();
  const { data, error } = await supabase
    .from("calendar_events")
    .select(
      "id,title,description,start_at,end_at,all_day,color,created_at",
    )
    .gte("end_at", windowStart.toISOString())
    .lte("start_at", windowEnd.toISOString())
    .order("start_at");
  if (error) throw error;
  return (data ?? []).map((r) =>
    mapEvent(r as Parameters<typeof mapEvent>[0]),
  );
}

export async function createEventCloud(
  supabase: SupabaseClient,
  event: Omit<CalendarEvent, "id" | "created_at">,
): Promise<CalendarEvent> {
  const userId = await requireDataUserId(supabase);
  const id = generateId();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: userId,
    title: event.title,
    description: event.description,
    start_at: event.start,
    end_at: event.end,
    all_day: event.all_day,
    color: event.color,
    created_at: now,
  };
  const { data, error } = await supabase
    .from("calendar_events")
    .insert(row)
    .select(
      "id,title,description,start_at,end_at,all_day,color,created_at",
    )
    .single();
  if (error) throw error;
  return mapEvent(data as Parameters<typeof mapEvent>[0]);
}

export async function updateEventCloud(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<CalendarEvent, "id" | "created_at">>,
): Promise<CalendarEvent> {
  const userId = await requireDataUserId(supabase);
  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.start !== undefined) patch.start_at = updates.start;
  if (updates.end !== undefined) patch.end_at = updates.end;
  if (updates.all_day !== undefined) patch.all_day = updates.all_day;
  if (updates.color !== undefined) patch.color = updates.color;

  const { data, error } = await supabase
    .from("calendar_events")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select(
      "id,title,description,start_at,end_at,all_day,color,created_at",
    )
    .single();
  if (error) throw error;
  return mapEvent(data as Parameters<typeof mapEvent>[0]);
}

export async function deleteEventCloud(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const userId = await requireDataUserId(supabase);
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
