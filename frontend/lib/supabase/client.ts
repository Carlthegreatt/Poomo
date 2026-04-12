import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
    }
    return createBrowserClient(
      "http://127.0.0.1:54321",
      "public-anon-key-placeholder",
    );
  }
  return createBrowserClient(url, key);
}

/** Shared alias for data repos (same singleton behavior as `createBrowserSupabase`). */
export function browserSupabase() {
  return createBrowserSupabase();
}
