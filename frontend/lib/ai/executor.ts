import { toast } from "sonner";
import { useTimer } from "@/stores/timerStore";
import { useKanban } from "@/stores/kanbanStore";
import { useCalendar } from "@/stores/calendarStore";
import { parseChatAction } from "@/lib/ai/chatActionSchema";
import type { ChatAction } from "@/lib/ai/tools";

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

        const { title, description, due_date } = validated.args;
        await kanban.addTask(column.id, {
          title,
          description: description ?? undefined,
          due_date: due_date ?? undefined,
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
