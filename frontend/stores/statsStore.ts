import { create } from "zustand";
import { isCloudDataBackend } from "@/lib/data/authSession";
import { patchPreferencesCache } from "@/lib/data/preferencesCache";
import { setDailyGoalAction } from "@/lib/actions/preferences";
import {
  fetchSessions,
  getDailyGoal,
  setDailyGoal as persistGoal,
  getStreaks,
  getWeekData,
  getHeatmapData,
  getTaskBreakdown,
  getLifetimeStats,
  getFocusSessionsForDay,
  getFocusMinutesForDay,
  type FocusSession,
  type StreakInfo,
  type WeekData,
  type HeatmapDay,
  type TaskBreakdown,
  type LifetimeStats,
} from "@/lib/stats";

interface StatsState {
  sessions: FocusSession[];
  dailyGoal: number;
  isLoading: boolean;

  loadSessions: () => Promise<void>;
  setDailyGoal: (goal: number) => void;

  getTodayCount: () => number;
  getTodayMinutes: () => number;
  getStreaks: () => StreakInfo;
  getWeekData: () => WeekData[];
  getHeatmapData: (weeks?: number) => HeatmapDay[];
  getTaskBreakdown: () => TaskBreakdown[];
  getLifetimeStats: () => LifetimeStats;
}

export const useStats = create<StatsState>((set, get) => ({
  sessions: [],
  dailyGoal: getDailyGoal(),
  isLoading: false,

  loadSessions: async () => {
    set({ isLoading: true });
    try {
      const sessions = await fetchSessions();
      set({ sessions, isLoading: false, dailyGoal: getDailyGoal() });
    } catch {
      set({ isLoading: false });
    }
  },

  setDailyGoal: (goal) => {
    if (isCloudDataBackend()) {
      void (async () => {
        const result = await setDailyGoalAction(goal);
        if (result.ok) {
          patchPreferencesCache({ daily_goal: result.data.dailyGoal });
          set({ dailyGoal: result.data.dailyGoal });
        }
      })();
      return;
    }
    void persistGoal(goal)
      .then(() => set({ dailyGoal: getDailyGoal() }))
      .catch(() => {
        /* toast optional */
      });
  },

  getTodayCount: () =>
    getFocusSessionsForDay(get().sessions, new Date()).length,

  getTodayMinutes: () =>
    Math.round(getFocusMinutesForDay(get().sessions, new Date())),

  getStreaks: () => getStreaks(get().sessions),

  getWeekData: () => getWeekData(get().sessions),

  getHeatmapData: (weeks) => getHeatmapData(get().sessions, weeks),

  getTaskBreakdown: () => getTaskBreakdown(get().sessions),

  getLifetimeStats: () => getLifetimeStats(get().sessions),
}));
