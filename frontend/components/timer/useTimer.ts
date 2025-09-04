// components/timer/useTimer.ts
import { create } from "zustand";

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
  cycleCount: number; // completed work sessions since last long break
  durations: Durations;
  autoAdvance: boolean;
  longBreakEvery: number;

  // actions
  start: (phase: Exclude<Phase, "IDLE">, minutes?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  tick: (now?: number) => void;
  setPhasePreview: (phase: Exclude<Phase, "IDLE">) => void;

  // settings
  setDurations: (d: Partial<Durations>) => void;
  setAutoAdvance: (v: boolean) => void;
  setLongBreakEvery: (n: number) => void;
}

export const useTimer = create<TimerState>((set, get) => ({
  phase: "IDLE",
  isRunning: false,
  remainingMs: 0,
  targetEndAt: undefined,
  cycleCount: 0,
  durations: {
    WORK: 1 * 6000,
    BREAK_SHORT: 5 * 60_000,
    BREAK_LONG: 15 * 60_000,
  },
  autoAdvance: true,
  longBreakEvery: 4,

  start: (phase, minutes) => {
    const ms = minutes ? Math.max(0, minutes * 60_000) : get().durations[phase];
    const target = Date.now() + ms;
    set({ phase, isRunning: true, remainingMs: ms, targetEndAt: target });
  },

  pause: () => {
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
  },

  reset: () => {
    set({
      phase: "IDLE",
      isRunning: false,
      remainingMs: 0,
      targetEndAt: undefined,
      cycleCount: 0,
    });
  },

  tick: (now = Date.now()) => {
    const { isRunning, targetEndAt, phase } = get();
    if (!isRunning || !targetEndAt) return;
    const diff = targetEndAt - now;

    if (diff <= 0) {
      // finished the current phase
      const finishedPhase = phase;
      // notify listeners immediately with the finished phase
      finishListeners.forEach((fn) => {
        try {
          fn(finishedPhase);
        } catch {
          /* ignore */
        }
      });

      // decide next state based on autoAdvance and cycle logic
      set((s) => {
        // If we just finished a WORK session, increment cycleCount
        if (s.phase === "WORK") {
          const newCycle = s.cycleCount + 1;
          if (s.autoAdvance) {
            if (newCycle >= s.longBreakEvery) {
              // start long break and reset cycle count
              const dur = s.durations.BREAK_LONG;
              return {
                phase: "BREAK_LONG",
                isRunning: true,
                remainingMs: dur,
                targetEndAt: now + dur,
                cycleCount: 0,
              };
            } else {
              // short break
              const dur = s.durations.BREAK_SHORT;
              return {
                phase: "BREAK_SHORT",
                isRunning: true,
                remainingMs: dur,
                targetEndAt: now + dur,
                cycleCount: newCycle,
              };
            }
          } else {
            return {
              phase: "IDLE",
              isRunning: false,
              remainingMs: 0,
              targetEndAt: undefined,
              cycleCount: newCycle,
            };
          }
        } else if (s.phase === "BREAK_SHORT" || s.phase === "BREAK_LONG") {
          // finished a break -> go to work
          if (s.autoAdvance) {
            const dur = s.durations.WORK;
            return {
              phase: "WORK",
              isRunning: true,
              remainingMs: dur,
              targetEndAt: now + dur,
            };
          } else {
            return {
              phase: "IDLE",
              isRunning: false,
              remainingMs: 0,
              targetEndAt: undefined,
            };
          }
        } else {
          return {
            phase: "IDLE",
            isRunning: false,
            remainingMs: 0,
            targetEndAt: undefined,
          };
        }
      });
    } else {
      // still running: update remainingMs
      set({ remainingMs: diff });
    }
  },

  setPhasePreview: (phase) => {
    const dur = get().durations[phase];
    set({ phase, isRunning: false, remainingMs: dur, targetEndAt: undefined });
  },

  setDurations: (d) => set((s) => ({ durations: { ...s.durations, ...d } })),

  setAutoAdvance: (v) => set({ autoAdvance: v }),

  setLongBreakEvery: (n) => set({ longBreakEvery: Math.max(1, Math.floor(n)) }),
}));
