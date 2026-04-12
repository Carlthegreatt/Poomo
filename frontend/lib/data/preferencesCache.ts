/** Matches persisted sidebar shape (see sidebarStore). */
export type SidebarOrderItem = { id: string; pinned: boolean };

export type ProfilePreferences = {
  daily_goal?: number;
  sidebar_order?: SidebarOrderItem[];
  imported_local?: boolean;
};

let cached: ProfilePreferences | null = null;

export function resetPreferencesCache() {
  cached = null;
}

export function setPreferencesCache(next: ProfilePreferences | null) {
  cached = next ? { ...next } : null;
}

export function getPreferencesCache(): ProfilePreferences | null {
  return cached ? { ...cached } : null;
}

export function patchPreferencesCache(partial: ProfilePreferences) {
  cached = { ...cached, ...partial };
}
