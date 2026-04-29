import { create } from "zustand";
import { toast } from "sonner";
import { getAuthUserId } from "@/lib/data/authSession";
import { toUserMessage } from "@/lib/toUserMessage";
import {
  fetchDecks,
  createDeck as apiCreateDeck,
  updateDeck as apiUpdateDeck,
  deleteDeck as apiDeleteDeck,
  addCard as apiAddCard,
  updateCard as apiUpdateCard,
  deleteCard as apiDeleteCard,
  saveDeckOrder,
} from "@/lib/data/flashcardsRepo";
import type { FlashcardDeck, Flashcard } from "@/lib/models/flashcards";

/** Coalesces concurrent `loadDecks` calls (bootstrap + page/chat context). */
let decksLoadInFlight: Promise<void> | null = null;
/** User id for which decks were last hydrated. */
let decksHydratedForUserId: string | null = null;

/** Clears session-local flashcards cache so next auth session refetches from API. */
export function resetFlashcardsSessionData(): void {
  decksLoadInFlight = null;
  decksHydratedForUserId = null;
  useFlashcards.setState({ decks: [], activeDeckId: null, isLoading: false });
}

interface FlashcardsState {
  decks: FlashcardDeck[];
  activeDeckId: string | null;
  isLoading: boolean;

  loadDecks: (options?: { force?: boolean }) => Promise<void>;
  addDeck: () => Promise<void>;
  editDeck: (id: string, updates: Partial<Pick<FlashcardDeck, "title" | "color">>) => Promise<void>;
  removeDeck: (id: string) => Promise<void>;
  setActiveDeck: (id: string | null) => void;
  reorderDecks: (activeId: string, overId: string) => void;

  // Card actions
  addCardToDeck: (deckId: string, front: string, back: string) => Promise<Flashcard>;
  editCard: (deckId: string, cardId: string, updates: Partial<Pick<Flashcard, "front" | "back">>) => Promise<void>;
  removeCard: (deckId: string, cardId: string) => Promise<void>;
}

export const useFlashcards = create<FlashcardsState>((set, get) => ({
  decks: [],
  activeDeckId: null,
  isLoading: false,

  loadDecks: async (options?: { force?: boolean }) => {
    const force = options?.force ?? false;
    const uid = getAuthUserId();
    if (
      !force &&
      get().decks.length > 0 &&
      uid != null &&
      decksHydratedForUserId === uid
    ) {
      if (get().isLoading) set({ isLoading: false });
      return;
    }

    if (decksLoadInFlight) return decksLoadInFlight;

    const run = (async () => {
      const uidAtStart = getAuthUserId();
      set({ isLoading: true });
      try {
        const decks = await fetchDecks();
        if (getAuthUserId() !== uidAtStart) {
          set({ isLoading: false });
          return;
        }
        decksHydratedForUserId = getAuthUserId();
        set({ decks, isLoading: false });
      } catch (err) {
        const msg = toUserMessage(err, "Failed to load decks");
        set({ isLoading: false });
        toast.error(msg);
      }
    })();

    decksLoadInFlight = run;
    try {
      await run;
    } finally {
      if (decksLoadInFlight === run) decksLoadInFlight = null;
    }
  },

  addDeck: async () => {
    try {
      const deck = await apiCreateDeck({ title: "Untitled Deck", color: null });
      set((s) => ({
        decks: [...s.decks, deck],
        activeDeckId: deck.id,
      }));
    } catch {
      toast.error("Failed to create deck");
    }
  },

  editDeck: async (id, updates) => {
    const prev = get().decks.find((d) => d.id === id);
    if (!prev) return;

    set((s) => ({
      decks: s.decks.map((d) =>
        d.id === id
          ? { ...d, ...updates, updated_at: new Date().toISOString() }
          : d,
      ),
    }));

    try {
      await apiUpdateDeck(id, updates);
    } catch {
      set((s) => ({
        decks: s.decks.map((d) => (d.id === id ? prev : d)),
      }));
      toast.error("Failed to update deck");
    }
  },

  removeDeck: async (id) => {
    const prev = get().decks;
    set((s) => ({
      decks: s.decks.filter((d) => d.id !== id),
      activeDeckId: s.activeDeckId === id ? null : s.activeDeckId,
    }));

    try {
      await apiDeleteDeck(id);
      toast.success("Deck deleted");
    } catch {
      set({ decks: prev });
      toast.error("Failed to delete deck");
    }
  },

  setActiveDeck: (id) => set({ activeDeckId: id }),

  reorderDecks: (activeId, overId) => {
    const decks = [...get().decks];
    const oldIndex = decks.findIndex((d) => d.id === activeId);
    const newIndex = decks.findIndex((d) => d.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const [moved] = decks.splice(oldIndex, 1);
    decks.splice(newIndex, 0, moved);
    set({ decks });
    saveDeckOrder(decks);
  },

  addCardToDeck: async (deckId, front, back) => {
    try {
      const card = await apiAddCard(deckId, { front, back });
      // Reload from storage to get the updated deck
      const decks = await fetchDecks();
      set({ decks });
      return card;
    } catch {
      toast.error("Failed to add card");
      throw new Error("Failed to add card");
    }
  },

  editCard: async (deckId, cardId, updates) => {
    try {
      await apiUpdateCard(deckId, cardId, updates);
      const decks = await fetchDecks();
      set({ decks });
    } catch {
      toast.error("Failed to update card");
    }
  },

  removeCard: async (deckId, cardId) => {
    try {
      await apiDeleteCard(deckId, cardId);
      const decks = await fetchDecks();
      set({ decks });
      toast.success("Card deleted");
    } catch {
      toast.error("Failed to delete card");
    }
  },
}));
