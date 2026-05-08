import type { SupabaseClient } from "@supabase/supabase-js";
import { generateId } from "@/lib/storage";
import type { Flashcard, FlashcardDeck } from "@/lib/models/flashcards";
import { requireDataUserId } from "@/lib/data/cloud/supabaseDataUser";
import { FLASHCARD_DECKS_FETCH_LIMIT } from "@/lib/data/fetchLimits";

const FLASHCARD_DECK_IDS_IN_CHUNK = 80;

function mapCard(row: {
  id: string;
  front: string;
  back: string;
  created_at: string;
}): Flashcard {
  return {
    id: row.id,
    front: row.front,
    back: row.back,
    created_at: row.created_at,
  };
}

export async function fetchDecksCloud(
  supabase: SupabaseClient,
): Promise<FlashcardDeck[]> {
  // RLS policies filter by auth.uid() automatically.
  const { data: deckRows, error: dErr } = await supabase
    .from("flashcard_decks")
    .select("id,title,color,position,created_at,updated_at")
    .order("position")
    .limit(FLASHCARD_DECKS_FETCH_LIMIT);
  if (dErr) throw dErr;
  const decks = deckRows ?? [];
  if (decks.length === 0) return [];

  const deckIds = decks.map((d) => d.id as string);

  // Fetch card chunks in parallel instead of serially.
  const chunks: string[][] = [];
  for (let i = 0; i < deckIds.length; i += FLASHCARD_DECK_IDS_IN_CHUNK) {
    chunks.push(deckIds.slice(i, i + FLASHCARD_DECK_IDS_IN_CHUNK));
  }
  const chunkResults = await Promise.all(
    chunks.map((chunk) =>
      supabase
        .from("flashcards")
        .select("id,deck_id,front,back,position,created_at")
        .in("deck_id", chunk)
        .order("position")
        .then(({ data, error }) => {
          if (error) throw error;
          return data ?? [];
        }),
    ),
  );
  const cardRows = chunkResults.flat();

  const cardsByDeck = new Map<string, Flashcard[]>();
  for (const r of cardRows) {
    const row = r as {
      deck_id: string;
      id: string;
      front: string;
      back: string;
      created_at: string;
    };
    const list = cardsByDeck.get(row.deck_id) ?? [];
    list.push(mapCard(row));
    cardsByDeck.set(row.deck_id, list);
  }

  return decks.map((d) => {
    const row = d as {
      id: string;
      title: string;
      color: string | null;
      created_at: string;
      updated_at: string;
    };
    return {
      id: row.id,
      title: row.title,
      color: row.color,
      cards: cardsByDeck.get(row.id) ?? [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
}

export async function createDeckCloud(
  supabase: SupabaseClient,
  deck: Pick<FlashcardDeck, "title" | "color">,
): Promise<FlashcardDeck> {
  const userId = await requireDataUserId(supabase);
  const { count } = await supabase
    .from("flashcard_decks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  const position = count ?? 0;
  const id = generateId();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: userId,
    title: deck.title,
    color: deck.color,
    position,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from("flashcard_decks")
    .insert(row)
    .select("id,title,color,position,created_at,updated_at")
    .single();
  if (error) throw error;
  const r = data as {
    id: string;
    title: string;
    color: string | null;
    created_at: string;
    updated_at: string;
  };
  return {
    id: r.id,
    title: r.title,
    color: r.color,
    cards: [],
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/**
 * Updates deck metadata (title/color). Returns deck metadata only — the caller
 * (store) is responsible for merging with its existing cards to avoid an
 * unnecessary card re-fetch on every simple title or color update.
 */
export async function updateDeckCloud(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<FlashcardDeck, "title" | "color">>,
): Promise<Omit<FlashcardDeck, "cards">> {
  const userId = await requireDataUserId(supabase);
  const patch = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  const { data: row, error } = await supabase
    .from("flashcard_decks")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id,title,color,position,created_at,updated_at")
    .single();
  if (error) throw error;
  const r = row as {
    id: string;
    title: string;
    color: string | null;
    created_at: string;
    updated_at: string;
  };
  return {
    id: r.id,
    title: r.title,
    color: r.color,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function deleteDeckCloud(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const userId = await requireDataUserId(supabase);
  const { error } = await supabase
    .from("flashcard_decks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function addCardCloud(
  supabase: SupabaseClient,
  deckId: string,
  card: Pick<Flashcard, "front" | "back">,
): Promise<Flashcard> {
  const userId = await requireDataUserId(supabase);
  const { count } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("deck_id", deckId)
    .eq("user_id", userId);
  const position = count ?? 0;
  const id = generateId();
  const now = new Date().toISOString();
  const row = {
    id,
    user_id: userId,
    deck_id: deckId,
    front: card.front,
    back: card.back,
    position,
    created_at: now,
  };
  const { data, error } = await supabase
    .from("flashcards")
    .insert(row)
    .select("id,front,back,created_at")
    .single();
  if (error) throw error;
  // Fire-and-forget: update deck's updated_at timestamp without blocking the response.
  void supabase
    .from("flashcard_decks")
    .update({ updated_at: now })
    .eq("id", deckId)
    .eq("user_id", userId);
  return mapCard(data as Parameters<typeof mapCard>[0]);
}

export async function updateCardCloud(
  supabase: SupabaseClient,
  deckId: string,
  cardId: string,
  updates: Partial<Pick<Flashcard, "front" | "back">>,
): Promise<Flashcard> {
  const userId = await requireDataUserId(supabase);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("flashcards")
    .update({ ...updates })
    .eq("id", cardId)
    .eq("deck_id", deckId)
    .eq("user_id", userId)
    .select("id,front,back,created_at")
    .single();
  if (error) throw error;
  // Fire-and-forget: update deck's updated_at timestamp without blocking the response.
  void supabase
    .from("flashcard_decks")
    .update({ updated_at: now })
    .eq("id", deckId)
    .eq("user_id", userId);
  return mapCard(data as Parameters<typeof mapCard>[0]);
}

export async function deleteCardCloud(
  supabase: SupabaseClient,
  deckId: string,
  cardId: string,
): Promise<void> {
  const userId = await requireDataUserId(supabase);
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", cardId)
    .eq("deck_id", deckId)
    .eq("user_id", userId);
  if (error) throw error;
  // Fire-and-forget: update deck's updated_at timestamp without blocking the response.
  void supabase
    .from("flashcard_decks")
    .update({ updated_at: now })
    .eq("id", deckId)
    .eq("user_id", userId);
}

export async function saveDeckOrderCloud(
  supabase: SupabaseClient,
  decks: FlashcardDeck[],
): Promise<void> {
  // Build batch payloads for the RPCs
  const deckUpdates = decks.map((d, i) => ({ id: d.id, position: i }));
  const cardUpdates = decks.flatMap((d) =>
    d.cards.map((c, j) => ({ id: c.id, position: j })),
  );

  // Batch deck position update
  if (deckUpdates.length > 0) {
    const { error } = await supabase.rpc(
      "batch_update_flashcard_deck_positions",
      { p_updates: deckUpdates },
    );
    // Fallback to sequential if RPC doesn't exist
    if (error?.code === "42883") {
      const userId = await requireDataUserId(supabase);
      const now = new Date().toISOString();
      for (const u of deckUpdates) {
        await supabase
          .from("flashcard_decks")
          .update({ position: u.position, updated_at: now })
          .eq("id", u.id)
          .eq("user_id", userId);
      }
    } else if (error) {
      throw error;
    }
  }

  // Batch card position update
  if (cardUpdates.length > 0) {
    const { error } = await supabase.rpc(
      "batch_update_flashcard_positions",
      { p_updates: cardUpdates },
    );
    if (error?.code === "42883") {
      const userId = await requireDataUserId(supabase);
      for (const u of cardUpdates) {
        await supabase
          .from("flashcards")
          .update({ position: u.position })
          .eq("id", u.id)
          .eq("user_id", userId);
      }
    } else if (error) {
      throw error;
    }
  }
}
