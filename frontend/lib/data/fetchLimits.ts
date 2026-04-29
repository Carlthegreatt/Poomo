/**
 * Central caps for Supabase reads to avoid timeouts and huge payloads.
 * All queries remain scoped by `user_id` + RLS.
 */

/** Focus sessions: only rows with ended_at >= (now - this many months). Covers heatmap (~26wk) + long streaks. */
export const FOCUS_SESSION_LOOKBACK_MONTHS = 24;

/** Safety cap on focus_sessions rows returned (after time filter). */
export const FOCUS_SESSIONS_MAX_ROWS = 20_000;

/** Max notes loaded in one request (title + full content). */
export const NOTES_FETCH_LIMIT = 5_000;

/**
 * Calendar events: load window around "today" to bound payload size.
 * Past and future months are inclusive from start of month.
 */
export const CALENDAR_PAST_MONTHS = 18;
export const CALENDAR_FUTURE_MONTHS = 24;

/** Max flashcard decks per user per load. */
export const FLASHCARD_DECKS_FETCH_LIMIT = 400;
