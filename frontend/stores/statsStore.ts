import { create } from "zustand";
import { toast } from "sonner";
import {
  isCloudDataBackend,
  waitForAuthHydration,
} from "@/lib/data/authSession";
import { toUserMessage } from "@/lib/toUserMessage";
import { patchPreferencesCache } from "@/lib/data/preferencesCache";
import { setDailyGoalAction } from "@/lib/actions/preferences";
import { fetchSessions, getDailyGoal } from "@/lib/data/statsRepo";
import {
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
} from "@/lib/statsCalculations";

interface StatsState {
  sessions: FocusSession[];
  dailyGoal: number;
  isLoading: boolean;
  error: string | null;

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
  error: null,

  loadSessions: async () => {
    await waitForAuthHydration();
    set({ isLoading: true, error: null });
    try {
      const sessions = await fetchSessions();
      set({
        sessions,
        isLoading: false,
        dailyGoal: getDailyGoal(),
        error: null,
      });
    } catch (err) {
      const msg = toUserMessage(err, "Failed to load sessions");
      set({ isLoading: false, error: msg });
      toast.error(msg);
    }
  },

  setDailyGoal: (goal) => {
    if (!isCloudDataBackend()) return;
    void (async () => {
      const result = await setDailyGoalAction(goal);
      if (result.ok) {
        patchPreferencesCache({ daily_goal: result.data.dailyGoal });
        set({ dailyGoal: result.data.dailyGoal });
      }
    })();
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
