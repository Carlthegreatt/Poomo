import { create } from "zustand";
import { toast } from "sonner";
import { getAuthUserId, waitForAuthHydration } from "@/lib/data/authSession";
import { toUserMessage } from "@/lib/toUserMessage";
import {
  fetchBoard,
  getTaskTypeLabels,
  registerTaskTypeLabel,
  createColumn as apiCreateColumn,
  updateColumn as apiUpdateColumn,
  deleteColumn as apiDeleteColumn,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
  batchUpdateColumnPositions,
  batchUpdateTaskPositions,
} from "@/lib/data/kanbanRepo";
import type { KanbanColumn, KanbanTask } from "@/lib/models/kanban";

/** Coalesces concurrent loads and skips redundant fetches when columns are already hydrated. */
let boardLoadInFlight: Promise<void> | null = null;
/** User id for which `columns` were last loaded; avoids skipping fetch after account switch. */
let boardHydratedForUserId: string | null = null;

/** Clears board state and in-flight fetch so a new session always reloads from the API. */
export function resetKanbanSessionData(): void {
  boardLoadInFlight = null;
  boardHydratedForUserId = null;
  useKanban.setState({
    columns: [],
    tasks: [],
    taskTypes: [],
    isLoading: false,
    error: null,
  });
}

interface KanbanState {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  taskTypes: string[];
  isLoading: boolean;
  error: string | null;

  loadBoard: (options?: { force?: boolean }) => Promise<void>;
  registerTaskType: (label: string) => Promise<void>;
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
      due_time?: string;
      priority?: KanbanTask["priority"];
      task_type?: string | null;
    },
  ) => Promise<void>;
  editTask: (
    id: string,
    updates: Partial<
      Pick<
        KanbanTask,
        | "title"
        | "description"
        | "color"
        | "due_date"
        | "due_time"
        | "priority"
        | "task_type"
      >
    >,
  ) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, toColumnId: string, newIndex: number) => void;
  reorderTaskInColumn: (
    columnId: string,
    activeId: string,
    overId: string,
  ) => void;
  persistTaskOrder: (columnId: string) => Promise<void>;
  /** Persist after cross-column drag; `fromColumnId` is the column where the drag started. */
  persistTaskMove: (toColumnId: string, fromColumnId: string) => Promise<void>;
}

function tasksForColumn(tasks: KanbanTask[], columnId: string) {
  return tasks
    .filter((t) => t.column_id === columnId)
    .sort((a, b) => a.position - b.position);
}

export const useKanban = create<KanbanState>((set, get) => ({
  columns: [],
  tasks: [],
  taskTypes: [],
  isLoading: false,
  error: null,

  loadBoard: async (options?: { force?: boolean }) => {
    const force = options?.force ?? false;
    await waitForAuthHydration();
    const uid = getAuthUserId();
    if (
      !force &&
      get().columns.length > 0 &&
      uid != null &&
      boardHydratedForUserId === uid
    ) {
      // Session bootstrap sets isLoading true before calling loadBoard; skipping fetch must
      // still clear the spinner (same for any caller that forced loading).
      if (get().isLoading) set({ isLoading: false });
      return;
    }
    if (boardLoadInFlight) return boardLoadInFlight;

    const run = (async () => {
      const uidAtStart = getAuthUserId();
      set({ isLoading: true, error: null });
      try {
        const { columns, tasks, task_types } = await fetchBoard();
        if (getAuthUserId() !== uidAtStart) {
          // Auth can flip while fetch is in flight (e.g. Board mounts before getUser resolves).
          set({ isLoading: false });
          return;
        }
        boardHydratedForUserId = getAuthUserId();
        set({
          columns,
          tasks,
          taskTypes: task_types,
          isLoading: false,
        });
      } catch (err) {
        const msg = toUserMessage(err, "Failed to load board");
        set({ error: msg, isLoading: false });
        toast.error(msg);
      }
    })();

    boardLoadInFlight = run;
    try {
      await run;
    } finally {
      if (boardLoadInFlight === run) boardLoadInFlight = null;
    }
  },

  registerTaskType: async (label: string) => {
    const t = label.trim();
    if (!t) return;
    try {
      const next = await registerTaskTypeLabel(t);
      set({ taskTypes: next });
    } catch {
      toast.error("Failed to save task type");
    }
  },

  addColumn: async (title) => {
    const position = get().columns.length;
    const tempId = `temp-${Date.now()}`;
    const optimistic: KanbanColumn = {
      id: tempId,
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
          c.id === id ? { ...c, title: prev.title } : c,
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
      await batchUpdateColumnPositions(items);
    } catch {
      toast.error("Failed to save column order");
    }
  },

  addTask: async (columnId, task) => {
    const colTasks = tasksForColumn(get().tasks, columnId);
    const position = colTasks.length;
    const tempId = `temp-${Date.now()}`;
    const dueDate = task.due_date ?? null;
    const dueTime =
      dueDate && task.due_time?.trim() ? task.due_time.trim() : null;
    const optimistic: KanbanTask = {
      id: tempId,
      column_id: columnId,
      title: task.title,
      description: task.description ?? null,
      color: task.color ?? null,
      due_date: dueDate,
      due_time: dueTime,
      priority: task.priority ?? null,
      task_type: task.task_type?.trim() || null,
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
        due_time: task.due_time,
        priority: task.priority,
        task_type: task.task_type,
        position,
      });
      const trimmedType = task.task_type?.trim() || null;
      const prevTypes = get().taskTypes;
      const nextTaskTypes =
        trimmedType && !prevTypes.includes(trimmedType)
          ? [...prevTypes, trimmedType].sort()
          : prevTypes;
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === tempId ? real : t)),
        taskTypes: nextTaskTypes,
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
      if (updates.task_type !== undefined) {
        const taskTypes = await getTaskTypeLabels();
        set({ taskTypes });
      }
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

      const fromColumnId = task.column_id;
      const withoutTask = s.tasks.filter((t) => t.id !== taskId);
      const destTasks = tasksForColumn(withoutTask, toColumnId);
      destTasks.splice(newIndex, 0, { ...task, column_id: toColumnId });

      const updatedDest = destTasks.map((t, i) => ({
        ...t,
        position: i,
        column_id: toColumnId,
      }));

      const rest = withoutTask.filter(
        (t) => t.column_id !== fromColumnId && t.column_id !== toColumnId,
      );
      const sourceReindexed = tasksForColumn(withoutTask, fromColumnId)
        .sort((a, b) => a.position - b.position)
        .map((t, i) => ({ ...t, position: i }));

      return { tasks: [...rest, ...sourceReindexed, ...updatedDest] };
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
      await batchUpdateTaskPositions(items);
    } catch {
      toast.error("Failed to save task order");
    }
  },

  persistTaskMove: async (toColumnId, fromColumnId) => {
    if (fromColumnId === toColumnId) {
      await get().persistTaskOrder(toColumnId);
      return;
    }
    const { tasks } = get();
    const srcItems = tasksForColumn(tasks, fromColumnId).map((t) => ({
      id: t.id,
      position: t.position,
    }));
    const destItems = tasksForColumn(tasks, toColumnId).map((t) => ({
      id: t.id,
      position: t.position,
      column_id: toColumnId,
    }));
    try {
      await batchUpdateTaskPositions([...srcItems, ...destItems]);
    } catch {
      toast.error("Failed to save task move");
    }
  },
}));
