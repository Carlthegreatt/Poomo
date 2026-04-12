"use server";

import { z } from "zod";
import { mergeProfilePreferences } from "@/lib/data/cloud/profileCloud";
import { getServerSessionUser } from "@/lib/supabase/serverSession";

export type PreferencesActionResult<T extends Record<string, unknown>> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

const dailyGoalSchema = z
  .number()
  .finite()
  .int()
  .min(1, "Goal must be at least 1")
  .max(48, "Goal is too high");

const sidebarOrderSchema = z.array(
  z.object({
    id: z.string().max(64),
    pinned: z.boolean(),
  }),
);

/** Cloud only: persist daily focus goal from the signed-in session. */
export async function setDailyGoalAction(
  input: unknown,
): Promise<PreferencesActionResult<{ dailyGoal: number }>> {
  const parsed = dailyGoalSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid goal",
    };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Sign in to sync your daily goal.",
    };
  }
  const n = Math.max(1, Math.floor(parsed.data));
  await mergeProfilePreferences(supabase, { daily_goal: n });
  return { ok: true, data: { dailyGoal: n } };
}

/** Cloud only: persist sidebar order for the signed-in session. */
export async function mergeSidebarOrderAction(
  input: unknown,
): Promise<PreferencesActionResult<{ synced: true }>> {
  const parsed = sidebarOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: parsed.error.issues[0]?.message ?? "Invalid sidebar data",
    };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Sign in to sync sidebar layout.",
    };
  }
  await mergeProfilePreferences(supabase, {
    sidebar_order: parsed.data,
  });
  return { ok: true, data: { synced: true } };
}
