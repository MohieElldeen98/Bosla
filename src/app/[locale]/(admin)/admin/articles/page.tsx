import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { ArticlesManager } from "@/components/admin/blog/ArticlesManager";
import { ArticleService } from "@/blog/services/article.service";
import { ArticleCategoryService } from "@/blog/services/article-category.service";
import { searchArticlesSchema } from "@/blog/validators/article.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `/admin/articles` — Blog management (the "publish an article" half of
 * docs/roadmap.md's Phase 7 exit criteria). Mirrors `/admin/courses`'s
 * exact shape: URL-search-param-driven server-side pagination/search/
 * filter/sort through `ArticleService.searchResolved`; role-gating is
 * handled by `(admin)/layout.tsx` for every `/admin/*` route.
 */
export default async function AdminArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;

  const parsed = searchArticlesSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    status: firstValue(rawSearchParams.status),
    categoryId: firstValue(rawSearchParams.categoryId),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result, categories] = await Promise.all([
    getTranslations("Admin.nav.articles"),
    ArticleService.searchResolved(filters, locale as Locale),
    ArticleCategoryService.listResolved(locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <ArticlesManager result={result} filters={filters} categories={categories} />
    </div>
  );
}
