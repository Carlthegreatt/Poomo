/** Mutable auth snapshot for data repos (avoids async session read on every CRUD). */

let userId: string | null = null;
let hydrationInFlight: Promise<void> | null = null;

export function setAuthSessionState(id: string | null) {
  userId = id;
}

export function getAuthUserId(): string | null {
  return userId;
}

export function setAuthHydrationInFlight(
  promise: Promise<void> | null,
): void {
  hydrationInFlight = promise;
}

export async function waitForAuthHydration(): Promise<void> {
  if (hydrationInFlight) await hydrationInFlight;
}

export function isCloudDataBackend(): boolean {
  return userId != null;
}
