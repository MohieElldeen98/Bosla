import { ArticleRepository } from "@/blog/repositories/article.repository";

/**
 * Derives a URL slug from an article title — Latin letters are lowercased,
 * Arabic letters are kept as-is (an Arabic-titled article gets a real
 * Arabic slug, the SEO-correct form for Arabic content), diacritics/
 * tatweel are stripped, and everything else collapses to hyphens. A title
 * that yields nothing sluggable falls back to a short unique stamp.
 */
export function slugifyTitle(title: string): string {
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
  return slug || `article-${Date.now().toString(36)}`;
}

/**
 * The collision-proof slug for a new article — authors never see or set
 * slugs (two authors titling an article identically must still get two
 * distinct URLs), so this appends `-2`, `-3`, … until free, with a
 * time-stamp fallback against pathological contention. Create-time only:
 * a published article's slug never changes (stable links), even if its
 * title does.
 */
export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugifyTitle(title);
  if (!(await ArticleRepository.findBySlug(base))) return base;
  for (let n = 2; n <= 50; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await ArticleRepository.findBySlug(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}
