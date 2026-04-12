import type { User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

export type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;

/** Server-only: Supabase client + current user from cookies. */
export async function getServerSessionUser(): Promise<{
  supabase: ServerSupabase;
  user: User | null;
}> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
