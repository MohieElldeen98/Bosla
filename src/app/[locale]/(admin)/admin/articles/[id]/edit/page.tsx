import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { ArticleEditorForm } from "@/components/admin/blog/ArticleEditorForm";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { ArticleService } from "@/blog/services/article.service";
import { ArticleCategoryService } from "@/blog/services/article-category.service";
import { CmsSeoService } from "@/cms/services/seo.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";

/**
 * `/admin/articles/[id]/edit` — Edit mode of the Article Editor. Reads
 * the raw (unresolved, bilingual) article row — editing needs every
 * locale's value, not one flattened string. A bad/deleted id degrades to
 * an `EmptyState`, matching the Course Editor's precedent.
 */
export default async function AdminEditArticlePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;

  const article = await ArticleService.getById(id);

  if (!article) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const [t, categories, seo] = await Promise.all([
    getTranslations("Admin.articleEditor"),
    ArticleCategoryService.listResolved(locale as Locale),
    article.seoMetaId ? CmsSeoService.getById(article.seoMetaId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <BreadcrumbTrail segments={[{ label: resolveLocalizedText(article.title, locale as Locale) }]} />
      <PageTitle title={t("editTitle")} description={t("editDescription")} />
      <ArticleEditorForm mode="edit" article={article} seo={seo} categories={categories} />
    </div>
  );
}
