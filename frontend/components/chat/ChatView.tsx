"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendHorizontal, Bot, User, Sparkles } from "lucide-react";
import { Button } from "../ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How can I stay focused longer?",
  "Tips for better breaks",
  "Help me plan my tasks",
];

function InputBar({
  input,
  textareaRef,
  onSend,
  onChange,
  onKeyDown,
}: {
  input: string;
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
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none py-1"
        />
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="filled"
            size="icon"
            onClick={onSend}
            disabled={!input.trim()}
            className="shrink-0 size-8 rounded-xl"
          >
            <SendHorizontal className="size-4" />
          </Button>
        </motion.div>
      </div>
      <p className="text-center text-[0.625rem] text-muted-foreground mt-2">
        AI features coming soon
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`size-7 rounded-full border-2 border-border flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0_black] ${
          isUser ? "bg-primary text-white" : "bg-white"
        }`}
      >
        {isUser ? (
          <User className="size-3.5" />
        ) : (
          <Bot className="size-3.5" />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl border-2 border-border px-4 py-2.5 text-sm leading-relaxed shadow-[2px_2px_0_black] ${
          isUser ? "bg-primary text-white" : "bg-white text-foreground"
        }`}
      >
        {message.content}
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
      className="flex gap-2.5"
    >
      <div className="size-7 rounded-full border-2 border-border flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0_black] bg-white">
        <Bot className="size-3.5" />
      </div>
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showTyping, setShowTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, showTyping, scrollToBottom]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
    ]);
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setShowTyping(true);
    setTimeout(() => setShowTyping(false), 1500);
  }, [input]);

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

  const handleSuggestion = useCallback((text: string) => {
    setMessages([
      { id: crypto.randomUUID(), role: "user", content: text },
    ]);
    setShowTyping(true);
    setTimeout(() => setShowTyping(false), 1500);
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <AnimatePresence mode="wait">
      {!hasMessages ? (
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col items-center justify-center min-h-0 px-4 gap-8"
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
                Ask me anything about productivity
              </p>
            </div>
          </motion.div>

          <InputBar
            input={input}
            textareaRef={textareaRef}
            onSend={handleSend}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
          />

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
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto flex flex-col gap-4 p-4 sm:p-6 pb-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <AnimatePresence>
                {showTyping && <TypingIndicator />}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-border/20 bg-background p-4">
            <InputBar
              input={input}
              textareaRef={textareaRef}
              onSend={handleSend}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
