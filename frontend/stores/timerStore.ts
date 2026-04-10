import { create } from "zustand";
import { toast } from "sonner";
import { logSession } from "@/lib/stats";

let completionTimeoutId: ReturnType<typeof setTimeout> | null = null;

function clearCompletionTimeout() {
  if (completionTimeoutId != null) {
    clearTimeout(completionTimeoutId);
    completionTimeoutId = null;
  }
}

function scheduleCompletionTimeout(targetEndAt: number, tick: (now?: number) => void) {
  clearCompletionTimeout();
  const ms = Math.max(0, targetEndAt - Date.now());
  completionTimeoutId = setTimeout(() => {
    completionTimeoutId = null;
    tick(Date.now());
  }, ms);
}

export type Phase = "IDLE" | "WORK" | "BREAK_SHORT" | "BREAK_LONG";

type Durations = {
  WORK: number;
  BREAK_SHORT: number;
  BREAK_LONG: number;
};

type FinishListener = (finishedPhase: Phase) => void;

const finishListeners = new Set<FinishListener>();
export function onTimerFinished(cb: FinishListener) {
  finishListeners.add(cb);
  return () => finishListeners.delete(cb);
}

export interface TimerState {
  phase: Phase;
  isRunning: boolean;
  remainingMs: number;
  targetEndAt?: number;
  phaseStartedAt?: number;
  cycleCount: number;
  durations: Durations;
  autoAdvance: boolean;
  longBreakEvery: number;
  bellVolume: number;

  activeTaskId: string | null;
  activeTaskTitle: string | null;

  start: (phase: Exclude<Phase, "IDLE">, minutes?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: (now?: number) => void;
  setPhasePreview: (phase: Exclude<Phase, "IDLE">) => void;
  setActiveTask: (id: string | null, title: string | null) => void;

  setDurations: (d: Partial<Durations>) => void;
  setAutoAdvance: (v: boolean) => void;
  setLongBreakEvery: (n: number) => void;
  setBellVolume: (v: number) => void;
}

export const useTimer = create<TimerState>((set, get) => ({
  phase: "IDLE",
  isRunning: false,
  remainingMs: 0,
  targetEndAt: undefined,
  phaseStartedAt: undefined,
  cycleCount: 0,
  durations: {
    WORK: 250 * 6_000,
    BREAK_SHORT: 50 * 6_000,
    BREAK_LONG: 15 * 60_000,
  },
  autoAdvance: true,
  longBreakEvery: 4,
  bellVolume: 0.7,

  activeTaskId: null,
  activeTaskTitle: null,

  start: (phase, minutes) => {
    const ms = minutes ? Math.max(0, minutes * 60_000) : get().durations[phase];
    const now = Date.now();
    const target = now + ms;
    set({
      phase,
      isRunning: true,
      remainingMs: ms,
      targetEndAt: target,
      phaseStartedAt: now,
    });
    scheduleCompletionTimeout(target, get().tick);
  },

  pause: () => {
    clearCompletionTimeout();
    const { targetEndAt } = get();
    if (!targetEndAt) return;
    const remaining = Math.max(0, targetEndAt - Date.now());
    set({ isRunning: false, remainingMs: remaining, targetEndAt: undefined });
  },

  resume: () => {
    const { remainingMs, phase } = get();
    if (remainingMs <= 0) return;
    const target = Date.now() + remainingMs;
    set({ isRunning: true, targetEndAt: target, phase });
    scheduleCompletionTimeout(target, get().tick);
  },

  reset: () => {
    clearCompletionTimeout();
    set({
      phase: "IDLE",
      isRunning: false,
      remainingMs: 0,
      targetEndAt: undefined,
      phaseStartedAt: undefined,
      cycleCount: 0,
    });
  },

  tick: (now = Date.now()) => {
    const { isRunning, targetEndAt, phase } = get();
    if (!isRunning || !targetEndAt) return;
    const diff = targetEndAt - now;

    if (diff <= 0) {
      clearCompletionTimeout();
      const finishedPhase = phase;
      finishListeners.forEach((fn) => {
        try {
          fn(finishedPhase);
        } catch {
          /* ignore */
        }
      });

      const phaseMap = {
        WORK: "focus",
        BREAK_SHORT: "shortBreak",
        BREAK_LONG: "longBreak",
      } as const;

      const { durations, activeTaskId, activeTaskTitle, phaseStartedAt } = get();
      const phaseDuration = durations[finishedPhase as keyof Durations];
      const endedAt = new Date();
      const startedAt = phaseStartedAt
        ? new Date(phaseStartedAt)
        : new Date(endedAt.getTime() - phaseDuration);

      logSession({
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        phase: phaseMap[finishedPhase as keyof typeof phaseMap] ?? "focus",
        durationMs: phaseDuration,
        taskId: finishedPhase === "WORK" ? activeTaskId : null,
        taskTitle: finishedPhase === "WORK" ? activeTaskTitle : null,
      });

      set((s) => {
        if (s.phase === "WORK") {
          const newCycle = s.cycleCount + 1;
          toast("Great Job! Time to rest..");
          if (s.autoAdvance) {
            if (newCycle >= s.longBreakEvery) {
              toast("Time for a looong break..");
              return {
                phase: "BREAK_LONG" as const,
                isRunning: false,
                remainingMs: s.durations.BREAK_LONG,
                targetEndAt: undefined,
                phaseStartedAt: undefined,
                cycleCount: 0,
              };
            } else {
              return {
                phase: "BREAK_SHORT" as const,
                isRunning: false,
                remainingMs: s.durations.BREAK_SHORT,
                targetEndAt: undefined,
                phaseStartedAt: undefined,
                cycleCount: newCycle,
              };
            }
          } else {
            return {
              phase: "IDLE" as const,
              isRunning: false,
              remainingMs: 0,
              targetEndAt: undefined,
              phaseStartedAt: undefined,
              cycleCount: newCycle,
            };
          }
        } else if (s.phase === "BREAK_SHORT" || s.phase === "BREAK_LONG") {
          if (s.autoAdvance) {
            return {
              phase: "WORK" as const,
              isRunning: false,
              remainingMs: s.durations.WORK,
              targetEndAt: undefined,
              phaseStartedAt: undefined,
            };
          } else {
            return {
              phase: "IDLE" as const,
              isRunning: false,
              remainingMs: 0,
              targetEndAt: undefined,
              phaseStartedAt: undefined,
            };
          }
        } else {
          return {
            phase: "IDLE" as const,
            isRunning: false,
            remainingMs: 0,
            targetEndAt: undefined,
            phaseStartedAt: undefined,
          };
        }
      });
    } else {
      set({ remainingMs: diff });
    }
  },

  setPhasePreview: (phase) => {
    clearCompletionTimeout();
    const dur = get().durations[phase];
    set({
      phase,
      isRunning: false,
      remainingMs: dur,
      targetEndAt: undefined,
      phaseStartedAt: undefined,
    });
  },

  setActiveTask: (id, title) =>
    set({ activeTaskId: id, activeTaskTitle: title }),

  setDurations: (d) => set((s) => ({ durations: { ...s.durations, ...d } })),

  setAutoAdvance: (v) => set({ autoAdvance: v }),

  setLongBreakEvery: (n) => set({ longBreakEvery: Math.max(1, Math.floor(n)) }),

  setBellVolume: (v) =>
    set({ bellVolume: Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0)) }),
}));

let clientSyncInitialized = false;

/** Run once on the client: sync deadline when tab gains focus (intervals/throttled ticks lag in background). */
export function initTimerClientSync() {
  if (typeof window === "undefined" || clientSyncInitialized) return;
  clientSyncInitialized = true;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      useTimer.getState().tick();
    }
  });
}
