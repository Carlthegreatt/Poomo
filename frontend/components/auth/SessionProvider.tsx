"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { setAuthSessionState } from "@/lib/data/authSession";
import {
  resetPreferencesCache,
  getPreferencesCache,
  patchPreferencesCache,
} from "@/lib/data/preferencesCache";
import { fetchProfilePreferences } from "@/lib/data/cloud/profileCloud";
import { tryImportLocalToCloud } from "@/lib/data/importLocalToCloud";
import { useKanban } from "@/stores/kanbanStore";
import { useStats } from "@/stores/statsStore";
import { useCalendar } from "@/stores/calendarStore";
import { useNotes } from "@/stores/notesStore";
import { useFlashcards } from "@/stores/flashcardsStore";
import { useSidebar } from "@/stores/sidebarStore";
import { getDailyGoal } from "@/lib/stats";
import { resetClientStoresForAuthChange } from "@/lib/data/resetSessionStores";
import { signOutAction } from "@/lib/actions/auth";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applyPreferencesToStores() {
  const prefs = getPreferencesCache();
  if (prefs?.sidebar_order?.length) {
    useSidebar.getState().hydrateFromCloud(prefs.sidebar_order);
  }
  if (typeof prefs?.daily_goal === "number") {
    patchPreferencesCache({ daily_goal: prefs.daily_goal });
    useStats.setState({ dailyGoal: getDailyGoal() });
  }
}

async function bootstrapSession(userId: string) {
  resetClientStoresForAuthChange();
  // Do not set domain `isLoading` here: profile fetch + local→cloud import can take a long
  // time (or stall on network). Each store sets loading when its own fetch starts; otherwise
  // every tab shows a spinner for work that is not yet hitting the board/notes/etc. APIs.
  const supabase = createBrowserSupabase();
  const first = await fetchProfilePreferences(supabase).catch(() => null);
  if (first) applyPreferencesToStores();
  const prefsDirty = await tryImportLocalToCloud(supabase, userId, {
    prefetchedRawPreferences: first?.rawPreferences,
  }).catch(() => false);
  if (prefsDirty) {
    await fetchProfilePreferences(supabase).catch(() => {});
    applyPreferencesToStores();
  }
  await Promise.all([
    useKanban.getState().loadBoard(),
    useStats.getState().loadSessions(),
    useCalendar.getState().loadEvents(),
    useNotes.getState().loadNotes(),
    useFlashcards.getState().loadDecks(),
  ]);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(async () => {
    await signOutAction().catch(() => {});
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    resetPreferencesCache();
    resetClientStoresForAuthChange();
    setAuthSessionState(null);
    setUser(null);
    useSidebar.getState().loadItems();
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let cancelled = false;

    void (async () => {
      const {
        data: { user: initial },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!initial) {
        setAuthSessionState(null);
        setUser(null);
        setReady(true);
        return;
      }
      setAuthSessionState(initial.id);
      setUser(initial);
      setReady(true);
      await bootstrapSession(initial.id).catch(() => {});
      if (cancelled) return;
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        resetPreferencesCache();
        resetClientStoresForAuthChange();
        setAuthSessionState(null);
        setUser(null);
        useSidebar.getState().loadItems();
        setReady(true);
        return;
      }
      if (event === "SIGNED_IN" && session?.user) {
        setAuthSessionState(session.user.id);
        setUser(session.user);
        setReady(true);
        await bootstrapSession(session.user.id).catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      signOut,
    }),
    [user, ready, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within SessionProvider");
  }
  return ctx;
}
