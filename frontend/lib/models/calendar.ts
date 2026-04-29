import { ACCENT_COLORS } from "@/lib/constants";

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
