"use server";

import { z } from "zod";
import { getServerSessionUser } from "@/lib/supabase/serverSession";
import type { ActionResult } from "@/lib/actions/types";
import type { Flashcard, FlashcardDeck } from "@/lib/models/flashcards";
import * as cloud from "@/lib/data/cloud/flashcardsCloud";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createDeckSchema = z.object({
  title: z.string().min(1).max(500),
  color: z.string().max(20).nullable(),
});

const updateDeckSchema = z.object({
  id: z.string().uuid(),
  updates: z.object({
    title: z.string().min(1).max(500).optional(),
    color: z.string().max(20).nullable().optional(),
  }),
});

const deleteDeckSchema = z.object({
  id: z.string().uuid(),
});

const addCardSchema = z.object({
  deckId: z.string().uuid(),
  front: z.string().min(1).max(4000),
  back: z.string().min(1).max(4000),
});

const updateCardSchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string().uuid(),
  updates: z.object({
    front: z.string().min(1).max(4000).optional(),
    back: z.string().min(1).max(4000).optional(),
  }),
});

const deleteCardSchema = z.object({
  deckId: z.string().uuid(),
  cardId: z.string().uuid(),
});

const saveDeckOrderSchema = z.array(
  z.object({
    id: z.string().uuid(),
    position: z.number().int().nonnegative(),
  }),
);

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createDeckAction(
  input: unknown,
): Promise<ActionResult<FlashcardDeck>> {
  const parsed = createDeckSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use flashcards." };
  }
  try {
    const deck = await cloud.createDeckCloud(supabase, parsed.data);
    return { ok: true, data: deck };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to create deck" };
  }
}

export async function updateDeckAction(
  input: unknown,
): Promise<ActionResult<Omit<FlashcardDeck, "cards">>> {
  const parsed = updateDeckSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use flashcards." };
  }
  try {
    const deck = await cloud.updateDeckCloud(supabase, parsed.data.id, parsed.data.updates);
    return { ok: true, data: deck };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to update deck" };
  }
}

export async function deleteDeckAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = deleteDeckSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use flashcards." };
  }
  try {
    await cloud.deleteDeckCloud(supabase, parsed.data.id);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to delete deck" };
  }
}

export async function addCardAction(
  input: unknown,
): Promise<ActionResult<Flashcard>> {
  const parsed = addCardSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use flashcards." };
  }
  try {
    const card = await cloud.addCardCloud(supabase, parsed.data.deckId, {
      front: parsed.data.front,
      back: parsed.data.back,
    });
    return { ok: true, data: card };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to add card" };
  }
}

export async function updateCardAction(
  input: unknown,
): Promise<ActionResult<Flashcard>> {
  const parsed = updateCardSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use flashcards." };
  }
  try {
    const card = await cloud.updateCardCloud(
      supabase,
      parsed.data.deckId,
      parsed.data.cardId,
      parsed.data.updates,
    );
    return { ok: true, data: card };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to update card" };
  }
}

export async function deleteCardAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = deleteCardSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use flashcards." };
  }
  try {
    await cloud.deleteCardCloud(supabase, parsed.data.deckId, parsed.data.cardId);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to delete card" };
  }
}

export async function saveDeckOrderAction(
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = saveDeckOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to use flashcards." };
  }
  try {
    // Build minimal deck-shaped objects for the cloud function
    const decks = parsed.data.map((item) => ({
      id: item.id,
      title: "",
      color: null,
      cards: [],
      created_at: "",
      updated_at: "",
    }));
    await cloud.saveDeckOrderCloud(supabase, decks);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to save deck order" };
  }
}
