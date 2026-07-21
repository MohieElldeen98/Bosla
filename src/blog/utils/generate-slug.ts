import { ArticleRepository } from "@/blog/repositories/article.repository";
import { slugifyTitle } from "@/lib/generate-slug";

/** The slugify rule itself now lives in `lib/generate-slug.ts` (shared
 *  with the course domain); re-exported so existing imports keep working. */
export { slugifyTitle };

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
