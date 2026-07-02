import type { LocalizedText } from "@/types/i18n";

/** The stored/raw shape — one row per selectable country option. */
export interface Country {
  id: string;
  label: LocalizedText;
}

/** The locale-resolved view model `CountrySelect` renders. */
export interface ResolvedCountry {
  id: string;
  label: string;
}
