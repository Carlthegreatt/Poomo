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
  const { data, error } = await supabase
    .from("profiles")
    .select("preferences")
    .maybeSingle();
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
  const now = new Date().toISOString();

  // Strip undefined values from partial so they don't overwrite existing keys
  const cleanPartial: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(partial)) {
    if (v !== undefined) cleanPartial[k] = v;
  }

  // Atomic merge using Postgres jsonb || operator via raw SQL (RPC)
  // This prevents the read-then-write race when multiple tabs update simultaneously.
  const { error } = await supabase.rpc("merge_profile_preferences", {
    p_user_id: userId,
    p_partial: cleanPartial,
    p_now: now,
  });

  // Fallback: if the RPC doesn't exist yet, use the old read-then-write pattern
  if (error?.code === "42883" || error?.message?.includes("merge_profile_preferences")) {
    const { data: row, error: readErr } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", userId)
      .maybeSingle();
    if (readErr) throw readErr;
    const prev = (row?.preferences ?? {}) as Record<string, unknown>;
    const next = { ...prev, ...cleanPartial };
    if (!row) {
      const { error: insErr } = await supabase.from("profiles").insert({
        id: userId,
        preferences: next,
        updated_at: now,
      });
      if (insErr) throw insErr;
      return;
    }
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        preferences: next,
        updated_at: now,
      })
      .eq("id", userId);
    if (upErr) throw upErr;
    return;
  }

  if (error) throw error;
}
