import { z } from "zod";

const phaseEnum = z.enum(["WORK", "BREAK_SHORT", "BREAK_LONG"]);

export const validatedChatActionSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("start_timer"),
    args: z.object({
      phase: phaseEnum,
      minutes: z.number().finite().min(1).max(480).optional(),
    }),
  }),
  z.object({
    tool: z.literal("pause_timer"),
    args: z.record(z.string(), z.unknown()).default({}),
  }),
  z.object({
    tool: z.literal("reset_timer"),
    args: z.record(z.string(), z.unknown()).default({}),
  }),
  z.object({
    tool: z.literal("create_task"),
    args: z.object({
      title: z.string().min(1).max(500),
      description: z.string().max(4000).nullish(),
      column: z.string().max(200).nullish(),
      due_date: z.string().max(32).nullish(),
    }),
  }),
  z.object({
    tool: z.literal("schedule_event"),
    args: z.object({
      title: z.string().min(1).max(500),
      description: z.string().max(4000).nullish(),
      start: z.string().min(1).max(64),
      end: z.string().min(1).max(64),
      all_day: z.boolean().nullish(),
    }),
  }),
]);

export type ValidatedChatAction = z.infer<typeof validatedChatActionSchema>;

export function parseChatAction(
  raw: { tool: string; args: Record<string, unknown> },
): ValidatedChatAction | null {
  const parsed = validatedChatActionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
