import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { CourseEditorForm } from "@/components/admin/courses/CourseEditorForm";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CategoryService } from "@/courses/services/category.service";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import { createOwnCourseAction, updateOwnCourseAction } from "@/courses/actions/course.actions";
import type { Locale } from "@/i18n/routing";
import type { ResolvedInstructor } from "@/courses/types/instructor";

/**
 * `/instructor/courses/new` — Create Course (Phase 6, Step 6.3). The
 * exact same `CourseEditorForm` the Admin Course Editor uses (Step 3.3),
 * not a parallel form — `createAction`/`updateAction` are swapped for
 * `createOwnCourseAction`/`updateOwnCourseAction` (which force
 * `instructorId`/initial `status` server-side, never trusting the
 * client), and the Instructor/Status pickers + SEO section are hidden,
 * since an Instructor never sets any of those directly.
 * `CourseService.getOwnInstructor` resolves (creating on first use) the
 * caller's own `instructors` row so the form always has a valid,
 * pre-populated (if hidden) `instructorId` to submit.
 */
export default async function InstructorNewCoursePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const [t, specialties, categories, ownInstructor] = await Promise.all([
    getTranslations("Instructor.courseEditor"),
    SpecialtyService.listResolved(locale as Locale),
    CategoryService.listResolved(locale as Locale),
    CourseService.getOwnInstructor(user),
  ]);

  if (!ownInstructor) {
    const tEmpty = await getTranslations("Admin.emptyState");
    return <EmptyState title={tEmpty("defaultTitle")} description={tEmpty("defaultDescription")} />;
  }

  const resolvedOwnInstructor = await CourseInstructorService.getResolvedById(ownInstructor.id, locale as Locale);
  const instructors: ResolvedInstructor[] = resolvedOwnInstructor ? [resolvedOwnInstructor] : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("createTitle")} description={t("createDescription")} />
      <CourseEditorForm
        mode="create"
        course={null}
        seo={null}
        specialties={specialties}
        categories={categories}
        instructors={instructors}
        createAction={createOwnCourseAction}
        updateAction={updateOwnCourseAction}
        listHref="/instructor/courses"
        showInstructorField={false}
        showStatusField={false}
        showSeoSection={false}
      />
    </div>
  );
}
