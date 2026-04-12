import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolves the signed-in user from the Supabase client (browser or server). */
export async function requireDataUserId(
  supabase: SupabaseClient,
): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) throw new Error("Not signed in");
  return user.id;
}
