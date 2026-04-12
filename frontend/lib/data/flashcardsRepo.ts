import { isCloudDataBackend } from "@/lib/data/authSession";
import type { Flashcard, FlashcardDeck } from "@/lib/flashcardsModel";
import * as local from "@/lib/data/local/flashcardsLocal";
import * as cloud from "@/lib/data/cloud/flashcardsCloud";
import { browserSupabase } from "@/lib/supabase/client";

export function saveDeckOrder(decks: FlashcardDeck[]): void {
  if (isCloudDataBackend()) {
    void cloud.saveDeckOrderCloud(browserSupabase(), decks).catch(() => {});
    return;
  }
  local.saveDeckOrderLocal(decks);
}

export async function fetchDecks(): Promise<FlashcardDeck[]> {
  return isCloudDataBackend()
    ? cloud.fetchDecksCloud(browserSupabase())
    : local.fetchDecksLocal();
}

export async function createDeck(
  deck: Pick<FlashcardDeck, "title" | "color">,
): Promise<FlashcardDeck> {
  return isCloudDataBackend()
    ? cloud.createDeckCloud(browserSupabase(), deck)
    : local.createDeckLocal(deck);
}

export async function updateDeck(
  id: string,
  updates: Partial<Pick<FlashcardDeck, "title" | "color">>,
): Promise<FlashcardDeck> {
  return isCloudDataBackend()
    ? cloud.updateDeckCloud(browserSupabase(), id, updates)
    : local.updateDeckLocal(id, updates);
}

export async function deleteDeck(id: string): Promise<void> {
  return isCloudDataBackend()
    ? cloud.deleteDeckCloud(browserSupabase(), id)
    : local.deleteDeckLocal(id);
}

export async function addCard(
  deckId: string,
  card: Pick<Flashcard, "front" | "back">,
): Promise<Flashcard> {
  return isCloudDataBackend()
    ? cloud.addCardCloud(browserSupabase(), deckId, card)
    : local.addCardLocal(deckId, card);
}

export async function updateCard(
  deckId: string,
  cardId: string,
  updates: Partial<Pick<Flashcard, "front" | "back">>,
): Promise<Flashcard> {
  return isCloudDataBackend()
    ? cloud.updateCardCloud(browserSupabase(), deckId, cardId, updates)
    : local.updateCardLocal(deckId, cardId, updates);
}

export async function deleteCard(
  deckId: string,
  cardId: string,
): Promise<void> {
  return isCloudDataBackend()
    ? cloud.deleteCardCloud(browserSupabase(), deckId, cardId)
    : local.deleteCardLocal(deckId, cardId);
}
