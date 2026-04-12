import { isCloudDataBackend } from "@/lib/data/authSession";
import type { CalendarEvent } from "@/lib/calendarModel";
import * as local from "@/lib/data/local/calendarLocal";
import * as cloud from "@/lib/data/cloud/calendarCloud";
import { browserSupabase } from "@/lib/supabase/client";

export async function fetchEvents(): Promise<CalendarEvent[]> {
  return isCloudDataBackend()
    ? cloud.fetchEventsCloud(browserSupabase())
    : local.fetchEventsLocal();
}

export async function createEvent(
  event: Omit<CalendarEvent, "id" | "created_at">,
): Promise<CalendarEvent> {
  return isCloudDataBackend()
    ? cloud.createEventCloud(browserSupabase(), event)
    : local.createEventLocal(event);
}

export async function updateEvent(
  id: string,
  updates: Partial<Omit<CalendarEvent, "id" | "created_at">>,
): Promise<CalendarEvent> {
  return isCloudDataBackend()
    ? cloud.updateEventCloud(browserSupabase(), id, updates)
    : local.updateEventLocal(id, updates);
}

export async function deleteEvent(id: string): Promise<void> {
  return isCloudDataBackend()
    ? cloud.deleteEventCloud(browserSupabase(), id)
    : local.deleteEventLocal(id);
}
