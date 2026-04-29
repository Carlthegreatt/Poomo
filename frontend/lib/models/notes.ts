import { ACCENT_COLORS } from "@/lib/constants";

export { ACCENT_COLORS as NOTE_COLORS };

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}
