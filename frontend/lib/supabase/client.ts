import { createBrowserClient } from "@supabase/ssr";

let browserSupabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabase() {
  if (browserSupabaseClient) return browserSupabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
    }
    console.warn(
      "[supabase/client] Using placeholder Supabase config. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
    browserSupabaseClient = createBrowserClient(
      "http://127.0.0.1:54321",
      "public-anon-key-placeholder",
    );
    return browserSupabaseClient;
  }

  browserSupabaseClient = createBrowserClient(url, key);
  return browserSupabaseClient;
}

/** Shared alias for data repos (same singleton behavior as `createBrowserSupabase`). */
export function browserSupabase() {
  return createBrowserSupabase();
}
