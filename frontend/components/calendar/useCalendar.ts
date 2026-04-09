import { create } from "zustand";
import { toast } from "sonner";
import {
  fetchEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
  type CalendarEvent,
} from "@/lib/calendar";
import { type KanbanTask } from "@/lib/kanban";

export interface CalendarEntry {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string | null;
  source: "calendar" | "kanban";
}

interface CalendarState {
  events: CalendarEvent[];
  kanbanTasks: KanbanTask[];
  isLoading: boolean;

  loadEvents: () => Promise<void>;
  setKanbanTasks: (tasks: KanbanTask[]) => void;
  getEntries: () => CalendarEntry[];

  addEvent: (event: Omit<CalendarEvent, "id" | "created_at">) => Promise<void>;
  editEvent: (
    id: string,
    updates: Partial<Omit<CalendarEvent, "id" | "created_at">>,
  ) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
}

export const useCalendar = create<CalendarState>((set, get) => ({
  events: [],
  kanbanTasks: [],
  isLoading: false,

  loadEvents: async () => {
    set({ isLoading: true });
    try {
      const events = await fetchEvents();
      set({ events, isLoading: false });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load events";
      set({ isLoading: false });
      toast.error(msg);
    }
  },

  setKanbanTasks: (tasks) => set({ kanbanTasks: tasks }),

  getEntries: () => {
    const { events, kanbanTasks } = get();

    const calendarEntries: CalendarEntry[] = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      start: new Date(e.start),
      end: new Date(e.end),
      allDay: e.all_day,
      color: e.color,
      source: "calendar" as const,
    }));

    const kanbanEntries: CalendarEntry[] = kanbanTasks
      .filter((t) => t.due_date)
      .map((t) => {
        const date = new Date(t.due_date!);
        return {
          id: `kanban-${t.id}`,
          title: t.title,
          description: t.description,
          start: date,
          end: date,
          allDay: true,
          color: t.color,
          source: "kanban" as const,
        };
      });

    return [...calendarEntries, ...kanbanEntries];
  },

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
