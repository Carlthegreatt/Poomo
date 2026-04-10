import { z } from "zod";

/** Matches client `AppContext` / `buildContext` output. */
export const appContextSchema = z.object({
  columns: z.array(z.string().max(200)).max(50).optional(),
  tasks: z
    .array(
      z.object({
        title: z.string().max(500),
        column: z.string().max(200),
        due_date: z.string().max(32).nullable(),
        description: z.string().max(4000).nullable(),
      }),
    )
    .max(100),
  events: z
    .array(
      z.object({
        title: z.string().max(500),
        start: z.string().max(64),
        end: z.string().max(64),
        all_day: z.boolean(),
      }),
    )
    .max(50),
  timer: z.object({
    phase: z.string().max(50),
    isRunning: z.boolean(),
    remainingMs: z.number().finite(),
  }),
  stats: z.object({
    todayCount: z.number().int().nonnegative(),
    todayMinutes: z.number().int().nonnegative(),
    thisWeekSessions: z.number().int().nonnegative(),
    thisWeekMinutes: z.number().int().nonnegative(),
    totalSessions: z.number().int().nonnegative(),
    totalFocusMinutes: z.number().int().nonnegative(),
    currentStreak: z.number().int().nonnegative(),
    bestStreak: z.number().int().nonnegative(),
  }),
  notes: z
    .array(
      z.object({
        title: z.string().max(500),
        updated: z.string().max(32),
      }),
    )
    .max(24)
    .default([]),
});

const textPartSchema = z.object({
  text: z.string().max(12_000),
});

export const geminiMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  parts: z.array(textPartSchema).min(1).max(24),
});

export const chatPostBodySchema = z.object({
  messages: z.array(geminiMessageSchema).min(1).max(12),
  context: appContextSchema,
});

export type ValidatedChatPostBody = z.infer<typeof chatPostBodySchema>;
export type ValidatedAppContext = z.infer<typeof appContextSchema>;
