import { readJSON, writeJSON, generateId } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";
import type { Flashcard, FlashcardDeck } from "@/lib/flashcardsModel";

function readDecks(): FlashcardDeck[] {
  return readJSON<FlashcardDeck[]>(STORAGE_KEYS.FLASHCARDS, []);
}

function writeDecks(decks: FlashcardDeck[]): void {
  writeJSON(STORAGE_KEYS.FLASHCARDS, decks);
}

export function saveDeckOrderLocal(decks: FlashcardDeck[]): void {
  writeDecks(decks);
}

export async function fetchDecksLocal(): Promise<FlashcardDeck[]> {
  return readDecks();
}

export async function createDeckLocal(
  deck: Pick<FlashcardDeck, "title" | "color">,
): Promise<FlashcardDeck> {
  const decks = readDecks();
  const now = new Date().toISOString();
  const newDeck: FlashcardDeck = {
    id: generateId(),
    title: deck.title,
    color: deck.color,
    cards: [],
    created_at: now,
    updated_at: now,
  };
  decks.push(newDeck);
  writeDecks(decks);
  return newDeck;
}

export async function updateDeckLocal(
  id: string,
  updates: Partial<Pick<FlashcardDeck, "title" | "color">>,
): Promise<FlashcardDeck> {
  const decks = readDecks();
  const idx = decks.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error("Deck not found");
  decks[idx] = {
    ...decks[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  writeDecks(decks);
  return decks[idx];
}

export async function deleteDeckLocal(id: string): Promise<void> {
  const decks = readDecks();
  writeDecks(decks.filter((d) => d.id !== id));
}

export async function addCardLocal(
  deckId: string,
  card: Pick<Flashcard, "front" | "back">,
): Promise<Flashcard> {
  const decks = readDecks();
  const idx = decks.findIndex((d) => d.id === deckId);
  if (idx === -1) throw new Error("Deck not found");

  const newCard: Flashcard = {
    id: generateId(),
    front: card.front,
    back: card.back,
    created_at: new Date().toISOString(),
  };
  decks[idx].cards.push(newCard);
  decks[idx].updated_at = new Date().toISOString();
  writeDecks(decks);
  return newCard;
}

export async function updateCardLocal(
  deckId: string,
  cardId: string,
  updates: Partial<Pick<Flashcard, "front" | "back">>,
): Promise<Flashcard> {
  const decks = readDecks();
  const dIdx = decks.findIndex((d) => d.id === deckId);
  if (dIdx === -1) throw new Error("Deck not found");

  const cIdx = decks[dIdx].cards.findIndex((c) => c.id === cardId);
  if (cIdx === -1) throw new Error("Card not found");

  decks[dIdx].cards[cIdx] = { ...decks[dIdx].cards[cIdx], ...updates };
  decks[dIdx].updated_at = new Date().toISOString();
  writeDecks(decks);
  return decks[dIdx].cards[cIdx];
}

export async function deleteCardLocal(
  deckId: string,
  cardId: string,
): Promise<void> {
  const decks = readDecks();
  const dIdx = decks.findIndex((d) => d.id === deckId);
  if (dIdx === -1) throw new Error("Deck not found");

  decks[dIdx].cards = decks[dIdx].cards.filter((c) => c.id !== cardId);
  decks[dIdx].updated_at = new Date().toISOString();
  writeDecks(decks);
}
