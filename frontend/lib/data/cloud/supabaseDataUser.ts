import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthUserId } from "@/lib/data/authSession";

/**
 * Resolves the signed-in user ID for cloud data operations.
 *
 * Fast path: returns the in-memory userId set during auth hydration, avoiding
 * a `getSession()` storage read on every write operation.
 *
 * Fallback: if the in-memory ID is not yet set (edge case during early boot),
 * verifies via `getUser()` which makes a network call but is always accurate.
 *
 * Security note: server-side RLS still enforces row-level isolation regardless
 * of what the client passes. The in-memory ID is only used to build correct
 * WHERE clauses — it cannot bypass RLS policies.
 */
export async function requireDataUserId(
  supabase: SupabaseClient,
): Promise<string> {
  // Use in-memory value first — set by verified getUser() during auth hydration.
  const cached = getAuthUserId();
  if (cached) return cached;

  // Fallback for edge cases (e.g., server-side calls or very early boot).
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) throw new Error("Not signed in");
  return user.id;
}
