"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  toGeminiMessages,
  type ChatMessage,
} from "@/lib/ai/chatStorage";
import { buildContext } from "@/lib/ai/context";
import { executeActions } from "@/lib/ai/executor";
import { matchIntent } from "@/lib/ai/intents";
import type { ChatAction } from "@/lib/ai/tools";

const WIDGET_TYPES = new Set<ChatMessage["widget"]>([
  "timer",
  "board",
  "calendar",
  "stats",
  "notes",
]);

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  /** Latest transcript for API calls; state updaters may not run before the next line of an async handler. */
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
    saveChatHistory(messages);
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      const intent = matchIntent(trimmed);

      if (intent) {
        const filled: ChatMessage = {
          ...assistantMsg,
          content: intent.response,
          widget: intent.widget,
        };
        const next = [...messagesRef.current, userMsg, filled];
        setMessages(next);
        messagesRef.current = next;
        await intent.execute();
        return;
      }

      const threadForApi = [
        ...messagesRef.current,
        userMsg,
        assistantMsg,
      ];
      setMessages(threadForApi);
      messagesRef.current = threadForApi;

      setIsStreaming(true);
      abortRef.current = new AbortController();

      try {
        const recentMessages = threadForApi.slice(-8);
        const geminiMessages = toGeminiMessages(recentMessages);
        const context = await buildContext();

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ messages: geminiMessages, context }),
          signal: abortRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("unavailable");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let pendingActions: ChatAction[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data: ")) continue;
            const payload = trimmedLine.slice(6);

            if (payload === "[DONE]") continue;

            try {
              const event = JSON.parse(payload) as
                | { type: "text_delta"; content: string }
                | { type: "assistant_reset" }
                | { type: "actions"; actions: ChatAction[] }
                | { type: "widget"; widget: string }
                | { type: "error"; message: string };

              if (event.type === "assistant_reset") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: "",
                    };
                  }
                  return updated;
                });
              } else if (event.type === "text_delta") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + event.content,
                    };
                  }
                  return updated;
                });
              } else if (event.type === "actions") {
                pendingActions = event.actions;
              } else if (
                event.type === "widget" &&
                WIDGET_TYPES.has(event.widget as ChatMessage["widget"])
              ) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      widget: event.widget as ChatMessage["widget"],
                    };
                  }
                  return updated;
                });
              } else if (event.type === "error") {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: event.message,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // skip malformed JSON
            }
          }
        }

        if (pendingActions.length > 0) {
          await executeActions(pendingActions);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant" && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content:
                "I'm temporarily unavailable. Please try again shortly.",
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming],
  );

  const clearHistory = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, clearHistory };
}
