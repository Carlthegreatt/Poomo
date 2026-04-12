import {
  BURST_MAX,
  BURST_WINDOW_MS,
  DAILY_MAX,
} from "@/lib/server/chat/constants";

const dailyLog = new Map<string, { date: string; count: number }>();
const burstLog = new Map<string, number[]>();

export function isRateLimited(ip: string): boolean {
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
