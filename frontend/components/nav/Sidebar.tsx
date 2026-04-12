"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import {
  Timer,
  LayoutDashboard,
  CalendarDays,
  ChartBar,
  MessageCircle,
  StickyNote,
  Layers,
  MoreHorizontal,
  GripVertical,
  Pin,
  X,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { navDirection } from "@/lib/navDirection";
import { useSidebar, type SidebarItem } from "@/stores/sidebarStore";

/* ── Icon + route registry ── */

const NAV_REGISTRY: Record<
  string,
  { href: string; icon: typeof Timer; label: string }
> = {
  chat: { href: "/", icon: MessageCircle, label: "Chat" },
  timer: { href: "/timer", icon: Timer, label: "Pomodoro" },
  board: { href: "/board", icon: LayoutDashboard, label: "Board" },
  calendar: { href: "/calendar", icon: CalendarDays, label: "Calendar" },
  notes: { href: "/notes", icon: StickyNote, label: "Notes" },
  stats: { href: "/stats", icon: ChartBar, label: "Stats" },
  flashcards: { href: "/flashcards", icon: Layers, label: "Flashcards" },
};

/* ── Sortable reorder row ── */

function SortableNavRow({
  item,
  onTogglePin,
}: {
  item: SidebarItem;
  onTogglePin: () => void;
}) {
  const reg = NAV_REGISTRY[item.id];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!reg) return null;
  const Icon = reg.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-muted/50 transition-colors group"
    >
      <div
        {...attributes}
        {...listeners}
        className="size-5 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/40"
      >
        <GripVertical className="size-3" />
      </div>
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <span className="text-xs font-medium flex-1 min-w-0">{reg.label}</span>
      <button
        type="button"
        onClick={onTogglePin}
        className={`size-5 flex items-center justify-center rounded-md transition-colors ${
          item.pinned
            ? "text-primary bg-primary/10"
            : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted"
        }`}
        title={item.pinned ? "Unpin from sidebar" : "Pin to sidebar"}
      >
        <Pin
          className={`size-3 ${item.pinned ? "fill-primary" : ""}`}
        />
      </button>
    </div>
  );
}

/* ── More Flyout ── */

function MoreFlyout({
  items,
  onClose,
  onNavigate,
}: {
  items: SidebarItem[];
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const { reorder, togglePin } = useSidebar();
  const [showCustomize, setShowCustomize] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      reorder(active.id as string, over.id as string);
    },
    [reorder],
  );

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const unpinnedItems = items.filter(
    (i) => !i.pinned && NAV_REGISTRY[i.id],
  );

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 border-2 border-border bg-white rounded-2xl shadow-[4px_4px_0_black] overflow-hidden w-52
        bottom-full mb-2 left-1/2 -translate-x-1/2
        sm:bottom-auto sm:left-full sm:ml-2 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0"
    >
      {/* Quick links for unpinned items */}
      {unpinnedItems.length > 0 && !showCustomize && (
        <div className="p-2 border-b border-border/30">
          {unpinnedItems.map((item) => {
            const reg = NAV_REGISTRY[item.id];
            if (!reg) return null;
            const Icon = reg.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(reg.href);
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted/60 transition-colors text-left"
              >
                <Icon className="size-4 text-muted-foreground" />
                {reg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Customize toggle */}
      <div className="p-2">
        <button
          type="button"
          onClick={() => setShowCustomize((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          <span>Customize</span>
          <motion.span
            animate={{ rotate: showCustomize ? 45 : 0 }}
            transition={{ duration: 0.15 }}
          >
            {showCustomize ? (
              <X className="size-3" />
            ) : (
              <GripVertical className="size-3" />
            )}
          </motion.span>
        </button>

        <AnimatePresence>
          {showCustomize && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-1 space-y-0.5">
                <p className="text-[0.625rem] text-muted-foreground/50 px-2 mb-1">
                  Drag to reorder · Pin to show in sidebar
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={itemIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((item) => (
                      <SortableNavRow
                        key={item.id}
                        item={item}
                        onTogglePin={() => togglePin(item.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Main Sidebar ── */

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { items, loadItems } = useSidebar();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const pinnedItems = items.filter((i) => i.pinned && NAV_REGISTRY[i.id]);

  // Build the full ordered nav list for direction calculation
  const allNavItems = items
    .filter((i) => NAV_REGISTRY[i.id])
    .map((i) => NAV_REGISTRY[i.id]);

  const currentIndex = allNavItems.findIndex(
    (item) => item.href === pathname,
  );

  const handleNavigate = (href: string) => {
    if (href !== pathname) {
      const targetIndex = allNavItems.findIndex(
        (item) => item.href === href,
      );
      navDirection.value = targetIndex > currentIndex ? 1 : -1;
      router.push(href);
    }
  };

  // Check if current route is an unpinned page (to highlight the More button)
  const isMoreActive = items.some(
    (i) =>
      !i.pinned &&
      NAV_REGISTRY[i.id] &&
      NAV_REGISTRY[i.id].href === pathname,
  );

  return (
    <LayoutGroup id="sidebar">
      <nav className="fixed z-40 bottom-4 left-1/2 -translate-x-1/2 sm:bottom-auto sm:left-4 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0 flex sm:flex-col gap-1 border-2 border-border bg-white rounded-full p-1.5 shadow-[3px_3px_0_black]">
        {pinnedItems.map(({ id }) => {
          const reg = NAV_REGISTRY[id];
          if (!reg) return null;
          const { href, icon: Icon, label } = reg;
          const isActive = pathname === href;
          return (
            <motion.button
              key={id}
              onClick={() => handleNavigate(href)}
              title={label}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={`relative size-10 sm:size-11 flex items-center justify-center rounded-full cursor-pointer ${
                isActive
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-pill"
                  layout="position"
                  className="absolute inset-0 rounded-full bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 32,
                  }}
                />
              )}
              <motion.span
                animate={{ scale: isActive ? 1.05 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative z-10"
              >
                <Icon className="size-5" />
              </motion.span>
            </motion.button>
          );
        })}

        {/* More button */}
        <div className="relative">
          <motion.button
            onClick={() => setMoreOpen((v) => !v)}
            title="More"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`relative size-10 sm:size-11 flex items-center justify-center rounded-full cursor-pointer ${
              isMoreActive
                ? "text-white"
                : moreOpen
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isMoreActive && (
              <motion.span
                layoutId="sidebar-pill"
                layout="position"
                className="absolute inset-0 rounded-full bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 32,
                }}
              />
            )}
            <motion.span
              animate={{
                scale: isMoreActive ? 1.05 : 1,
                rotate: moreOpen ? 90 : 0,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative z-10"
            >
              <MoreHorizontal className="size-5" />
            </motion.span>
          </motion.button>

          <AnimatePresence>
            {moreOpen && (
              <MoreFlyout
                items={items}
                onClose={() => setMoreOpen(false)}
                onNavigate={(href) => {
                  handleNavigate(href);
                  setMoreOpen(false);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </nav>
    </LayoutGroup>
  );
}
