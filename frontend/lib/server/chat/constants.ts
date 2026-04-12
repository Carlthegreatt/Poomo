export const GENERIC_ERROR =
  "I'm temporarily unavailable. Please try again shortly.";
export const MAX_BODY_BYTES = 128_000;

export const DAILY_MAX = 35;
export const BURST_WINDOW_MS = 10_000;
export const BURST_MAX = 3;
export const RATE_LIMIT_RETRY_AFTER_SEC = 60;

/** First model wins; rest are fallbacks on 429/503. */
export const MODELS = [
  "gemini-3.1-flash-lite-preview",
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
] as const;
