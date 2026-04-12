import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfilePreferences } from "@/lib/data/preferencesCache";
import { setPreferencesCache } from "@/lib/data/preferencesCache";
import { requireDataUserId } from "@/lib/data/cloud/supabaseDataUser";

export type FetchedProfilePreferences = {
  profile: ProfilePreferences;
  /** Full `preferences` JSON from `profiles` for merge flows (e.g. local→cloud import). */
  rawPreferences: Record<string, unknown>;
};

export async function fetchProfilePreferences(
  supabase: SupabaseClient,
): Promise<FetchedProfilePreferences> {
  const userId = await requireDataUserId(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .single();
  if (error) throw error;
  const raw = (data?.preferences ?? {}) as Record<string, unknown>;
  const prefs: ProfilePreferences = {
    daily_goal:
      typeof raw.daily_goal === "number" ? raw.daily_goal : undefined,
    sidebar_order: Array.isArray(raw.sidebar_order)
      ? (raw.sidebar_order as ProfilePreferences["sidebar_order"])
      : undefined,
    imported_local:
      typeof raw.imported_local === "boolean" ? raw.imported_local : undefined,
  };
  setPreferencesCache(prefs);
  return { profile: prefs, rawPreferences: raw };
}

export async function mergeProfilePreferences(
  supabase: SupabaseClient,
  partial: ProfilePreferences,
): Promise<void> {
  const userId = await requireDataUserId(supabase);
  const { data: row, error: readErr } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .single();
  if (readErr) throw readErr;
  const prev = (row?.preferences ?? {}) as Record<string, unknown>;
  const next = { ...prev, ...partial };
  const { error } = await supabase
    .from("profiles")
    .update({
      preferences: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
}
