import { readJSON, writeJSON, generateId } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import type { CalendarEvent } from "@/lib/calendarModel";

function readEvents(): CalendarEvent[] {
  return readJSON<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []);
}

function writeEvents(events: CalendarEvent[]): void {
  writeJSON(STORAGE_KEYS.CALENDAR, events);
}

export async function fetchEventsLocal(): Promise<CalendarEvent[]> {
  return readEvents();
}

export async function createEventLocal(
  event: Omit<CalendarEvent, "id" | "created_at">,
): Promise<CalendarEvent> {
  const events = readEvents();
  const newEvent: CalendarEvent = {
    ...event,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  events.push(newEvent);
  writeEvents(events);
  return newEvent;
}

export async function updateEventLocal(
  id: string,
  updates: Partial<Omit<CalendarEvent, "id" | "created_at">>,
): Promise<CalendarEvent> {
  const events = readEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Event not found");
  events[idx] = { ...events[idx], ...updates };
  writeEvents(events);
  return events[idx];
}

export async function deleteEventLocal(id: string): Promise<void> {
  const events = readEvents();
  writeEvents(events.filter((e) => e.id !== id));
}
