export const ACCENT_COLORS = [
  "#FFC567",
  "#FB7DA8",
  "#FD5A46",
  "#552CB7",
  "#00995E",
  "#058CD7",
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];

export const STORAGE_KEYS = {
  KANBAN: "poomo-kanban",
  CALENDAR: "poomo-calendar",
  SESSIONS: "poomo-sessions",
  DAILY_GOAL: "poomo-daily-goal",
  CHAT_HISTORY: "poomo-chat-history",
  NOTES: "poomo-notes",
} as const;
