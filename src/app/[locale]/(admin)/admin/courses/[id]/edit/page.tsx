import { getTranslations } from "next-intl/server";
import { ListTree } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { CourseEditorForm } from "@/components/admin/courses/CourseEditorForm";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { CourseService } from "@/courses/services/course.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CategoryService } from "@/courses/services/category.service";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import { CmsSeoService } from "@/cms/services/seo.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";

/**
 * `/admin/courses/[id]/edit` — Edit mode of the Course Editor (Step 3.3).
 * Reads the raw (unresolved, bilingual) course row directly — editing
 * needs every locale's value, not one flattened string, same reasoning
 * `/admin/homepage`'s editor reads raw sections rather than
 * `HomepageService`'s resolved view. A bad/deleted id degrades to an
 * `EmptyState`, not a crash, matching `/admin/homepage`'s own
 * `if (!page)` precedent.
 */
export default async function AdminEditCoursePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;

  const course = await CourseService.getById(id);

  if (!course) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const [t, tWorkspace, specialties, categories, instructors, seo] = await Promise.all([
    getTranslations("Admin.courseEditor"),
    getTranslations("Instructor.workspace"),
    SpecialtyService.listResolved(locale as Locale),
    CategoryService.listResolved(locale as Locale),
    CourseInstructorService.listResolved(locale as Locale),
    course.seoMetaId ? CmsSeoService.getById(course.seoMetaId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <BreadcrumbTrail segments={[{ label: resolveLocalizedText(course.title, locale as Locale) }]} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle title={t("editTitle")} description={t("editDescription")} />
        {/* The course's content (modules, lessons, videos) is authored on
            the site's own curriculum page — one surface everyone with
            authority shares, not a panel-only screen. */}
        <Button variant="outline" nativeButton={false} render={<Link href={`/courses/${course.slug}/curriculum`} />}>
          <ListTree aria-hidden="true" className="size-4" />
          {tWorkspace("curriculum")}
        </Button>
      </div>
      <CourseEditorForm
        mode="edit"
        course={course}
        seo={seo}
        specialties={specialties}
        categories={categories}
        instructors={instructors}
      />
    </div>
  );
}
