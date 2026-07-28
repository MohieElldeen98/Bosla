import { getTranslations } from "next-intl/server";
import { ArticleService } from "@/blog/services/article.service";
import { ArticleCard } from "@/components/blog/ArticleCard";
import type { Locale } from "@/i18n/routing";

/**
 * The article page's "related articles" section — split out from the
 * page body and rendered inside a `<Suspense>` boundary (Performance
 * Sprint 1) so this non-critical, below-the-fold query never blocks the
 * article's primary content (title, cover, body) from streaming to the
 * browser first. `getBySlug` here shares its underlying row fetch with
 * `ArticleSeriesNav`'s own `getBySlug` call via `ArticleRepository
 * .findBySlug`'s request-scoped `cache()` — no duplicate query even
 * though both components ask for it independently.
 */
export async function RelatedArticles({ slug, locale }: { slug: string; locale: Locale }) {
  const rawArticle = await ArticleService.getBySlug(slug);
  if (!rawArticle) return null;

  const [t, tCard, related] = await Promise.all([
    getTranslations({ locale, namespace: "Blog.article" }),
    getTranslations({ locale, namespace: "Blog.card" }),
    ArticleService.listRelated(rawArticle, locale, 3),
  ]);

  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-articles" className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <h2 id="related-articles" className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t("relatedArticles")}
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <ArticleCard key={item.id} article={item} t={tCard} teamAuthorLabel={t("teamAuthor")} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Matches `RelatedArticles`' own band/grid so the `<Suspense>` fallback
 *  holds a similar footprint while the query resolves — most articles
 *  do have a category match, so this isn't a rare state. */
export function RelatedArticlesSkeleton() {
  return (
    <section aria-hidden="true" className="border-t border-border bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-3 overflow-hidden rounded-xl bg-card p-1 ring-1 ring-foreground/5">
              <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
