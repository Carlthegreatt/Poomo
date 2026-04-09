import { readJSON, writeJSON, generateId } from "@/lib/storage";
import { ACCENT_COLORS, STORAGE_KEYS } from "@/lib/constants";

export { ACCENT_COLORS as EVENT_COLORS };

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  all_day: boolean;
  color: string | null;
  created_at: string;
}

function readEvents(): CalendarEvent[] {
  return readJSON<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []);
}

function writeEvents(events: CalendarEvent[]): void {
  writeJSON(STORAGE_KEYS.CALENDAR, events);
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  return readEvents();
}

export async function createEvent(
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

export async function updateEvent(
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

export async function deleteEvent(id: string): Promise<void> {
  const events = readEvents();
  writeEvents(events.filter((e) => e.id !== id));
}
