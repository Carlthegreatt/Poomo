/** Set `POOMO_CHAT_DEBUG=1` in `.env.local` for verbose server logs. */
export function chatDebug(...args: unknown[]) {
  const on =
    process.env.POOMO_CHAT_DEBUG === "1" ||
    process.env.POOMO_CHAT_DEBUG === "true";
  if (on) console.log("[chat:debug]", ...args);
}
