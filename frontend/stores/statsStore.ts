import { create } from "zustand";
import { toast } from "sonner";
import {
  getAuthUserId,
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

/** Coalesces concurrent `loadSessions` calls (bootstrap + page/chat context). */
let sessionsLoadInFlight: Promise<void> | null = null;
/** User id for which sessions were last hydrated. */
let sessionsHydratedForUserId: string | null = null;

/** Clears session-local stats cache so next auth session refetches from API. */
export function resetStatsSessionData(): void {
  sessionsLoadInFlight = null;
  sessionsHydratedForUserId = null;
  useStats.setState({ sessions: [], isLoading: false, error: null });
}

interface StatsState {
  sessions: FocusSession[];
  dailyGoal: number;
  isLoading: boolean;
  error: string | null;

  loadSessions: (options?: { force?: boolean }) => Promise<void>;
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

  loadSessions: async (options?: { force?: boolean }) => {
    const force = options?.force ?? false;
    await waitForAuthHydration();
    const uid = getAuthUserId();
    if (
      !force &&
      get().sessions.length > 0 &&
      uid != null &&
      sessionsHydratedForUserId === uid
    ) {
      if (get().isLoading) set({ isLoading: false });
      return;
    }
    if (sessionsLoadInFlight) return sessionsLoadInFlight;

    const run = (async () => {
      const uidAtStart = getAuthUserId();
      set({ isLoading: true, error: null });
      try {
        const sessions = await fetchSessions();
        if (getAuthUserId() !== uidAtStart) {
          set({ isLoading: false });
          return;
        }
        sessionsHydratedForUserId = getAuthUserId();
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
    })();

    sessionsLoadInFlight = run;
    try {
      await run;
    } finally {
      if (sessionsLoadInFlight === run) sessionsLoadInFlight = null;
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
