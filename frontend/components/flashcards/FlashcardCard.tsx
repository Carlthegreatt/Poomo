"use client";

import { motion } from "framer-motion";
import { FlipHorizontal2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashcardCardProps {
  front: string;
  back: string;
  isFlipped: boolean;
  onFlip: () => void;
  color?: string | null;
  cardNumber?: number;
  totalCards?: number;
}

export default function FlashcardCard({
  front,
  back,
  isFlipped,
  onFlip,
  color,
  cardNumber,
  totalCards,
}: FlashcardCardProps) {
  const accent = color ?? "var(--secondary)";
  const answerAccent = color ?? "var(--primary)";

  return (
    <div
      data-flashcard-root
      className="w-full max-w-lg mx-auto cursor-pointer group select-none rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ perspective: "1400px" }}
      onClick={onFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onFlip();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label={
        isFlipped
          ? "Answer side. Press Space or click to show question."
          : "Question side. Press Space or click to reveal answer."
      }
    >
      {/* No filter/backdrop on this node — filters flatten 3D and break backface-visibility */}
      <motion.div
        className="relative w-full min-h-[min(52vh,320px)] sm:min-h-[360px]"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        whileTap={{ scale: 0.985 }}
      >
        {/* Front Face */}
        <div
          className={cn(
            "absolute inset-0 border-2 border-border rounded-3xl shadow-[5px_5px_0_0_var(--border)]",
            "bg-gradient-to-b from-white to-muted/25",
            "flex flex-col items-stretch justify-center p-6 sm:p-10 pl-5 sm:pl-9",
            "transition-shadow duration-200 group-hover:shadow-[6px_7px_0_0_var(--border)]",
          )}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "translateZ(1px)",
          }}
        >
          <div
            className="absolute left-0 top-4 bottom-4 w-1 rounded-full sm:top-5 sm:bottom-5"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <div className="flex flex-col items-center justify-center flex-1 text-center gap-4 pl-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/80 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground shadow-[1px_1px_0_0_var(--border)]">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: accent }} />
              Question
            </span>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-snug tracking-tight text-balance max-w-prose">
              {front || "No question"}
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 mt-1">
              <FlipHorizontal2 className="size-3.5 shrink-0 opacity-60" aria-hidden />
              Tap or Space to flip
            </span>
          </div>
          {cardNumber != null && totalCards != null && totalCards > 0 ? (
            <div className="text-center text-[0.65rem] font-semibold tabular-nums text-muted-foreground/45 pt-2 pl-2">
              {cardNumber} / {totalCards}
            </div>
          ) : null}
        </div>

        {/* Back Face */}
        <div
          className={cn(
            "absolute inset-0 border-2 border-border rounded-3xl shadow-[5px_5px_0_0_var(--border)]",
            "bg-gradient-to-br from-white via-primary/[0.04] to-muted/30",
            "flex flex-col items-stretch justify-center p-6 sm:p-10 pl-5 sm:pl-9",
            "transition-shadow duration-200 group-hover:shadow-[6px_7px_0_0_var(--border)]",
          )}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg) translateZ(1px)",
          }}
        >
          <div
            className="absolute left-0 top-4 bottom-4 w-1 rounded-full sm:top-5 sm:bottom-5"
            style={{ backgroundColor: answerAccent }}
            aria-hidden
          />
          <div className="flex flex-col items-center justify-center flex-1 text-center gap-4 pl-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-white/90 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground shadow-[1px_1px_0_0_var(--border)]">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: answerAccent }} />
              Answer
            </span>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-snug tracking-tight text-balance max-w-prose">
              {back || "No answer"}
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 mt-1">
              <FlipHorizontal2 className="size-3.5 shrink-0 opacity-60" aria-hidden />
              Tap or Space to flip back
            </span>
          </div>
          {cardNumber != null && totalCards != null && totalCards > 0 ? (
            <div className="text-center text-[0.65rem] font-semibold tabular-nums text-muted-foreground/45 pt-2 pl-2">
              {cardNumber} / {totalCards}
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
