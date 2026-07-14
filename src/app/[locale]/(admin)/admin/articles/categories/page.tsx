import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { ArticleCategoriesManager } from "@/components/admin/blog/ArticleCategoriesManager";
import { ArticleCategoryService } from "@/blog/services/article-category.service";

/**
 * `/admin/articles/categories` — the blog's own taxonomy CRUD (topic
 * chips on the public `/blog` page). Deliberately separate from
 * `/admin/categories` (course catalog taxonomy) — see
 * `db/schema/articles.ts`'s `article_categories` doc comment.
 */
export default async function AdminArticleCategoriesPage() {
  const [t, categories] = await Promise.all([
    getTranslations("Admin.articleCategories"),
    ArticleCategoryService.list(),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} description={t("description")} />
      <ArticleCategoriesManager categories={categories} />
    </div>
  );
}
