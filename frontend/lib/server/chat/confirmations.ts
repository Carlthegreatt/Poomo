import { parseChatAction } from "@/lib/ai/chatActionSchema";
import type { ChatAction } from "@/lib/ai/tools";

export const MUTATION_TOOLS = new Set([
  "start_timer",
  "pause_timer",
  "reset_timer",
  "create_task",
  "schedule_event",
  "save_note",
]);

export const TOOL_TO_WIDGET: Record<string, string> = {
  start_timer: "timer",
  pause_timer: "timer",
  reset_timer: "timer",
  create_task: "board",
  schedule_event: "calendar",
  save_note: "notes",
};

function confirmationLineForAction({ tool, args }: ChatAction): string {
  switch (tool) {
    case "start_timer": {
      const phase = args.phase;
      const rawMin = args.minutes;
      const minutes =
        typeof rawMin === "number" && Number.isFinite(rawMin)
          ? Math.round(rawMin)
          : null;
      if (phase === "WORK" && minutes !== null && minutes >= 1) {
        return `Starting a ${minutes}-minute focus session.`;
      }
      const label =
        phase === "WORK"
          ? "focus session"
          : phase === "BREAK_SHORT"
            ? "short break"
            : "long break";
      return `Starting a ${label}.`;
    }
    case "pause_timer":
      return "Timer paused.";
    case "reset_timer":
      return "Timer reset.";
    case "create_task":
      return `Task created: ${args.title}.`;
    case "schedule_event":
      return `Event scheduled: ${args.title}.`;
    default:
      return "";
  }
}

/** Readable confirmations: newlines between actions; grouped multi–save_note uses a bullet list. */
export function buildConfirmation(actions: ChatAction[]): string {
  const lines: string[] = [];
  let i = 0;

  while (i < actions.length) {
    const action = actions[i];
    if (!action) break;

    if (action.tool === "save_note") {
      const titles: string[] = [];
      while (i < actions.length && actions[i]?.tool === "save_note") {
        const t = String(actions[i]!.args.title ?? "").trim();
        if (t) titles.push(t);
        i++;
      }
      if (titles.length === 0) continue;
      if (titles.length === 1) {
        lines.push(`Saved to Notes: ${titles[0]}.`);
      } else {
        lines.push("Saved to Notes:");
        for (const t of titles) {
          lines.push(`• ${t}`);
        }
      }
      continue;
    }

    const line = confirmationLineForAction(action);
    if (line) lines.push(line);
    i++;
  }

  if (lines.length === 0) return "";
  return lines.join("\n");
}

export function collectValidatedActions(
  fnCalls: { name: string; args?: Record<string, unknown> }[],
): ChatAction[] {
  const actions: ChatAction[] = [];
  for (const fc of fnCalls) {
    if (!fc.name || !MUTATION_TOOLS.has(fc.name)) continue;
    const validated = parseChatAction({
      tool: fc.name,
      args: fc.args ?? {},
    });
    if (!validated) continue;
    actions.push({
      tool: validated.tool,
      args: validated.args as unknown as Record<string, unknown>,
    });
  }
  return actions;
}
