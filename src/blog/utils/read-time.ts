import type { LocalizedText } from "@/types/i18n";

/** Average adult reading speed — the usual "X min read" convention. */
const WORDS_PER_MINUTE = 200;

/**
 * Derives `articles.read_time_minutes` from a body's HTML — strips tags,
 * counts whitespace-separated words, and takes the *longest* locale (the
 * stored value is a single number shown on both locales' cards, so the
 * honest figure is the fuller translation's). Recomputed by
 * `ArticleService` on every body write, never manually set.
 */
export function calculateReadTimeMinutes(body: LocalizedText): number {
  const wordCounts = Object.values(body).map((html) => {
    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&[a-z#0-9]+;/gi, " ")
      .trim();
    return text.length === 0 ? 0 : text.split(/\s+/).length;
  });
  const maxWords = Math.max(0, ...wordCounts);
  return Math.max(1, Math.ceil(maxWords / WORDS_PER_MINUTE));
}
