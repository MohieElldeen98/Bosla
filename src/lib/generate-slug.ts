/**
 * Derives a URL slug from a title — Latin letters are lowercased, Arabic
 * letters are kept as-is (Arabic-titled content gets a real Arabic slug,
 * the SEO-correct form for Arabic content), diacritics/tatweel are
 * stripped, and everything else collapses to hyphens. A title that yields
 * nothing sluggable falls back to a short unique stamp. Extracted from
 * `blog/utils/generate-slug.ts` so the course domain can slugify titles
 * without importing the blog's repository-coupled module.
 */
export function slugifyTitle(title: string, fallbackPrefix = "article"): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKC")
    // Arabic harakat + tatweel — presentation marks, not letters.
    .replace(/[ً-ْـ]/g, "")
    // Keep Latin letters, digits, and Arabic letters; hyphenate the rest.
    .replace(/[^a-z0-9ء-ي]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || `${fallbackPrefix}-${Date.now().toString(36)}`;
}
