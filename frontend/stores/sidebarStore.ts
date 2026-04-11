import { create } from "zustand";
import { readJSON, writeJSON } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";

export interface SidebarItem {
  id: string;
  pinned: boolean;
}

/* Default order: first 5 are pinned to the main bar, the rest live in "More" */
const DEFAULT_ITEMS: SidebarItem[] = [
  { id: "chat", pinned: true },
  { id: "timer", pinned: true },
  { id: "board", pinned: true },
  { id: "calendar", pinned: true },
  { id: "notes", pinned: true },
  { id: "stats", pinned: false },
  { id: "flashcards", pinned: false },
];

interface SidebarState {
  items: SidebarItem[];
  loadItems: () => void;
  reorder: (activeId: string, overId: string) => void;
  togglePin: (id: string) => void;
}

function persist(items: SidebarItem[]) {
  writeJSON(STORAGE_KEYS.SIDEBAR_ORDER, items);
}

export const useSidebar = create<SidebarState>((set, get) => ({
  items: DEFAULT_ITEMS,

  loadItems: () => {
    const saved = readJSON<SidebarItem[] | null>(STORAGE_KEYS.SIDEBAR_ORDER, null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      // Merge: add any new default items that don't exist in saved
      const savedIds = new Set(saved.map((s) => s.id));
      const merged = [
        ...saved,
        ...DEFAULT_ITEMS.filter((d) => !savedIds.has(d.id)),
      ];
      set({ items: merged });
    } else {
      set({ items: DEFAULT_ITEMS });
    }
  },

  reorder: (activeId, overId) => {
    const items = [...get().items];
    const oldIdx = items.findIndex((i) => i.id === activeId);
    const newIdx = items.findIndex((i) => i.id === overId);
    if (oldIdx === -1 || newIdx === -1) return;
    const [moved] = items.splice(oldIdx, 1);
    items.splice(newIdx, 0, moved);
    set({ items });
    persist(items);
  },

  togglePin: (id) => {
    const items = get().items.map((item) =>
      item.id === id ? { ...item, pinned: !item.pinned } : item,
    );
    set({ items });
    persist(items);
  },
}));
