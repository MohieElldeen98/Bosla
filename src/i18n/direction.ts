import type { Locale } from "./routing";

const rtlLocales = new Set<Locale>(["ar"]);

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}
