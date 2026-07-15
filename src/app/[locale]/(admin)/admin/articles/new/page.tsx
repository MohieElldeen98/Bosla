import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { ArticleEditorForm } from "@/components/admin/blog/ArticleEditorForm";
import { ArticleCategoryService } from "@/blog/services/article-category.service";
import { ArticleSeriesService } from "@/blog/services/article-series.service";
import type { Locale } from "@/i18n/routing";

/** `/admin/articles/new` — Create mode of the Article Editor. Permissions
 *  are enforced by `(admin)/layout.tsx`; `ArticleService.create` re-checks
 *  server-side regardless. */
export default async function AdminNewArticlePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, categories, series] = await Promise.all([
    getTranslations("Admin.articleEditor"),
    ArticleCategoryService.listResolved(locale as Locale),
    ArticleSeriesService.listResolved(locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("createTitle")} description={t("createDescription")} />
      <ArticleEditorForm mode="create" article={null} seo={null} categories={categories} series={series} />
    </div>
  );
}
