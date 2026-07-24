import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { CategoriesManager } from "@/components/admin/categories/CategoriesManager";
import { CategoryService } from "@/courses/services/category.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import type { Locale } from "@/i18n/routing";

/**
 * `/admin/categories` — the course catalog's own taxonomy CRUD (drives
 * `/courses`'s category filter). Deliberately separate from
 * `/admin/articles/categories` (blog taxonomy) — see
 * `db/schema/course.ts`'s `categories` doc comment.
 */
export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, categories, specialties] = await Promise.all([
    getTranslations("Admin.categories"),
    CategoryService.list(),
    SpecialtyService.listResolved(locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("title")} description={t("description")} />
      <CategoriesManager
        categories={categories}
        specialties={specialties.map((specialty) => ({ value: specialty.id, label: specialty.name }))}
      />
    </div>
  );
}
