import { readJSON, writeJSON } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
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

export function toGeminiMessages(
  messages: ChatMessage[],
): { role: string; parts: { text: string }[] }[] {
  return messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
}
