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

export const EVENT_COLORS = [
  "#FFC567",
  "#FB7DA8",
  "#FD5A46",
  "#552CB7",
  "#00995E",
  "#058CD7",
] as const;

const STORAGE_KEY = "poomo-calendar";

function readStorage(): CalendarEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CalendarEvent[];
  } catch {
    return [];
  }
}

function writeStorage(events: CalendarEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  return readStorage();
}

export async function createEvent(
  event: Omit<CalendarEvent, "id" | "created_at">,
): Promise<CalendarEvent> {
  const events = readStorage();
  const newEvent: CalendarEvent = {
    ...event,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  events.push(newEvent);
  writeStorage(events);
  return newEvent;
}

export async function updateEvent(
  id: string,
  updates: Partial<Omit<CalendarEvent, "id" | "created_at">>,
): Promise<CalendarEvent> {
  const events = readStorage();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error("Event not found");
  events[idx] = { ...events[idx], ...updates };
  writeStorage(events);
  return events[idx];
}

export async function deleteEvent(id: string): Promise<void> {
  const events = readStorage();
  writeStorage(events.filter((e) => e.id !== id));
}
