import { create } from "zustand";
import { toast } from "sonner";
import {
  fetchBoard,
  createColumn as apiCreateColumn,
  updateColumn as apiUpdateColumn,
  deleteColumn as apiDeleteColumn,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  batchUpdatePositions,
  type KanbanColumn,
  type KanbanTask,
} from "@/lib/kanban";

interface KanbanState {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  isLoading: boolean;
  error: string | null;

  loadBoard: () => Promise<void>;
  addColumn: (title: string) => Promise<void>;
  renameColumn: (id: string, title: string) => Promise<void>;
  removeColumn: (id: string) => Promise<void>;
  reorderColumns: (activeId: string, overId: string) => void;
  persistColumnOrder: () => Promise<void>;

  addTask: (
    columnId: string,
    task: {
      title: string;
      description?: string;
      color?: string;
      due_date?: string;
    }
  ) => Promise<void>;
  editTask: (
    id: string,
    updates: Partial<
      Pick<KanbanTask, "title" | "description" | "color" | "due_date">
    >
  ) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  moveTask: (
    taskId: string,
    toColumnId: string,
    newIndex: number
  ) => void;
  reorderTaskInColumn: (
    columnId: string,
    activeId: string,
    overId: string
  ) => void;
  persistTaskOrder: (columnId: string) => Promise<void>;
  persistTaskMove: (
    taskId: string,
    toColumnId: string
  ) => Promise<void>;
}

function tasksForColumn(tasks: KanbanTask[], columnId: string) {
  return tasks
    .filter((t) => t.column_id === columnId)
    .sort((a, b) => a.position - b.position);
}

export const useKanban = create<KanbanState>((set, get) => ({
  columns: [],
  tasks: [],
  isLoading: false,
  error: null,

  loadBoard: async () => {
    set({ isLoading: true, error: null });
    try {
      const { columns, tasks } = await fetchBoard();
      set({ columns, tasks, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load board";
      set({ error: msg, isLoading: false });
      toast.error(msg);
    }
  },

  addColumn: async (title) => {
    const position = get().columns.length;
    const tempId = `temp-${Date.now()}`;
    const optimistic: KanbanColumn = {
      id: tempId,
      user_id: "",
      title,
      position,
      created_at: new Date().toISOString(),
    };

    set((s) => ({ columns: [...s.columns, optimistic] }));

    try {
      const real = await apiCreateColumn(title, position);
      set((s) => ({
        columns: s.columns.map((c) => (c.id === tempId ? real : c)),
      }));
    } catch {
      set((s) => ({ columns: s.columns.filter((c) => c.id !== tempId) }));
      toast.error("Failed to create column");
    }
  },

  renameColumn: async (id, title) => {
    const prev = get().columns.find((c) => c.id === id);
    if (!prev) return;

    set((s) => ({
      columns: s.columns.map((c) => (c.id === id ? { ...c, title } : c)),
    }));

    try {
      await apiUpdateColumn(id, { title });
    } catch {
      set((s) => ({
        columns: s.columns.map((c) =>
          c.id === id ? { ...c, title: prev.title } : c
        ),
      }));
      toast.error("Failed to rename column");
    }
  },

  removeColumn: async (id) => {
    const prev = get().columns;
    const prevTasks = get().tasks;

    set((s) => ({
      columns: s.columns.filter((c) => c.id !== id),
      tasks: s.tasks.filter((t) => t.column_id !== id),
    }));

    try {
      await apiDeleteColumn(id);
    } catch {
      set({ columns: prev, tasks: prevTasks });
      toast.error("Failed to delete column");
    }
  },

  reorderColumns: (activeId, overId) => {
    set((s) => {
      const cols = [...s.columns];
      const oldIdx = cols.findIndex((c) => c.id === activeId);
      const newIdx = cols.findIndex((c) => c.id === overId);
      if (oldIdx === -1 || newIdx === -1) return s;

      const [moved] = cols.splice(oldIdx, 1);
      cols.splice(newIdx, 0, moved);
      return {
        columns: cols.map((c, i) => ({ ...c, position: i })),
      };
    });
  },

  persistColumnOrder: async () => {
    const items = get().columns.map((c) => ({
      id: c.id,
      position: c.position,
    }));
    try {
      await batchUpdatePositions("kanban_columns", items);
    } catch {
      toast.error("Failed to save column order");
    }
  },

  addTask: async (columnId, task) => {
    const colTasks = tasksForColumn(get().tasks, columnId);
    const position = colTasks.length;
    const tempId = `temp-${Date.now()}`;
    const optimistic: KanbanTask = {
      id: tempId,
      user_id: "",
      column_id: columnId,
      title: task.title,
      description: task.description ?? null,
      color: task.color ?? null,
      due_date: task.due_date ?? null,
      position,
      created_at: new Date().toISOString(),
    };

    set((s) => ({ tasks: [...s.tasks, optimistic] }));

    try {
      const real = await apiCreateTask({
        column_id: columnId,
        title: task.title,
        description: task.description,
        color: task.color,
        due_date: task.due_date,
        position,
      });
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === tempId ? real : t)),
      }));
    } catch {
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== tempId) }));
      toast.error("Failed to create task");
    }
  },

  editTask: async (id, updates) => {
    const prev = get().tasks.find((t) => t.id === id);
    if (!prev) return;

    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));

    try {
      await apiUpdateTask(id, updates);
    } catch {
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? prev : t)),
      }));
      toast.error("Failed to update task");
    }
  },

  removeTask: async (id) => {
    const prev = get().tasks;

    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));

    try {
      await apiDeleteTask(id);
    } catch {
      set({ tasks: prev });
      toast.error("Failed to delete task");
    }
  },

  moveTask: (taskId, toColumnId, newIndex) => {
    set((s) => {
      const task = s.tasks.find((t) => t.id === taskId);
      if (!task) return s;

      const withoutTask = s.tasks.filter((t) => t.id !== taskId);
      const destTasks = tasksForColumn(withoutTask, toColumnId);
      destTasks.splice(newIndex, 0, { ...task, column_id: toColumnId });

      const updatedDest = destTasks.map((t, i) => ({
        ...t,
        position: i,
        column_id: toColumnId,
      }));

      const otherTasks = withoutTask.filter(
        (t) => t.column_id !== toColumnId
      );

      return { tasks: [...otherTasks, ...updatedDest] };
    });
  },

  reorderTaskInColumn: (columnId, activeId, overId) => {
    set((s) => {
      const colTasks = tasksForColumn(s.tasks, columnId);
      const oldIdx = colTasks.findIndex((t) => t.id === activeId);
      const newIdx = colTasks.findIndex((t) => t.id === overId);
      if (oldIdx === -1 || newIdx === -1) return s;

      const [moved] = colTasks.splice(oldIdx, 1);
      colTasks.splice(newIdx, 0, moved);

      const reindexed = colTasks.map((t, i) => ({ ...t, position: i }));
      const otherTasks = s.tasks.filter((t) => t.column_id !== columnId);
      return { tasks: [...otherTasks, ...reindexed] };
    });
  },

  persistTaskOrder: async (columnId) => {
    const colTasks = tasksForColumn(get().tasks, columnId);
    const items = colTasks.map((t) => ({
      id: t.id,
      position: t.position,
    }));
    try {
      await batchUpdatePositions("kanban_tasks", items);
    } catch {
      toast.error("Failed to save task order");
    }
  },

  persistTaskMove: async (taskId, toColumnId) => {
    const colTasks = tasksForColumn(get().tasks, toColumnId);
    const items = colTasks.map((t) => ({
      id: t.id,
      position: t.position,
      column_id: toColumnId,
    }));
    try {
      await batchUpdatePositions("kanban_tasks", items);
    } catch {
      toast.error("Failed to save task move");
    }
  },
}));
