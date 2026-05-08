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
import {
  setAuthHydrationInFlight,
  getAuthUserId,
  setAuthSessionState,
} from "@/lib/data/authSession";
import {
  resetPreferencesCache,
  getPreferencesCache,
  patchPreferencesCache,
} from "@/lib/data/preferencesCache";
import { fetchProfilePreferences } from "@/lib/data/cloud/profileCloud";
import { useKanban } from "@/stores/kanbanStore";
import { useStats } from "@/stores/statsStore";
import { useCalendar } from "@/stores/calendarStore";
import { useNotes } from "@/stores/notesStore";
import { useFlashcards } from "@/stores/flashcardsStore";
import { useSidebar } from "@/stores/sidebarStore";
import { getDailyGoal } from "@/lib/data/statsRepo";
import { resetClientStoresForAuthChange } from "@/lib/data/resetSessionStores";
import { signOutAction } from "@/lib/actions/auth";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Tracks which userId's bootstrap is in-flight or completed to prevent double-bootstrap. */
let bootstrapInFlight: Promise<void> | null = null;
let bootstrapCalledForUserId: string | null = null;

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

/**
 * Boots all domain stores for the current user.
 * Profile preferences are fetched concurrently with store loads so neither
 * blocks the other — data appears as soon as the fastest call resolves.
 */
async function bootstrapSession() {
  resetClientStoresForAuthChange();
  const supabase = createBrowserSupabase();

  // Kick off profile fetch and all store loads simultaneously.
  const profileFetch = fetchProfilePreferences(supabase)
    .then(applyPreferencesToStores)
    .catch(() => {
      /* best-effort: preferences are non-critical */
    });

  const storeLoads = Promise.all([
    useKanban.getState().loadBoard(),
    useStats.getState().loadSessions(),
    useCalendar.getState().loadEvents(),
    useNotes.getState().loadNotes(),
    useFlashcards.getState().loadDecks(),
  ]);

  await Promise.all([profileFetch, storeLoads]);
}

/**
 * Ensures only one bootstrap runs per userId.
 * If the same user triggers two SIGNED_IN events (e.g. token refresh),
 * the second call is coalesced into the in-flight promise.
 * If a different user logs in, resets state and starts fresh.
 */
function bootstrapSessionOnce(userId: string): Promise<void> {
  // Already bootstrapping for this user — coalesce.
  if (bootstrapCalledForUserId === userId && bootstrapInFlight) {
    return bootstrapInFlight;
  }

  // Different user or stale state — start fresh.
  bootstrapCalledForUserId = userId;
  bootstrapInFlight = null;

  const run = bootstrapSession();
  bootstrapInFlight = run;

  void run.finally(() => {
    if (bootstrapInFlight === run) {
      bootstrapInFlight = null;
    }
  });

  return run;
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
    bootstrapInFlight = null;
    bootstrapCalledForUserId = null;
    setAuthHydrationInFlight(null);
    setAuthSessionState(null);
    setUser(null);
    useSidebar.getState().loadItems();
  }, []);

  const refreshSession = useCallback(async () => {
    const supabase = createBrowserSupabase();

    const hydration = (async () => {
      const {
        data: { session: nextSession },
      } = await supabase.auth.getSession();
      const nextUser = nextSession?.user ?? null;

      if (!nextUser) {
        bootstrapInFlight = null;
        bootstrapCalledForUserId = null;
        setAuthSessionState(null);
        setUser(null);
        setReady(true);
        return;
      }

      setAuthSessionState(nextUser.id);
      setUser(nextUser);
      setReady(true);
    })();

    setAuthHydrationInFlight(hydration);

    try {
      await hydration;
    } finally {
      setAuthHydrationInFlight(null);
    }

    const uid = getAuthUserId();
    if (uid) {
      await bootstrapSessionOnce(uid).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    let cancelled = false;

    /**
     * Initial hydration: verify the session with getUser() to guard against
     * tampered local session data, then bootstrap once if authenticated.
     *
     * We intentionally do NOT call bootstrapSessionOnce from the SIGNED_IN
     * handler while this hydration is still in-flight — the hydration chain
     * below already handles the bootstrap. This prevents the double-reset bug
     * where SIGNED_IN fires before getUser() resolves.
     */
    let initialHydrationDone = false;

    const authHydration = (async () => {
      // Fast local check first — skip network getUser if no session exists.
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();
      if (!initialSession?.user) {
        bootstrapInFlight = null;
        bootstrapCalledForUserId = null;
        setAuthHydrationInFlight(null);
        setAuthSessionState(null);
        setUser(null);
        setReady(true);
        initialHydrationDone = true;
        return;
      }

      // Verify with server to ensure session is legitimate.
      const {
        data: { user: initial },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!initial) {
        bootstrapInFlight = null;
        bootstrapCalledForUserId = null;
        setAuthHydrationInFlight(null);
        setAuthSessionState(null);
        setUser(null);
        setReady(true);
        initialHydrationDone = true;
        return;
      }

      setAuthSessionState(initial.id);
      setUser(initial);
      setReady(true);
      initialHydrationDone = true;
    })();

    setAuthHydrationInFlight(authHydration);

    void authHydration.finally(() => {
      if (!cancelled) {
        setAuthHydrationInFlight(null);
      }
    });

    // Bootstrap domain stores after initial hydration confirms the user.
    void (async () => {
      await authHydration.catch(() => {});
      if (cancelled) return;
      const uid = getAuthUserId();
      if (uid) {
        await bootstrapSessionOnce(uid).catch(() => {});
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        resetPreferencesCache();
        resetClientStoresForAuthChange();
        bootstrapInFlight = null;
        bootstrapCalledForUserId = null;
        setAuthHydrationInFlight(null);
        setAuthSessionState(null);
        setUser(null);
        useSidebar.getState().loadItems();
        setReady(true);
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        const incomingUid = session.user.id;
        setAuthSessionState(incomingUid);
        setUser(session.user);
        setReady(true);

        // If initial hydration hasn't finished yet, the bootstrap chain in the
        // useEffect async block above will handle it. Avoid a double-bootstrap.
        if (!initialHydrationDone) return;

        await bootstrapSessionOnce(incomingUid).catch(() => {});
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
      refreshSession,
    }),
    [user, ready, signOut, refreshSession],
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
