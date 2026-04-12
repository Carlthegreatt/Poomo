export type { Flashcard, FlashcardDeck } from "@/lib/flashcardsModel";
export { DECK_COLORS } from "@/lib/flashcardsModel";

export {
  saveDeckOrder,
  fetchDecks,
  createDeck,
  updateDeck,
  deleteDeck,
  addCard,
  updateCard,
  deleteCard,
} from "@/lib/data/flashcardsRepo";
