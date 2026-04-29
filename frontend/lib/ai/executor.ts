import { toast } from "sonner";
import { useTimer } from "@/stores/timerStore";
import { useKanban } from "@/stores/kanbanStore";
import { useCalendar } from "@/stores/calendarStore";
import { parseChatAction } from "@/lib/ai/chatActionSchema";
import type { ChatAction } from "@/lib/ai/tools";
import { createNote as apiCreateNote } from "@/lib/data/notesRepo";
import { useNotes } from "@/stores/notesStore";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Store note body as simple HTML for the rich-text editor. */
function plainTextToNoteHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "<p></p>";
  return trimmed
    .split(/\n{2,}/)
    .map((block) => {
      const withBreaks = escapeHtml(block).replace(/\n/g, "<br/>");
      return `<p>${withBreaks}</p>`;
    })
    .join("");
}

export async function executeAction(action: ChatAction): Promise<void> {
  const validated = parseChatAction(action);
  if (!validated) {
    toast.error("That action could not be run.");
    return;
  }

  try {
    switch (validated.tool) {
      case "start_timer": {
        const { phase, minutes } = validated.args;
        useTimer.getState().start(phase, minutes);
        toast.success(
          `Timer started: ${phase === "WORK" ? "Focus" : phase === "BREAK_SHORT" ? "Short break" : "Long break"}`,
        );
        break;
      }

      case "pause_timer":
        useTimer.getState().pause();
        toast.success("Timer paused");
        break;

      case "reset_timer":
        useTimer.getState().reset();
        toast.success("Timer reset");
        break;

      case "create_task": {
        const kanban = useKanban.getState();
        const ordered = [...kanban.columns].sort(
          (a, b) => a.position - b.position,
        );
        const requested = validated.args.column?.trim();
        const column = requested
          ? ordered.find((c) => c.title === requested)
          : ordered[0];
        if (!column) {
          toast.error(
            requested
              ? `Column "${requested}" not found`
              : "No kanban columns available",
          );
          return;
        }

        const { title, description, due_date, due_time, priority, task_type } =
          validated.args;
        await kanban.addTask(column.id, {
          title,
          description: description ?? undefined,
          due_date: due_date ?? undefined,
          due_time: due_time ?? undefined,
          priority: priority ?? undefined,
          task_type: task_type ?? undefined,
        });
        toast.success(`Task created: ${title}`);
        break;
      }

      case "schedule_event": {
        const { title, description, start, end, all_day } = validated.args;
        await useCalendar.getState().addEvent({
          title,
          description: description ?? null,
          start,
          end,
          all_day: all_day ?? false,
          color: null,
        });
        toast.success(`Event scheduled: ${title}`);
        break;
      }

      case "save_note": {
        const { title, body } = validated.args;
        await apiCreateNote({
          title: title.trim(),
          content: plainTextToNoteHtml(body),
          color: null,
          pinned: false,
        });
        await useNotes.getState().loadNotes();
        toast.success(`Saved to Notes: ${title.trim()}`);
        break;
      }

      default:
        console.warn(`Unknown action tool: ${(validated as { tool: string }).tool}`);
    }
  } catch (error) {
    console.error(`Failed to execute action ${validated.tool}:`, error);
    toast.error(`Failed to execute: ${validated.tool}`);
  }
}

export async function executeActions(actions: ChatAction[]): Promise<void> {
  for (const action of actions) {
    await executeAction(action);
  }
}
