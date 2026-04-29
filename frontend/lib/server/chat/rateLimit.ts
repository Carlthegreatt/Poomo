import {
  BURST_MAX,
  BURST_WINDOW_MS,
  DAILY_MAX,
} from "@/lib/server/chat/constants";

/**
 * In-memory rate limiter.
 *
 * Limitation: state is per-process, so in a multi-instance deployment
 * (e.g. Vercel serverless) limits are not shared across instances.
 * For production, consider Redis/Upstash-based rate limiting.
 */

const dailyLog = new Map<string, { date: string; count: number }>();
const burstLog = new Map<string, number[]>();

/** Prune entries from Maps that are no longer relevant to bound memory. */
let lastPruneAt = 0;
const PRUNE_INTERVAL_MS = 60_000; // 1 minute

function pruneStaleEntries(): void {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;

  const today = new Date().toISOString().split("T")[0];

  // Remove daily entries from previous days
  for (const [ip, entry] of dailyLog) {
    if (entry.date !== today) {
      dailyLog.delete(ip);
    }
  }

  // Remove burst entries that are fully expired
  for (const [ip, timestamps] of burstLog) {
    const recent = timestamps.filter((t) => now - t < BURST_WINDOW_MS);
    if (recent.length === 0) {
      burstLog.delete(ip);
    } else {
      burstLog.set(ip, recent);
    }
  }
}

export function isRateLimited(ip: string): boolean {
  pruneStaleEntries();

  const now = Date.now();
  const today = new Date().toISOString().split("T")[0];

  const daily = dailyLog.get(ip);
  if (daily && daily.date === today && daily.count >= DAILY_MAX) {
    return true;
  }

  const timestamps = burstLog.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < BURST_WINDOW_MS);
  if (recent.length >= BURST_MAX) {
    burstLog.set(ip, recent);
    return true;
  }

  if (daily && daily.date === today) {
    daily.count++;
  } else {
    dailyLog.set(ip, { date: today, count: 1 });
  }
  recent.push(now);
  burstLog.set(ip, recent);

  return false;
}
