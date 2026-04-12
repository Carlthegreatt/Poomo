import { isCloudDataBackend } from "@/lib/data/authSession";
import type { FocusSession } from "@/lib/statsTypes";
import * as local from "@/lib/data/local/statsLocal";
import * as cloud from "@/lib/data/cloud/statsCloud";
import { browserSupabase } from "@/lib/supabase/client";

export async function fetchSessions(): Promise<FocusSession[]> {
  return isCloudDataBackend()
    ? cloud.fetchSessionsCloud(browserSupabase())
    : local.fetchSessionsLocal();
}

export async function clearSessions(): Promise<void> {
  return isCloudDataBackend()
    ? cloud.clearSessionsCloud(browserSupabase())
    : local.clearSessionsLocal();
}

export async function logSession(
  session: Omit<FocusSession, "id">,
): Promise<FocusSession> {
  return isCloudDataBackend()
    ? cloud.logSessionCloud(browserSupabase(), session)
    : Promise.resolve(local.logSessionLocal(session));
}

export function getDailyGoal(): number {
  return isCloudDataBackend()
    ? cloud.getDailyGoalCloud()
    : local.getDailyGoalLocal();
}

export async function setDailyGoal(goal: number): Promise<void> {
  if (isCloudDataBackend()) await cloud.setDailyGoalCloud(browserSupabase(), goal);
  else local.setDailyGoalLocal(goal);
}
