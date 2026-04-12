export type { CalendarEvent } from "@/lib/calendarModel";
export { EVENT_COLORS } from "@/lib/calendarModel";

export {
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "@/lib/data/calendarRepo";
