"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Panel anchored below trigger (matches sidebar “More” flyout). */
export const KANBAN_FLYOUT_PANEL_CLASS =
  "absolute z-[60] border-2 border-border bg-white rounded-2xl shadow-[4px_4px_0_black] overflow-hidden left-0 right-0 top-full mt-1.5 flex flex-col max-h-[min(85dvh,24rem)]";

export const KANBAN_FLYOUT_ROW_CLASS =
  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium hover:bg-muted/60 transition-colors text-left min-w-0";

/**
 * Scrollable option list. Pair with {@link useFlyoutListMaxStyle} when there are
 * multiple rows so the menu stays within the viewport.
 */
export const KANBAN_FLYOUT_SCROLL_CLASS =
  "min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-py-1 p-2 space-y-0.5 touch-pan-y [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:hsl(var(--muted-foreground)/0.45)_hsl(var(--muted)/0.35)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-muted/40";

const LIST_FALLBACK_MAX_CSS = "min(40dvh, 11rem)";

/**
 * Caps the list height using space below the anchor so the flyout (incl. footer)
 * stays on screen. When `rowCount < minRows`, no cap (short lists grow naturally).
 */
export function useFlyoutListMaxStyle(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  reserveBelowListPx: number,
  rowCount: number,
  minRows = 2,
): CSSProperties {
  const [px, setPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (!open || rowCount < minRows) {
      setPx(null);
      return;
    }

    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const margin = 10;
      const raw = vh - r.bottom - margin - reserveBelowListPx;
      setPx(Math.max(88, Math.min(360, raw)));
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const t = window.setTimeout(measure, 160);

    const vv = window.visualViewport;
    vv?.addEventListener("resize", measure);
    vv?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      vv?.removeEventListener("resize", measure);
      vv?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [open, reserveBelowListPx, rowCount, minRows, anchorRef]);

  if (!open || rowCount < minRows) return {};
  if (px == null) return { maxHeight: LIST_FALLBACK_MAX_CSS };
  return { maxHeight: px };
}

export function useKanbanFlyoutDismiss(
  open: boolean,
  setOpen: (v: boolean) => void,
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen, containerRef]);
}

type FlyoutTriggerProps = {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function KanbanFlyoutTrigger({
  open,
  onToggle,
  children,
  className,
  disabled,
}: FlyoutTriggerProps) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => onToggle()}
      onPointerDown={(e) => e.stopPropagation()}
      whileHover={disabled ? undefined : { scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "w-full flex items-center justify-between gap-2 border-2 border-border rounded-xl px-3 py-2 text-sm font-medium text-left transition-colors min-w-0",
        open ? "bg-muted/40" : "bg-white hover:bg-muted/30",
        disabled && "opacity-50 pointer-events-none",
        className,
      )}
    >
      <span className="flex items-center gap-2 min-w-0 flex-1">{children}</span>
      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: 0.15 }}
        className="shrink-0 text-muted-foreground"
      >
        <ChevronDown className="size-4" />
      </motion.span>
    </motion.button>
  );
}

type FlyoutPanelProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
};

export function KanbanFlyoutPanel({ open, children, className }: FlyoutPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 8 }}
          transition={{ duration: 0.15 }}
          className={cn(KANBAN_FLYOUT_PANEL_CLASS, className)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type KanbanFlyoutOption = { value: string; label: string };

type KanbanFlyoutSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: KanbanFlyoutOption[];
  /** Shown in the trigger when `value` is empty. */
  placeholder?: string;
  showClearOption?: boolean;
  /** Pinned below the scroll area (e.g. “Add new type”). */
  footer?: ReactNode;
  /** Label for the clear row; default “Not set”. */
  clearLabel?: string;
};

/**
 * Brutalist flyout menu for small option lists (priority, task type, etc.).
 * Long lists scroll inside the panel; footer stays visible.
 */
export function KanbanFlyoutSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Not set",
  showClearOption = true,
  footer,
  clearLabel = "Not set",
}: KanbanFlyoutSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useKanbanFlyoutDismiss(open, setOpen, containerRef);

  const optionRowCount = (showClearOption ? 1 : 0) + options.length;
  const reserveBelowListPx = footer ? 190 : 44;
  const listMaxStyle = useFlyoutListMaxStyle(
    open,
    containerRef,
    reserveBelowListPx,
    optionRowCount,
  );

  const selectedLabel =
    options.find((o) => o.value === value)?.label ??
    (value.trim() ? value : null);
  const displayLabel = selectedLabel ?? placeholder;

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="text-xs font-medium mb-1.5">{label}</div>
      <KanbanFlyoutTrigger
        open={open}
        onToggle={() => setOpen((v) => !v)}
      >
        <span className="truncate">{displayLabel}</span>
      </KanbanFlyoutTrigger>

      <KanbanFlyoutPanel open={open}>
        <div
          className={cn(
            KANBAN_FLYOUT_SCROLL_CLASS,
            footer ? "border-b border-border/30" : "",
          )}
          style={listMaxStyle}
        >
          {showClearOption && (
            <button
              type="button"
              onClick={() => select("")}
              className={cn(
                KANBAN_FLYOUT_ROW_CLASS,
                !value.trim() ? "bg-primary/10 text-primary" : "text-foreground",
              )}
            >
              {clearLabel}
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => select(o.value)}
              className={cn(
                KANBAN_FLYOUT_ROW_CLASS,
                value === o.value
                  ? "bg-primary/10 text-primary"
                  : "text-foreground",
              )}
            >
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border/30">{footer}</div>
        ) : null}
      </KanbanFlyoutPanel>
    </div>
  );
}
