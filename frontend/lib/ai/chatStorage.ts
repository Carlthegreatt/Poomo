export type WidgetType = "timer" | "board" | "calendar" | "stats" | "notes";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  widget?: WidgetType;
}

const CHAT_STORAGE_KEY = "poomo_chat_history";

/** In-memory only; transcript does not persist across reloads. */
export function loadChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

export function saveChatHistory(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

export function clearChatHistory(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CHAT_STORAGE_KEY);
}

const ERROR_MESSAGES = new Set([
  "I'm temporarily unavailable. Please try again shortly.",
  "Sorry, something went wrong. Please try again.",
]);

export function toGeminiMessages(
  messages: ChatMessage[],
): { role: string; parts: { text: string }[] }[] {
  return messages
    .filter((m) => m.content && !ERROR_MESSAGES.has(m.content))
    .map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
}
