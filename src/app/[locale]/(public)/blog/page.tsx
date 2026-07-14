import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Newspaper } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { BlogSearchForm } from "@/components/blog/BlogSearchForm";
import { ArticleService } from "@/blog/services/article.service";
import { ArticleCategoryService } from "@/blog/services/article-category.service";
import { publicSearchArticlesSchema } from "@/blog/validators/article.validator";
import { getBlogCategoryIcon } from "@/lib/blog-category-icons";
import { cn } from "@/lib/utils";
import { routing, type Locale } from "@/i18n/routing";

/** ISR, same reasoning as `/courses` — plain Drizzle reads, so without
 *  this Next would statically render once at build time and never
 *  re-check the database. Per distinct URL (each search/category/page
 *  combination is its own cache entry). */
export const revalidate = 60;

const PAGE_SIZE = 9;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog.metadata" });

  // Locale-prefixed canonicals cross-linked via `languages`, same as
  // `/courses`'s own `generateMetadata`.
  const canonical = `/${locale}/blog`;
  const languages = Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}/blog`]));

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: { ...languages, "x-default": `/${routing.defaultLocale}/blog` },
    },
    openGraph: { title: t("title"), description: t("description"), url: canonical },
    twitter: { title: t("title"), description: t("description") },
  };
}

/**
 * `/blog` — the public blog listing: header band with search, a "Most
 * popular" rail (pinned + most-viewed, only on the unfiltered first
 * page), the latest-articles grid with link-based pagination, topic
 * chips, and a CTA band reusing the homepage CTA's visual language.
 * Always queries `status: "published", onlyActive: true`, hard-coded —
 * a URL param can never surface a draft (see
 * `publicSearchArticlesSchema`).
 */
export default async function BlogListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = publicSearchArticlesSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    category: firstValue(rawSearchParams.category),
    page: firstValue(rawSearchParams.page),
  });
  const filters = parsed.success ? parsed.data : {};

  const [t, tCard, tArticle, tCta, categories] = await Promise.all([
    getTranslations({ locale, namespace: "Blog.listing" }),
    getTranslations({ locale, namespace: "Blog.card" }),
    getTranslations({ locale, namespace: "Blog.article" }),
    getTranslations({ locale, namespace: "Blog.cta" }),
    ArticleCategoryService.listActiveResolved(locale as Locale),
  ]);

  const activeCategory = filters.category
    ? categories.find((category) => category.slug === filters.category) ?? null
    : null;

  const isFiltered = Boolean(filters.query || activeCategory || (filters.page ?? 1) > 1);

  const [result, popular] = await Promise.all([
    ArticleService.searchResolved(
      {
        query: filters.query,
        categoryId: activeCategory?.id,
        status: "published",
        onlyActive: true,
        sortBy: "publishedAt",
        sortDirection: "desc",
        page: filters.page,
        pageSize: PAGE_SIZE,
      },
      locale as Locale,
    ),
    isFiltered ? Promise.resolve([]) : ArticleService.listPopular(locale as Locale, 3),
  ]);

  const paginationParams = new URLSearchParams();
  if (filters.query) paginationParams.set("q", filters.query);
  if (activeCategory) paginationParams.set("category", activeCategory.slug);
  const paginationQueryString = paginationParams.toString();

  const teamAuthorLabel = tArticle("teamAuthor");

  function categoryHref(slug: string | null): string {
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (slug) params.set("category", slug);
    const query = params.toString();
    return query ? `/blog?${query}` : "/blog";
  }

  return (
    <div>
      {/* Header band — title, article count, search. */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {t("subtitle", { count: result.total })}
          </p>
          <div className="mt-8 max-w-3xl">
            <BlogSearchForm
              initialQuery={filters.query ?? ""}
              category={activeCategory?.slug ?? null}
              placeholder={t("searchPlaceholder")}
              label={t("searchLabel")}
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Most popular — pinned/most-viewed rail, unfiltered view only. */}
        {popular.length > 0 && (
          <section aria-labelledby="blog-popular" className="mb-14">
            <h2 id="blog-popular" className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t("mostPopular")}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {popular.map((article) => (
                <ArticleCard key={article.id} article={article} t={tCard} teamAuthorLabel={teamAuthorLabel} />
              ))}
            </div>
          </section>
        )}

        {/* Latest / results grid. */}
        <section aria-labelledby="blog-latest">
          <h2 id="blog-latest" className="text-xl font-semibold tracking-tight sm:text-2xl">
            {filters.query
              ? t("resultsFor", { query: filters.query })
              : activeCategory
                ? activeCategory.name
                : t("latestArticles")}
          </h2>

          {result.items.length === 0 ? (
            <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-20 text-center">
              <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Newspaper aria-hidden="true" className="size-6" />
              </span>
              <p className="text-base font-semibold text-foreground">{t("emptyTitle")}</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("emptyDescription")}</p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((article) => (
                <ArticleCard key={article.id} article={article} t={tCard} teamAuthorLabel={teamAuthorLabel} />
              ))}
            </div>
          )}

          <BlogPagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
            queryString={paginationQueryString}
            summaryLabel={(range) => t("pagination.summary", range)}
            previousLabel={t("pagination.previous")}
            nextLabel={t("pagination.next")}
          />
        </section>

        {/* Explore topics — the blog taxonomy as icon chips. */}
        {categories.length > 0 && (
          <section aria-labelledby="blog-topics" className="mt-16">
            <h2 id="blog-topics" className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t("exploreTopics")}
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={categoryHref(null)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                  !activeCategory
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-foreground hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                {t("allTopics")}
              </Link>
              {categories.map((category) => {
                const Icon = getBlogCategoryIcon(category.icon);
                const isActive = activeCategory?.id === category.id;
                return (
                  <Link
                    key={category.id}
                    href={categoryHref(category.slug)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-foreground hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 text-primary" />
                    {category.name}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* CTA band — the homepage CTA's visual language; Bosla's footer
          already owns the newsletter form, so this promotes courses
          instead of duplicating a second email capture. */}
      <section className="relative overflow-hidden bg-neutral-950 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="bg-dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_50%,black,transparent)]" />
          <div className="absolute top-1/2 left-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center lg:px-8">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{tCta("title")}</h2>
          <p className="mt-4 text-balance text-white/60">{tCta("subtitle")}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-6 text-base" nativeButton={false} render={<Link href="/courses" />}>
              {tCta("primaryButton")}
              <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 border-white/15 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
              nativeButton={false}
              render={<Link href="/sign-up" />}
            >
              {tCta("secondaryButton")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
