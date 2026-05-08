import { resetCalendarSessionData } from "@/stores/calendarStore";
import { resetFlashcardsSessionData } from "@/stores/flashcardsStore";
import { resetKanbanSessionData } from "@/stores/kanbanStore";
import { resetNotesSessionData } from "@/stores/notesStore";
import { resetStatsSessionData } from "@/stores/statsStore";

/**
 * Clears domain stores when auth session ends or before loading a new user.
 * Without this, `loadBoard()` and similar helpers skip network fetches while
 * still holding the previous user's rows in memory.
 */
export function resetClientStoresForAuthChange(): void {
  resetKanbanSessionData();
  resetNotesSessionData();
  resetCalendarSessionData();
  resetStatsSessionData();
  resetFlashcardsSessionData();
}
