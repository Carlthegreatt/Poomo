import { isCloudDataBackend } from "@/lib/data/authSession";
import type { FocusSession } from "@/lib/models/stats";
import * as cloud from "@/lib/data/cloud/statsCloud";
import { browserSupabase } from "@/lib/supabase/client";
import { logSessionAction, clearSessionsAction } from "@/lib/actions/stats";

export async function fetchSessions(): Promise<FocusSession[]> {
  return isCloudDataBackend()
    ? cloud.fetchSessionsCloud(browserSupabase())
    : [];
}

export async function clearSessions(): Promise<void> {
  if (!isCloudDataBackend()) return;
  const result = await clearSessionsAction();
  if (!result.ok) throw new Error(result.message);
}

export async function logSession(
  session: Omit<FocusSession, "id">,
): Promise<FocusSession> {
  const result = await logSessionAction(session);
  if (!result.ok) {
    // Fallback for non-authenticated: return local-only session
    return { id: crypto.randomUUID(), ...session };
  }
  return result.data;
}

export function getDailyGoal(): number {
  return isCloudDataBackend()
    ? cloud.getDailyGoalCloud()
    : 8;
}
