"use server";

import { z } from "zod";
import { getServerSessionUser } from "@/lib/supabase/serverSession";
import type { ActionResult } from "@/lib/actions/types";
import type { FocusSession } from "@/lib/models/stats";
import * as cloud from "@/lib/data/cloud/statsCloud";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const logSessionSchema = z.object({
  startedAt: z.string().min(1).max(64),
  endedAt: z.string().min(1).max(64),
  phase: z.enum(["focus", "shortBreak", "longBreak"]),
  durationMs: z.number().int().nonnegative(),
  taskId: z.string().uuid().nullable(),
  taskTitle: z.string().max(500).nullable(),
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function logSessionAction(
  input: unknown,
): Promise<ActionResult<FocusSession>> {
  const parsed = logSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "validation", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    // Non-authenticated users can't persist sessions — return a local-only ID
    return {
      ok: true,
      data: {
        id: crypto.randomUUID(),
        ...parsed.data,
      },
    };
  }
  try {
    const session = await cloud.logSessionCloud(supabase, parsed.data);
    return { ok: true, data: session };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to log session" };
  }
}

export async function clearSessionsAction(): Promise<ActionResult<void>> {
  const { supabase, user } = await getServerSessionUser();
  if (!user) {
    return { ok: false, code: "unauthorized", message: "Sign in to manage sessions." };
  }
  try {
    await cloud.clearSessionsCloud(supabase);
    return { ok: true, data: undefined };
  } catch (err) {
    return { ok: false, code: "server_error", message: err instanceof Error ? err.message : "Failed to clear sessions" };
  }
}
