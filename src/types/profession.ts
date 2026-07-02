import type { LocalizedText } from "@/types/i18n";

/** The stored/raw shape — one row per selectable profession option. */
export interface Profession {
  id: string;
  label: LocalizedText;
}

/** The locale-resolved view model `ProfessionSelect` renders. */
export interface ResolvedProfession {
  id: string;
  label: string;
}
