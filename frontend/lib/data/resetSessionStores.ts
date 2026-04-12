import { useCalendar } from "@/stores/calendarStore";
import { useFlashcards } from "@/stores/flashcardsStore";
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
  useCalendar.setState({ events: [], kanbanTasks: [], isLoading: false });
  useStats.setState({ sessions: [], isLoading: false });
  useFlashcards.setState({ decks: [], activeDeckId: null, isLoading: false });
}
