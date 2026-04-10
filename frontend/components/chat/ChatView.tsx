"use client";

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendHorizontal, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import type { ChatMessage } from "@/lib/ai/chatStorage";
import { TimerWidget } from "@/components/chat/widgets/TimerWidget";
import { BoardWidget } from "@/components/chat/widgets/BoardWidget";
import { CalendarWidget } from "@/components/chat/widgets/CalendarWidget";
import { StatsWidget } from "@/components/chat/widgets/StatsWidget";
import { NotesWidget } from "@/components/chat/widgets/NotesWidget";
import type { WidgetType } from "@/lib/ai/chatStorage";

const SUGGESTIONS = [
  "Start a focus session",
  "What's on my todo list?",
  "Schedule a study session tomorrow at 3pm",
  "Take a note of my idea: weekly review on Sundays",
];

function scrollTranscriptToBottom(
  el: HTMLDivElement | null,
  mode: "once" | "settle" = "once",
) {
  if (!el) return;
  const apply = () => {
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  };
  apply();
  if (mode === "settle") {
    queueMicrotask(apply);
    requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });
  }
}

function isNearBottom(el: HTMLDivElement, thresholdPx: number): boolean {
  const { scrollTop, scrollHeight, clientHeight } = el;
  return scrollHeight - scrollTop - clientHeight < thresholdPx;
}

function InputBar({
  input,
  disabled,
  textareaRef,
  onSend,
  onChange,
  onKeyDown,
}: {
  input: string;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onSend: () => void;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-end gap-2 border-2 border-border bg-white rounded-2xl px-3 py-2 shadow-[3px_3px_0_black]">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none py-1 disabled:opacity-50"
        />
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="filled"
            size="icon"
            onClick={onSend}
            disabled={!input.trim() || disabled}
            className="shrink-0 size-8 rounded-xl"
          >
            <SendHorizontal className="size-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function WidgetRenderer({ type }: { type: WidgetType }) {
  switch (type) {
    case "timer":
      return <TimerWidget />;
    case "board":
      return <BoardWidget />;
    case "calendar":
      return <CalendarWidget />;
    case "stats":
      return <StatsWidget />;
    case "notes":
      return <NotesWidget />;
    default:
      return null;
  }
}

function MessageBubble({
  message,
  isStreaming,
  animateEnter,
}: {
  message: ChatMessage;
  isStreaming: boolean;
  /** Only the latest bubble animates; restored threads stay static (no scroll fight). */
  animateEnter: boolean;
}) {
  const isUser = message.role === "user";
  const showCursor = !isUser && isStreaming;

  return (
    <motion.div
      initial={animateEnter ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl border-2 border-border px-4 py-2.5 text-sm leading-relaxed shadow-[2px_2px_0_black] whitespace-pre-wrap break-words ${
          isUser ? "bg-primary text-white" : "bg-white text-foreground"
        }`}
      >
        {message.content || "\u00A0"}
        {showCursor && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-foreground ml-0.5 align-text-bottom"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              times: [0, 0.5, 0.5, 1],
            }}
          />
        )}
        {!isUser && message.widget && <WidgetRenderer type={message.widget} />}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex justify-start"
    >
      <div className="rounded-2xl border-2 border-border px-4 py-3 bg-white shadow-[2px_2px_0_black] flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-muted-foreground"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function ChatView() {
  const { messages, isStreaming, sendMessage, clearHistory } = useChat();
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const messagesCountRef = useRef(0);
  messagesCountRef.current = messages.length;

  const hasMessages = messages.length > 0;
  const showTyping =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant" &&
    !messages[messages.length - 1]?.content;

  const lastMessageId = messages[messages.length - 1]?.id;
  const lastMessage = messages[messages.length - 1];
  /** Changes on every streamed token so layout hooks can pin scroll while at bottom */
  const lastMessageContentLen = lastMessage?.content?.length ?? 0;
  const lastMessageWidget = lastMessage?.widget ?? "";

  // ── Scroll management ──
  const bootScrollRef = useRef(true);
  /** False while welcome→chat opacity runs; avoids scroll fighting motion (jitter). */
  const transcriptPanelStableRef = useRef(false);
  /** Previous commit's last message id — used to animate only newly appended bubbles. */
  const prevLastMessageIdRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    if (messages.length === 0) {
      prevLastMessageIdRef.current = undefined;
    } else {
      prevLastMessageIdRef.current = messages[messages.length - 1]?.id;
    }
  }, [messages]);

  useLayoutEffect(() => {
    if (!hasMessages) {
      bootScrollRef.current = true;
      transcriptPanelStableRef.current = false;
      return;
    }
    const el = scrollRef.current;
    if (!el) return;

    const allowPin = transcriptPanelStableRef.current || isStreaming;
    if (!allowPin) return;

    if (bootScrollRef.current || isNearBottom(el, 180)) {
      scrollTranscriptToBottom(
        el,
        transcriptPanelStableRef.current ? "settle" : "once",
      );
      if (transcriptPanelStableRef.current) {
        bootScrollRef.current = false;
      }
    }
  }, [
    hasMessages,
    messages.length,
    lastMessageId,
    lastMessageContentLen,
    lastMessageWidget,
    showTyping,
    isStreaming,
  ]);

  // ResizeObserver: coalesce to rAF; skip until panel enter finishes (same jitter source).
  useEffect(() => {
    if (!hasMessages) return;
    const outer = scrollRef.current;
    const inner = transcriptRef.current;
    if (!outer || !inner) return;

    let roRaf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(roRaf);
      roRaf = requestAnimationFrame(() => {
        if (!transcriptPanelStableRef.current) return;
        if (isNearBottom(outer, 140)) {
          scrollTranscriptToBottom(outer, "once");
        }
      });
    });
    ro.observe(inner);
    return () => {
      cancelAnimationFrame(roRaf);
      ro.disconnect();
    };
  }, [hasMessages, messages.length]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    sendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    },
    [],
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  const handleChatPanelAnimationComplete = useCallback(() => {
    if (messagesCountRef.current === 0) return;
    transcriptPanelStableRef.current = true;
    scrollTranscriptToBottom(scrollRef.current, "settle");
    bootScrollRef.current = false;
  }, []);

  const inputBarProps = {
    input,
    disabled: isStreaming,
    textareaRef,
    onSend: handleSend,
    onChange: handleTextareaChange,
    onKeyDown: handleKeyDown,
  } as const;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full">
      <AnimatePresence mode="wait">
        {!hasMessages ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex-1 flex flex-col items-center justify-center min-h-0 px-4 py-8 gap-8 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="size-14 rounded-2xl bg-primary/10 border-2 border-border shadow-[3px_3px_0_black] flex items-center justify-center">
                <Sparkles className="size-7 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">Poomo AI</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your productivity assistant — start timers, add tasks, check
                  stats
                </p>
              </div>
            </motion.div>

            <InputBar {...inputBarProps} />

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="flex flex-wrap justify-center gap-2"
            >
              {SUGGESTIONS.map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSuggestion(s)}
                  className="border-2 border-border rounded-full px-4 py-1.5 text-sm font-medium bg-white shadow-[2px_2px_0_black] hover:bg-secondary hover:text-secondary-foreground active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-colors cursor-pointer"
                >
                  {s}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            onAnimationComplete={handleChatPanelAnimationComplete}
            className="flex-1 flex flex-col min-h-0 overflow-hidden w-full"
          >
            <div className="shrink-0 flex justify-end px-4 pt-2 pb-1 bg-background/95 z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-xs text-muted-foreground gap-1"
              >
                <Trash2 className="size-3" />
                Clear chat
              </Button>
            </div>
            <div
              ref={scrollRef}
              className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto overscroll-y-contain max-sm:pb-48 sm:pb-36"
            >
              <div
                ref={transcriptRef}
                className="mx-auto flex w-full max-w-2xl shrink-0 flex-col gap-4 p-4 sm:p-6 pb-4"
              >
                {messages.map((msg, i) => {
                  const isLast = i === messages.length - 1;
                  if (isLast && showTyping) return null;
                  const prevLastId = prevLastMessageIdRef.current;
                  const animateEnter =
                    isLast && prevLastId !== undefined && prevLastId !== msg.id;
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isStreaming={isLast && isStreaming}
                      animateEnter={animateEnter}
                    />
                  );
                })}
                <AnimatePresence>
                  {showTyping && <TypingIndicator />}
                </AnimatePresence>
              </div>
            </div>

            {/* Mobile: flush bottom + solid bg so the dock runs under the floating nav (z-40) — no blur seam */}
            <div className="pointer-events-none fixed inset-x-0 z-30 max-sm:bottom-0 sm:bottom-6 sm:left-16">
              <div className="pointer-events-auto mx-auto w-full max-w-2xl px-4 pt-3 max-sm:border-t max-sm:border-border/40 max-sm:bg-background max-sm:pb-[calc(5.25rem+env(safe-area-inset-bottom))] max-sm:shadow-[0_-8px_32px_rgba(0,0,0,0.05)] sm:border-2 sm:border-border sm:rounded-2xl sm:bg-background/90 sm:pb-3 sm:pt-3 sm:shadow-[3px_3px_0_black] sm:backdrop-blur-md supports-[backdrop-filter]:sm:bg-background/75">
                <InputBar {...inputBarProps} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
