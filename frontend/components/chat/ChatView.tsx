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
import type { WidgetType } from "@/lib/ai/chatStorage";

const SUGGESTIONS = [
  "Start a focus session",
  "What's on my todo list?",
  "Schedule a study session tomorrow at 3pm",
];

function scrollTranscriptToBottom(el: HTMLDivElement | null) {
  if (!el) return;
  const apply = () => {
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  };
  apply();
  queueMicrotask(apply);
  requestAnimationFrame(() => {
    requestAnimationFrame(apply);
  });
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
    default:
      return null;
  }
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const showCursor = !isUser && isStreaming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl border-2 border-border px-4 py-2.5 text-sm leading-relaxed shadow-[2px_2px_0_black] ${
          isUser ? "bg-primary text-white" : "bg-white text-foreground"
        }`}
      >
        {message.content || "\u00A0"}
        {showCursor && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-foreground ml-0.5 align-text-bottom"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
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

  const hasMessages = messages.length > 0;
  const showTyping =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant" &&
    !messages[messages.length - 1]?.content;

  const lastMessageId = messages[messages.length - 1]?.id;

  useLayoutEffect(() => {
    if (!hasMessages) return;
    scrollTranscriptToBottom(scrollRef.current);
  }, [hasMessages, messages.length, lastMessageId, isStreaming]);

  // Framer / flex layout can leave scrollHeight wrong on first paint; re-flush when thread appears.
  useEffect(() => {
    if (!hasMessages) return;
    const el = scrollRef.current;
    if (!el) return;
    const timers = [0, 50, 150, 350, 600].map((ms) =>
      window.setTimeout(() => scrollTranscriptToBottom(el), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [hasMessages]);

  useEffect(() => {
    if (!hasMessages) return;
    const outer = scrollRef.current;
    const inner = transcriptRef.current;
    if (!outer || !inner) return;
    const stickUntil = Date.now() + 2800;
    const nearBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = outer;
      return scrollHeight - scrollTop - clientHeight < 100;
    };
    const ro = new ResizeObserver(() => {
      if (Date.now() < stickUntil || nearBottom()) {
        scrollTranscriptToBottom(outer);
      }
    });
    ro.observe(inner);
    return () => ro.disconnect();
  }, [hasMessages]);

  useEffect(() => {
    const flush = () => {
      if (!document.hidden && scrollRef.current && messages.length > 0) {
        scrollTranscriptToBottom(scrollRef.current);
      }
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("focus", flush);
    window.addEventListener("pageshow", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("focus", flush);
      window.removeEventListener("pageshow", flush);
    };
  }, [messages.length]);

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
      {/* "wait" blocked chat from mounting until welcome exited, so scrollRef was null while scroll effects ran */}
      <AnimatePresence mode="sync">
        {!hasMessages ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
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
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden w-full"
            onAnimationComplete={() => {
              scrollTranscriptToBottom(scrollRef.current);
            }}
          >
            <div className="shrink-0 flex justify-end px-4 pt-2 pb-1 border-b border-border/30 bg-background/95 z-10">
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
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
              <div
                ref={transcriptRef}
                className="max-w-2xl mx-auto flex flex-col gap-4 p-4 sm:p-6 pb-4"
              >
                {messages.map((msg, i) => {
                  const isLast = i === messages.length - 1;
                  if (isLast && showTyping) return null;
                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isStreaming={isLast && isStreaming}
                    />
                  );
                })}
                <AnimatePresence>{showTyping && <TypingIndicator />}</AnimatePresence>
              </div>
            </div>

            <div className="shrink-0 sticky bottom-0 z-20 border-t border-border/40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
              <div className="p-4 pt-2">
                <InputBar {...inputBarProps} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
