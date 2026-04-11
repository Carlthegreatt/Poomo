import { Type, type FunctionDeclaration } from "@google/genai";

export const poomoTools: FunctionDeclaration[] = [
  {
    name: "start_timer",
    description: "Start a Pomodoro focus timer, short break, or long break",
    parameters: {
      type: Type.OBJECT,
      properties: {
        phase: {
          type: Type.STRING,
          description: "The timer phase to start",
          enum: ["WORK", "BREAK_SHORT", "BREAK_LONG"],
        },
        minutes: {
          type: Type.NUMBER,
          description:
            "Custom duration in minutes. Omit to use the user's default duration.",
        },
      },
      required: ["phase"],
    },
  },
  {
    name: "pause_timer",
    description: "Pause the currently running timer",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "reset_timer",
    description: "Reset the timer back to idle state",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: "create_task",
    description: "Create a new task on the kanban board",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Task title",
        },
        description: {
          type: Type.STRING,
          description: "Optional task description",
        },
        column: {
          type: Type.STRING,
          description:
            "Exact title of the user's kanban column (see system context: Kanban columns). Defaults to the first column if omitted.",
        },
        due_date: {
          type: Type.STRING,
          description: "Optional due date in YYYY-MM-DD format",
        },
        due_time: {
          type: Type.STRING,
          description:
            "Optional local due time on that date, 24h HH:mm (only if due_date is set)",
        },
        priority: {
          type: Type.STRING,
          description: "Optional priority: low, medium, or high",
          enum: ["low", "medium", "high"],
        },
        task_type: {
          type: Type.STRING,
          description:
            "Optional user-defined task type label (e.g. Bug, Feature, Chore)",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "save_note",
    description:
      "Save content to the user's Notes tab. Use when they ask to take a note, remember something, capture thoughts, or after they asked you to organize notes (you may call save_note multiple times in one turn for distinct organized notes—each needs title + body). Use a clear short title and body (plain text; line breaks and bullet lists allowed). If they want an idea revisited later, say you'll follow up in a future chat; when those titles appear in context later, you may ask a brief check-in when appropriate.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description:
            "Short note title (e.g. the main idea in a few words).",
        },
        body: {
          type: Type.STRING,
          description:
            "Full note content: the idea, bullets, or organized text the user wants kept.",
        },
      },
      required: ["title", "body"],
    },
  },
  {
    name: "schedule_event",
    description: "Create a new calendar event",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Event title",
        },
        description: {
          type: Type.STRING,
          description: "Optional event description",
        },
        start: {
          type: Type.STRING,
          description: "Event start time in ISO 8601 format",
        },
        end: {
          type: Type.STRING,
          description: "Event end time in ISO 8601 format",
        },
        all_day: {
          type: Type.BOOLEAN,
          description: "Whether this is an all-day event. Defaults to false.",
        },
      },
      required: ["title", "start", "end"],
    },
  },
];

export interface ChatAction {
  tool: string;
  args: Record<string, unknown>;
}
