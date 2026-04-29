/** Standardized result type for server actions across the app. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };
