/** Mutable auth snapshot for data repos (avoids async session read on every CRUD). */

let userId: string | null = null;

export function setAuthSessionState(id: string | null) {
  userId = id;
}

export function getAuthUserId(): string | null {
  return userId;
}

export function isCloudDataBackend(): boolean {
  return userId != null;
}
