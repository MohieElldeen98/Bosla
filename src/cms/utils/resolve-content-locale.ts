import type { Locale } from "@/i18n/routing";

/**
 * Recursively flattens every `{en, ar}` leaf in a validated content object
 * to the active locale's string — content shapes vary per section type
 * (and, since Step 6.5, per published-version snapshot), so this walks the
 * object generically rather than needing one resolver per type/shape. A
 * leaf is recognized as localized text when it's a plain object whose keys
 * are exactly the supported locales.
 *
 * Shared by `CmsSectionService` (resolving the live/draft `cms_sections`
 * rows) and `CmsPageVersionService` (resolving a published snapshot's
 * `sections`/`seo`, which are stored in the exact same raw/bilingual
 * shape) — one resolver, not two copies that could drift.
 */
export function resolveContentLocale(
  content: unknown,
  locale: Locale,
  locales: readonly string[],
): unknown {
  if (Array.isArray(content)) {
    return content.map((item) => resolveContentLocale(item, locale, locales));
  }
  if (content !== null && typeof content === "object") {
    const keys = Object.keys(content);
    const isLocalizedText =
      keys.length === locales.length && locales.every((loc) => keys.includes(loc));
    if (isLocalizedText) {
      return (content as Record<string, unknown>)[locale];
    }
    return Object.fromEntries(
      Object.entries(content).map(([key, value]) => [key, resolveContentLocale(value, locale, locales)]),
    );
  }
  return content;
}
