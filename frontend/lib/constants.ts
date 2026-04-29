export const ACCENT_COLORS = [
  "#FFC567",
  "#FB7DA8",
  "#FD5A46",
  "#552CB7",
  "#00995E",
  "#058CD7",
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];
