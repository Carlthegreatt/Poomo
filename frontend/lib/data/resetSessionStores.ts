import { resetCalendarSessionData } from "@/stores/calendarStore";
import { resetFlashcardsSessionData } from "@/stores/flashcardsStore";
import { resetKanbanSessionData } from "@/stores/kanbanStore";
import { resetNotesSessionData } from "@/stores/notesStore";
import { useStats } from "@/stores/statsStore";

/**
 * Clears domain stores when auth session ends or before loading a new user.
 * Without this, `loadBoard()` and similar helpers skip network fetches while
 * still holding the previous user's rows in memory.
 */
export function resetClientStoresForAuthChange(): void {
  resetKanbanSessionData();
  resetNotesSessionData();
  resetCalendarSessionData();
  useStats.setState({ sessions: [], isLoading: false, error: null });
  resetFlashcardsSessionData();
}
