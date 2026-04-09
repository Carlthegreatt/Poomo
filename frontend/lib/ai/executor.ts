import { toast } from "sonner";
import { useTimer } from "@/stores/timerStore";
import { useKanban } from "@/stores/kanbanStore";
import { useCalendar } from "@/stores/calendarStore";
import type { ChatAction } from "@/lib/ai/tools";

export async function executeAction(action: ChatAction): Promise<void> {
  const { tool, args } = action;

  try {
    switch (tool) {
      case "start_timer": {
        const phase = args.phase as "WORK" | "BREAK_SHORT" | "BREAK_LONG";
        const minutes = args.minutes as number | undefined;
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
        const targetTitle = (args.column as string) ?? "Todo";
        const column = kanban.columns.find((c) => c.title === targetTitle);
        if (!column) {
          toast.error(`Column "${targetTitle}" not found`);
          return;
        }

        await kanban.addTask(column.id, {
          title: args.title as string,
          description: args.description as string | undefined,
          due_date: args.due_date as string | undefined,
        });
        toast.success(`Task created: ${args.title}`);
        break;
      }

      case "schedule_event": {
        await useCalendar.getState().addEvent({
          title: args.title as string,
          description: (args.description as string) ?? null,
          start: args.start as string,
          end: args.end as string,
          all_day: (args.all_day as boolean) ?? false,
          color: null,
        });
        toast.success(`Event scheduled: ${args.title}`);
        break;
      }

      default:
        console.warn(`Unknown action tool: ${tool}`);
    }
  } catch (error) {
    console.error(`Failed to execute action ${tool}:`, error);
    toast.error(`Failed to execute: ${tool}`);
  }
}

export async function executeActions(actions: ChatAction[]): Promise<void> {
  for (const action of actions) {
    await executeAction(action);
  }
}
