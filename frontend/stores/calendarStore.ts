import { create } from "zustand";
import { toast } from "sonner";
import { getAuthUserId, waitForAuthHydration } from "@/lib/data/authSession";
import { toUserMessage } from "@/lib/toUserMessage";
import {
  fetchEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
} from "@/lib/data/calendarRepo";
import type { CalendarEvent } from "@/lib/models/calendar";

/** Coalesces concurrent `loadEvents` calls (bootstrap + page/chat context). */
let eventsLoadInFlight: Promise<void> | null = null;
/** User id for which events were last hydrated. */
let eventsHydratedForUserId: string | null = null;

/** Clears session-local event cache so next auth session refetches from API. */
export function resetCalendarSessionData(): void {
  eventsLoadInFlight = null;
  eventsHydratedForUserId = null;
  useCalendar.setState({ events: [], isLoading: false });
}

export interface CalendarEntry {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string | null;
}

interface CalendarState {
  events: CalendarEvent[];
  isLoading: boolean;

  loadEvents: (options?: { force?: boolean }) => Promise<void>;
  getEntries: () => CalendarEntry[];

  addEvent: (event: Omit<CalendarEvent, "id" | "created_at">) => Promise<void>;
  editEvent: (
    id: string,
    updates: Partial<Omit<CalendarEvent, "id" | "created_at">>,
  ) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
}

function eventsToEntries(events: CalendarEvent[]): CalendarEntry[] {
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    start: new Date(e.start),
    end: new Date(e.end),
    allDay: e.all_day,
    color: e.color,
  }));
}

export const useCalendar = create<CalendarState>((set, get) => ({
  events: [],
  isLoading: false,

  loadEvents: async (options?: { force?: boolean }) => {
    const force = options?.force ?? false;
    await waitForAuthHydration();
    const uid = getAuthUserId();
    if (
      !force &&
      get().events.length > 0 &&
      uid != null &&
      eventsHydratedForUserId === uid
    ) {
      if (get().isLoading) set({ isLoading: false });
      return;
    }

    if (eventsLoadInFlight) return eventsLoadInFlight;

    const run = (async () => {
      const uidAtStart = getAuthUserId();
      set({ isLoading: true });
      try {
        const events = await fetchEvents();
        if (getAuthUserId() !== uidAtStart) {
          set({ isLoading: false });
          return;
        }
        eventsHydratedForUserId = getAuthUserId();
        set({ events, isLoading: false });
      } catch (err) {
        const msg = toUserMessage(err, "Failed to load events");
        set({ isLoading: false });
        toast.error(msg);
      }
    })();

    eventsLoadInFlight = run;
    try {
      await run;
    } finally {
      if (eventsLoadInFlight === run) eventsLoadInFlight = null;
    }
  },

  getEntries: () => eventsToEntries(get().events),

  addEvent: async (event) => {
    const tempId = `temp-${Date.now()}`;
    const optimistic: CalendarEvent = {
      ...event,
      id: tempId,
      created_at: new Date().toISOString(),
    };

    set((s) => ({ events: [...s.events, optimistic] }));

    try {
      const real = await apiCreateEvent(event);
      set((s) => ({
        events: s.events.map((e) => (e.id === tempId ? real : e)),
      }));
    } catch {
      set((s) => ({ events: s.events.filter((e) => e.id !== tempId) }));
      toast.error("Failed to create event");
    }
  },

  editEvent: async (id, updates) => {
    const prev = get().events.find((e) => e.id === id);
    if (!prev) return;

    set((s) => ({
      events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));

    try {
      await apiUpdateEvent(id, updates);
    } catch {
      set((s) => ({
        events: s.events.map((e) => (e.id === id ? prev : e)),
      }));
      toast.error("Failed to update event");
    }
  },

  removeEvent: async (id) => {
    const prev = get().events;
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));

    try {
      await apiDeleteEvent(id);
    } catch {
      set({ events: prev });
      toast.error("Failed to delete event");
    }
  },
}));
