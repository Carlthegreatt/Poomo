import { readJSON, writeJSON } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";

export type WidgetType = "timer" | "board" | "calendar" | "stats" | "notes";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  widget?: WidgetType;
}

const MAX_MESSAGES = 50;

export function loadChatHistory(): ChatMessage[] {
  return readJSON<ChatMessage[]>(STORAGE_KEYS.CHAT_HISTORY, []);
}

export function saveChatHistory(messages: ChatMessage[]): void {
  const trimmed = messages.slice(-MAX_MESSAGES);
  writeJSON(STORAGE_KEYS.CHAT_HISTORY, trimmed);
}

export function clearChatHistory(): void {
  writeJSON(STORAGE_KEYS.CHAT_HISTORY, []);
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
