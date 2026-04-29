import { isCloudDataBackend } from "@/lib/data/authSession";
import type { CalendarEvent } from "@/lib/models/calendar";
import * as cloud from "@/lib/data/cloud/calendarCloud";
import { browserSupabase } from "@/lib/supabase/client";
import {
  createEventAction,
  updateEventAction,
  deleteEventAction,
} from "@/lib/actions/calendar";

function notSignedIn(): Error {
  return new Error("Not signed in");
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  return isCloudDataBackend()
    ? cloud.fetchEventsCloud(browserSupabase())
    : [];
}

export async function createEvent(
  event: Omit<CalendarEvent, "id" | "created_at">,
): Promise<CalendarEvent> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await createEventAction(event);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateEvent(
  id: string,
  updates: Partial<Omit<CalendarEvent, "id" | "created_at">>,
): Promise<CalendarEvent> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await updateEventAction({ id, updates });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function deleteEvent(id: string): Promise<void> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await deleteEventAction({ id });
  if (!result.ok) throw new Error(result.message);
}
