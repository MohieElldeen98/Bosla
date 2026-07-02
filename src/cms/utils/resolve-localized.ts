import type { Locale } from "@/i18n/routing";
import type { LocalizedText } from "@/types/i18n";

/** Shared by every CMS service that flattens a `LocalizedText` field to the
 *  active locale's string — the same job `HomepageService`'s local
 *  `resolveText` helper does today, extracted once so six services don't
 *  each redefine it. */
export function resolveLocalizedText(value: LocalizedText, locale: Locale): string;
export function resolveLocalizedText(
  value: LocalizedText | null | undefined,
  locale: Locale,
): string | null;
export function resolveLocalizedText(
  value: LocalizedText | null | undefined,
  locale: Locale,
): string | null {
  return value ? value[locale] : null;
}
