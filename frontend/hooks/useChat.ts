"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import {
  loadChatHistory,
  saveChatHistory,
  clearChatHistory as clearStorage,
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

/** `navigation.type` stays `"reload"` until the next document load; only blank once per refresh. */
let chatClearedForThisReloadDocument = false;

/** True for F5 / address-bar reload; false for first visit and in-app route changes. */
function isDocumentReload(): boolean {
  if (typeof performance === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return nav?.type === "reload";
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);
  /** Latest transcript for API calls; state updaters may not run before the next line of an async handler. */
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // useLayoutEffect so history is applied before the first paint. useEffect left
  // the first frame at messages=[] → scroll pinned to an empty/welcome layout,
  // then content appeared at scrollTop 0 (top of the real transcript).
  useLayoutEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (isDocumentReload()) {
        if (!chatClearedForThisReloadDocument) {
          chatClearedForThisReloadDocument = true;
          clearStorage();
          setMessages([]);
          messagesRef.current = [];
        } else {
          const loaded = loadChatHistory();
          setMessages(loaded);
          messagesRef.current = loaded;
        }
      } else {
        const loaded = loadChatHistory();
        setMessages(loaded);
        messagesRef.current = loaded;
      }
      // Avoid preloading stores here: this layout effect runs before SessionProvider's
      // `getUser` effect, so `getAuthUserId()` can still be null and we'd hit local repos
      // while signed in. `bootstrapSession` + feature views + `buildContext` load data.
    }
  }, []);

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
        saveChatHistory(next);
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
      saveChatHistory(threadForApi);
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

        setMessages((prev) => {
          saveChatHistory(prev);
          return prev;
        });
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
          saveChatHistory(updated);
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
    clearStorage();
    messagesRef.current = [];
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, clearHistory };
}
