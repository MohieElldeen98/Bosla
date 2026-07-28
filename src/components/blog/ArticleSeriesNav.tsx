import { ArticleService } from "@/blog/services/article.service";
import { SeriesNavigation } from "@/components/blog/SeriesNavigation";

/**
 * The article page's series prev/next nav — split out and rendered
 * inside a `<Suspense>` boundary (Performance Sprint 1) so this
 * non-critical query never blocks the article's primary content from
 * streaming first. `SeriesNavigation` itself already renders `null` for
 * the common case (an article with no series), so a `null` Suspense
 * fallback matches that same steady state — no skeleton needed.
 */
export async function ArticleSeriesNav({ slug }: { slug: string }) {
  const rawArticle = await ArticleService.getBySlug(slug);
  if (!rawArticle) return null;

  const neighbors = await ArticleService.getSeriesNeighbors(rawArticle);
  return <SeriesNavigation language={rawArticle.language} {...neighbors} />;
}
