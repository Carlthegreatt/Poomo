import { ACCENT_COLORS } from "@/lib/constants";

export { ACCENT_COLORS as DECK_COLORS };

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  created_at: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  color: string | null;
  cards: Flashcard[];
  created_at: string;
  updated_at: string;
}
