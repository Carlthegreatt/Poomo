import type { SupabaseClient } from "@supabase/supabase-js";
import { generateId } from "@/lib/storage";
import type { FocusSession } from "@/lib/statsTypes";
import { focusSessionFromRow, focusSessionToRow } from "@/lib/data/mappers";
import {
  getPreferencesCache,
  patchPreferencesCache,
} from "@/lib/data/preferencesCache";
import { mergeProfilePreferences } from "@/lib/data/cloud/profileCloud";
import { requireDataUserId } from "@/lib/data/cloud/supabaseDataUser";

const DEFAULT_GOAL = 8;

export async function fetchSessionsCloud(
  supabase: SupabaseClient,
): Promise<FocusSession[]> {
  const userId = await requireDataUserId(supabase);
  const { data, error } = await supabase
    .from("focus_sessions")
    .select(
      "id,started_at,ended_at,phase,duration_ms,task_id,task_title",
    )
    .eq("user_id", userId)
    .order("ended_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) =>
    focusSessionFromRow(
      r as Parameters<typeof focusSessionFromRow>[0],
    ),
  );
}

export async function logSessionCloud(
  supabase: SupabaseClient,
  session: Omit<FocusSession, "id">,
): Promise<FocusSession> {
  const userId = await requireDataUserId(supabase);
  const id = generateId();
  const row = focusSessionToRow(userId, { ...session, id });
  const { data, error } = await supabase
    .from("focus_sessions")
    .insert(row)
    .select(
      "id,started_at,ended_at,phase,duration_ms,task_id,task_title",
    )
    .single();
  if (error) throw error;
  return focusSessionFromRow(
    data as Parameters<typeof focusSessionFromRow>[0],
  );
}

export async function clearSessionsCloud(
  supabase: SupabaseClient,
): Promise<void> {
  const userId = await requireDataUserId(supabase);
  const { error } = await supabase
    .from("focus_sessions")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

export function getDailyGoalCloud(): number {
  const g = getPreferencesCache()?.daily_goal;
  if (typeof g === "number" && Number.isFinite(g) && g > 0) return g;
  return DEFAULT_GOAL;
}

export async function setDailyGoalCloud(
  supabase: SupabaseClient,
  goal: number,
): Promise<void> {
  const n = Math.max(1, Math.floor(goal));
  await mergeProfilePreferences(supabase, { daily_goal: n });
  patchPreferencesCache({ daily_goal: n });
}
