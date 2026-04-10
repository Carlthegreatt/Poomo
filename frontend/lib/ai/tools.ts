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
      },
      required: ["title"],
    },
  },
  {
    name: "save_note",
    description:
      "Save content to the user's Notes tab. Use when they ask to take a note, remember something, jot down an idea, or capture thoughts. Use a clear short title and put the full text in body (plain text; line breaks allowed).",
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
