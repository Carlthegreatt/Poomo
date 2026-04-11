"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Layers,
  Trash2,
  X,
  GripVertical,
  Play,
  ArrowLeft,
  ArrowRight,
  Shuffle,
  RotateCcw,
  Pencil,
  Sparkles,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { useFlashcards } from "@/stores/flashcardsStore";
import FlashcardCard from "./FlashcardCard";
import { cn } from "@/lib/utils";
import { DECK_COLORS } from "@/lib/flashcards";
import type { FlashcardDeck, Flashcard } from "@/lib/flashcards";

/* ── Helpers ── */

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Deck Tile Content ── */

function DeckTileContent({
  deck,
  isDragging,
}: {
  deck: FlashcardDeck;
  isDragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-2 border-border bg-white rounded-2xl shadow-[3px_3px_0_black] overflow-hidden flex flex-col h-full",
        isDragging && "shadow-[5px_5px_0_black] ring-2 ring-primary/30",
      )}
    >
      <div
        className="h-1.5 shrink-0"
        style={{ backgroundColor: deck.color ?? "var(--secondary)" }}
      />
      <div className="flex-1 p-3.5 flex flex-col min-h-[120px]">
        <h3 className="text-sm font-bold leading-snug line-clamp-2 mb-1.5">
          {deck.title || "Untitled Deck"}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
          <Layers className="size-3" />
          <span>
            {deck.cards.length} card{deck.cards.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/15">
          <span className="text-[0.625rem] text-muted-foreground/60">
            {formatDate(deck.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Sortable Deck Tile ── */

function SortableDeckTile({
  deck,
  onClick,
  onStudy,
  onDelete,
}: {
  deck: FlashcardDeck;
  onClick: () => void;
  onStudy: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deck.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-3 z-10 size-6 flex items-center justify-center rounded-lg bg-white/80 border border-border/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="size-3 text-muted-foreground" />
      </div>

      {/* Click area */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        className="cursor-pointer h-full"
      >
        <DeckTileContent deck={deck} />
      </div>

      {/* Hover actions */}
      <div className="absolute bottom-4 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStudy();
          }}
          className="size-6 flex items-center justify-center rounded-lg bg-white/90 border border-border/20 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Study"
        >
          <Play className="size-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="size-6 flex items-center justify-center rounded-lg bg-white/90 border border-border/20 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}

/* ── Deck Editor Modal ── */

function DeckEditorModal({
  deck,
  onClose,
}: {
  deck: FlashcardDeck;
  onClose: () => void;
}) {
  const { editDeck, addCardToDeck, editCard, removeCard } = useFlashcards();
  const [title, setTitle] = useState(deck.title);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");

  // Get the latest deck data from store
  const currentDeck = useFlashcards((s) => s.decks.find((d) => d.id === deck.id));
  const cards = currentDeck?.cards ?? deck.cards;

  const handleTitleBlur = () => {
    if (title.trim() !== deck.title) {
      editDeck(deck.id, { title: title.trim() || "Untitled Deck" });
    }
  };

  const handleAddCard = async () => {
    if (!newFront.trim() && !newBack.trim()) return;
    await addCardToDeck(deck.id, newFront.trim(), newBack.trim());
    setNewFront("");
    setNewBack("");
  };

  const handleStartEdit = (card: Flashcard) => {
    setEditingCardId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const handleSaveEdit = async (cardId: string) => {
    await editCard(deck.id, cardId, {
      front: editFront.trim(),
      back: editBack.trim(),
    });
    setEditingCardId(null);
  };

  const handleColorChange = (color: string | null) => {
    editDeck(deck.id, { color });
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-2xl max-h-[85vh] border-2 border-border bg-white rounded-3xl shadow-[6px_6px_0_black] flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b-2 border-border shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="text-sm font-bold bg-transparent focus:outline-none flex-1 min-w-0"
              placeholder="Deck title..."
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2 border-b border-border/30 shrink-0">
          <span className="text-xs text-muted-foreground">Color:</span>
          <button
            type="button"
            onClick={() => handleColorChange(null)}
            className={cn(
              "size-5 rounded-full border-2 bg-muted",
              !currentDeck?.color && "ring-2 ring-primary ring-offset-1",
            )}
          />
          {DECK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleColorChange(c)}
              className={cn(
                "size-5 rounded-full border-2 border-border/30",
                currentDeck?.color === c && "ring-2 ring-primary ring-offset-1",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Cards list */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Cards ({cards.length})
          </div>

          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-border rounded-xl bg-white shadow-[2px_2px_0_black] overflow-hidden"
            >
              {editingCardId === card.id ? (
                <div className="p-3 space-y-2">
                  <input
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                    className="w-full text-sm font-medium bg-muted/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Front (question)..."
                    autoFocus
                  />
                  <input
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                    className="w-full text-sm bg-muted/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Back (answer)..."
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingCardId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="filled"
                      size="sm"
                      onClick={() => handleSaveEdit(card.id)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 flex items-start gap-3">
                  <span className="text-xs font-bold text-muted-foreground/40 mt-1 shrink-0 w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">
                      {card.front || "No question"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {card.back || "No answer"}
                    </p>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(card)}
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCard(deck.id, card.id)}
                      className="size-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* Add card form */}
          <div className="border-2 border-dashed border-border/50 rounded-xl p-3 space-y-2 bg-muted/10">
            <div className="text-xs font-bold text-muted-foreground mb-1">
              Add new card
            </div>
            <input
              value={newFront}
              onChange={(e) => setNewFront(e.target.value)}
              className="w-full text-sm bg-white rounded-lg px-3 py-2 border border-border/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Front (question)..."
            />
            <input
              value={newBack}
              onChange={(e) => setNewBack(e.target.value)}
              className="w-full text-sm bg-white rounded-lg px-3 py-2 border border-border/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Back (answer)..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCard();
              }}
            />
            <div className="flex justify-end">
              <Button
                variant="filled"
                size="sm"
                onClick={handleAddCard}
                className="gap-1.5"
                disabled={!newFront.trim() && !newBack.trim()}
              >
                <Plus className="size-3.5" />
                Add Card
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Study Mode ── */

function StudyMode({
  deck,
  onClose,
}: {
  deck: FlashcardDeck;
  onClose: () => void;
}) {
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>(deck.cards);
  const [isShuffled, setIsShuffled] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const card = shuffledCards[cardIndex];
  const total = shuffledCards.length;
  const progress = total > 0 ? ((cardIndex + 1) / total) * 100 : 0;
  const isLastCard = total > 0 && cardIndex === total - 1;

  const goNext = useCallback(() => {
    if (cardIndex < total - 1) {
      setIsFlipped(false);
      setTimeout(() => setCardIndex((i) => i + 1), 100);
    }
  }, [cardIndex, total]);

  const goPrev = useCallback(() => {
    if (cardIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCardIndex((i) => i - 1), 100);
    }
  }, [cardIndex]);

  const handleShuffle = () => {
    const shuffled = [...deck.cards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCardIndex(0);
    setIsFlipped(false);
    setIsShuffled(true);
    setSessionComplete(false);
  };

  const handleReset = () => {
    setShuffledCards(deck.cards);
    setCardIndex(0);
    setIsFlipped(false);
    setIsShuffled(false);
    setSessionComplete(false);
  };

  const finishSession = useCallback(() => {
    setSessionComplete(true);
  }, []);

  const studyAgain = useCallback(() => {
    setSessionComplete(false);
    setCardIndex(0);
    setIsFlipped(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (sessionComplete) return;

      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "button, a, input, textarea, select, [contenteditable=true]",
        )
      ) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        if (isLastCard) finishSession();
        else goNext();
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        goPrev();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose, sessionComplete, isLastCard, finishSession]);

  if (total === 0) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Layers className="size-12 text-muted-foreground/20 mb-4" />
        <p className="text-lg font-bold mb-2">No cards in this deck</p>
        <p className="text-sm text-muted-foreground mb-6">
          Add some cards first to start studying.
        </p>
        <Button variant="filled" onClick={onClose}>
          Go Back
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative flex flex-col flex-1 min-h-0 min-w-0">
      {/* Top bar */}
      <div className="flex flex-col shrink-0 border-b-2 border-border bg-white">
        <div
          className="h-1 w-full shrink-0"
          style={{ backgroundColor: deck.color ?? "var(--secondary)" }}
          aria-hidden
        />
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors min-w-0 z-[1]"
        >
          <ArrowLeft className="size-4 shrink-0" />
          <span className="truncate font-semibold text-foreground max-w-[min(50vw,14rem)] sm:max-w-[20rem]">
            {deck.title || "Untitled deck"}
          </span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 z-[1]">
          <span className="text-xs sm:text-sm font-bold tabular-nums text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg border border-border/40">
            {cardIndex + 1} / {total}
          </span>
          <button
            type="button"
            onClick={handleShuffle}
            className={cn(
              "size-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors",
              isShuffled && "text-primary bg-primary/10",
            )}
            title="Shuffle deck"
          >
            <Shuffle className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="size-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
            title="Original order"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
        </div>
      </div>

      {/* Progress — single bar (header already shows card index) */}
      <div className="shrink-0 h-1.5 bg-muted">
        <motion.div
          className="h-full bg-primary rounded-r-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!sessionComplete && card ? (
            <motion.div
              key={cardIndex}
              initial={{ opacity: 0, x: 36, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -28, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg my-auto"
            >
              <FlashcardCard
                front={card.front}
                back={card.back}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped((f) => !f)}
                color={deck.color}
                cardNumber={cardIndex + 1}
                totalCards={total}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Bottom nav */}
      <div
        className={cn(
          "flex flex-col items-stretch gap-3 px-4 pt-3 border-t-2 border-border bg-white shrink-0",
          "pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4",
        )}
      >
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrev}
            disabled={cardIndex === 0 || sessionComplete}
            className="gap-1.5 min-w-[5.5rem]"
          >
            <ArrowLeft className="size-3.5" />
            Prev
          </Button>
          <Button
            variant="filled"
            size="sm"
            onClick={() => setIsFlipped((f) => !f)}
            disabled={sessionComplete}
            className="px-5 sm:px-8 min-h-10 shadow-[2px_2px_0_0_var(--border)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            {isFlipped ? "Show question" : "Show answer"}
          </Button>
          {isLastCard ? (
            <Button
              variant="filled"
              size="sm"
              onClick={finishSession}
              disabled={sessionComplete}
              className="gap-1.5 min-w-[5.5rem] bg-success text-white hover:bg-success/90 border-2 border-border shadow-[2px_2px_0_0_var(--border)]"
            >
              Finish
              <Sparkles className="size-3.5" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={goNext}
              disabled={sessionComplete}
              className="gap-1.5 min-w-[5.5rem]"
            >
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
        {isLastCard && !sessionComplete ? (
          <p className="text-center text-[0.7rem] text-muted-foreground/80">
            Last card — tap Finish when you&apos;re done with this deck.
          </p>
        ) : null}

        {/* Keyboard hints */}
        <div className="hidden sm:flex items-center justify-center gap-x-4 gap-y-1 flex-wrap text-[0.625rem] text-muted-foreground/45">
          <span>← → or A / D</span>
          <span>Space · Enter · F flip</span>
          <span>→ ends session on last card</span>
          <span>Esc exit</span>
        </div>
      </div>

      <AnimatePresence>
        {sessionComplete ? (
          <motion.div
            className="absolute inset-0 z-[2] flex items-center justify-center bg-background/85 backdrop-blur-md p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm border-2 border-border bg-white rounded-3xl shadow-[6px_6px_0_0_var(--border)] p-6 sm:p-8 text-center"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 border-2 border-border mb-4">
                <Sparkles className="size-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold tracking-tight mb-1">
                Session complete
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                You went through all {total} card{total !== 1 ? "s" : ""} in{" "}
                <span className="font-medium text-foreground">
                  {deck.title || "this deck"}
                </span>
                .
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={onClose}
                >
                  Exit
                </Button>
                <Button
                  variant="filled"
                  size="sm"
                  className="w-full sm:w-auto gap-1.5"
                  onClick={studyAgain}
                >
                  <RotateCcw className="size-3.5" />
                  Study again
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Main View ── */

export default function FlashcardsView() {
  const {
    decks,
    isLoading,
    loadDecks,
    addDeck,
    removeDeck,
    reorderDecks,
  } = useFlashcards();

  const [search, setSearch] = useState("");
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [studyingDeck, setStudyingDeck] = useState<FlashcardDeck | null>(null);
  const [draggingDeck, setDraggingDeck] = useState<FlashcardDeck | null>(null);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  // Keep editing deck in sync
  useEffect(() => {
    if (editingDeck) {
      const updated = decks.find((d) => d.id === editingDeck.id);
      if (updated) setEditingDeck(updated);
      else setEditingDeck(null);
    }
  }, [decks]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search.trim()
    ? decks.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))
    : decks;

  const deckIds = useMemo(() => filtered.map((d) => d.id), [filtered]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const deck = decks.find((d) => d.id === event.active.id);
      setDraggingDeck(deck ?? null);
    },
    [decks],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingDeck(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      reorderDecks(active.id as string, over.id as string);
    },
    [reorderDecks],
  );

  const handleAddDeck = useCallback(async () => {
    await addDeck();
    const all = useFlashcards.getState().decks;
    const latest = all[all.length - 1];
    if (latest) setEditingDeck(latest);
  }, [addDeck]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSearching = search.trim().length > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold">Flashcards</h1>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 border-2 border-border rounded-xl bg-white px-3 py-1.5 shadow-[2px_2px_0_black] flex-1 sm:flex-initial sm:w-56">
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search decks..."
              className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-w-0"
            />
          </div>
          <motion.div whileTap={{ scale: 0.93 }}>
            <Button
              variant="filled"
              size="sm"
              onClick={handleAddDeck}
              className="gap-1.5 shrink-0"
            >
              <Plus className="size-3.5" />
              New Deck
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Deck Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={deckIds}
          strategy={rectSortingStrategy}
          disabled={isSearching}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((deck) => (
              <SortableDeckTile
                key={deck.id}
                deck={deck}
                onClick={() => setEditingDeck(deck)}
                onStudy={() => setStudyingDeck(deck)}
                onDelete={() => removeDeck(deck.id)}
              />
            ))}

            {/* New deck tile */}
            <motion.div
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAddDeck}
              className="border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center gap-2 min-h-[120px] text-muted-foreground hover:text-foreground hover:border-border hover:bg-white/50 transition-colors cursor-pointer"
            >
              <Plus className="size-5" />
              <span className="text-sm font-medium">New Deck</span>
            </motion.div>
          </div>
        </SortableContext>

        <DragOverlay>
          {draggingDeck ? (
            <div className="w-full max-w-[280px]">
              <DeckTileContent deck={draggingDeck} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty state */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
        >
          <Layers className="size-10 opacity-20" />
          <p className="text-sm font-medium">
            {search
              ? "No decks match your search"
              : "No decks yet — create one!"}
          </p>
        </motion.div>
      )}

      {/* Deck Editor Modal */}
      <AnimatePresence>
        {editingDeck && (
          <DeckEditorModal
            key={editingDeck.id}
            deck={editingDeck}
            onClose={() => setEditingDeck(null)}
          />
        )}
      </AnimatePresence>

      {/* Study Mode */}
      <AnimatePresence>
        {studyingDeck && (
          <StudyMode
            key={studyingDeck.id}
            deck={studyingDeck}
            onClose={() => setStudyingDeck(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
