import { isCloudDataBackend } from "@/lib/data/authSession";
import type { Flashcard, FlashcardDeck } from "@/lib/models/flashcards";
import * as cloud from "@/lib/data/cloud/flashcardsCloud";
import { browserSupabase } from "@/lib/supabase/client";
import {
  createDeckAction,
  updateDeckAction,
  deleteDeckAction,
  addCardAction,
  updateCardAction,
  deleteCardAction,
  saveDeckOrderAction,
} from "@/lib/actions/flashcards";

function notSignedIn(): Error {
  return new Error("Not signed in");
}

export function saveDeckOrder(decks: FlashcardDeck[]): void {
  if (!isCloudDataBackend()) return;
  const items = decks.map((d, position) => ({ id: d.id, position }));
  void saveDeckOrderAction(items).catch(() => {});
}

export async function fetchDecks(): Promise<FlashcardDeck[]> {
  return isCloudDataBackend()
    ? cloud.fetchDecksCloud(browserSupabase())
    : [];
}

export async function createDeck(
  deck: Pick<FlashcardDeck, "title" | "color">,
): Promise<FlashcardDeck> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await createDeckAction(deck);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateDeck(
  id: string,
  updates: Partial<Pick<FlashcardDeck, "title" | "color">>,
): Promise<Omit<FlashcardDeck, "cards">> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await updateDeckAction({ id, updates });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function deleteDeck(id: string): Promise<void> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await deleteDeckAction({ id });
  if (!result.ok) throw new Error(result.message);
}

export async function addCard(
  deckId: string,
  card: Pick<Flashcard, "front" | "back">,
): Promise<Flashcard> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await addCardAction({ deckId, ...card });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateCard(
  deckId: string,
  cardId: string,
  updates: Partial<Pick<Flashcard, "front" | "back">>,
): Promise<Flashcard> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await updateCardAction({ deckId, cardId, updates });
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function deleteCard(
  deckId: string,
  cardId: string,
): Promise<void> {
  if (!isCloudDataBackend()) throw notSignedIn();
  const result = await deleteCardAction({ deckId, cardId });
  if (!result.ok) throw new Error(result.message);
}
