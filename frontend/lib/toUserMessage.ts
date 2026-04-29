/** Normalizes thrown values (Postgrest, unknown) for UI toasts and store error strings. */
export function toUserMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    const msg = o.message ?? o.error_description ?? o.hint;
    if (typeof msg === "string" && msg.length > 0) return msg;
    const details = o.details;
    if (typeof details === "string" && details.length > 0) return details;
  }
  if (typeof err === "string" && err.length > 0) return err;
  return fallback;
}
