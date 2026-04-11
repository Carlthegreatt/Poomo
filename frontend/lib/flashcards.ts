import { readJSON, writeJSON, generateId } from "@/lib/storage";
import { ACCENT_COLORS, STORAGE_KEYS } from "@/lib/constants";

export { ACCENT_COLORS as DECK_COLORS };

/* ── Types ── */

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

/* ── Helpers ── */

function readDecks(): FlashcardDeck[] {
  return readJSON<FlashcardDeck[]>(STORAGE_KEYS.FLASHCARDS, []);
}

function writeDecks(decks: FlashcardDeck[]): void {
  writeJSON(STORAGE_KEYS.FLASHCARDS, decks);
}

/* ── Deck CRUD ── */

export function saveDeckOrder(decks: FlashcardDeck[]): void {
  writeDecks(decks);
}

export async function fetchDecks(): Promise<FlashcardDeck[]> {
  return readDecks();
}

export async function createDeck(
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

export async function updateDeck(
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

export async function deleteDeck(id: string): Promise<void> {
  const decks = readDecks();
  writeDecks(decks.filter((d) => d.id !== id));
}

/* ── Card CRUD ── */

export async function addCard(
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

export async function updateCard(
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

export async function deleteCard(
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
