import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { CourseEditorForm } from "@/components/admin/courses/CourseEditorForm";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CategoryService } from "@/courses/services/category.service";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import type { Locale } from "@/i18n/routing";

/**
 * `/admin/courses/new` — Create mode of the Course Editor (Step 3.3).
 * Specialty/Category/Instructor options are read through the same
 * services `/admin/courses` already uses (Step 3.2) — no duplicated
 * queries. Permissions are already enforced by `(admin)/layout.tsx` for
 * every `/admin/*` route; `CourseService.create` re-checks server-side
 * regardless.
 */
export default async function AdminNewCoursePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, specialties, categories, instructors] = await Promise.all([
    getTranslations("Admin.courseEditor"),
    SpecialtyService.listResolved(locale as Locale),
    CategoryService.listResolved(locale as Locale),
    CourseInstructorService.listResolved(locale as Locale),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={t("createTitle")} description={t("createDescription")} />
      <CourseEditorForm
        mode="create"
        course={null}
        seo={null}
        specialties={specialties}
        categories={categories}
        instructors={instructors}
      />
    </div>
  );
}
