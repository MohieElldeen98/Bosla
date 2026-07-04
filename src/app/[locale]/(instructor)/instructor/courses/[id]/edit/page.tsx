import { getTranslations } from "next-intl/server";
import { Clock3, ListTree, PartyPopper } from "lucide-react";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { CourseEditorForm } from "@/components/admin/courses/CourseEditorForm";
import { CourseWorkspaceHeader } from "@/components/instructor/course-workspace/CourseWorkspaceHeader";
import { Link } from "@/i18n/navigation";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import { SpecialtyService } from "@/courses/services/specialty.service";
import { CategoryService } from "@/courses/services/category.service";
import { CourseInstructorService } from "@/courses/services/instructor.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { createOwnCourseAction, updateOwnCourseAction } from "@/courses/actions/course.actions";
import type { Locale } from "@/i18n/routing";
import type { ResolvedInstructor } from "@/courses/types/instructor";

/**
 * `/instructor/courses/[id]/edit` — Edit Course (Phase 6, Step 6.3).
 * `CourseService.getOwnById` returns `null` for a course that doesn't
 * exist *and* for one that exists but isn't the caller's own,
 * indistinguishably — an Instructor probing another Instructor's course
 * id sees the exact same empty state a bad id would, never a "forbidden"
 * that would confirm the id is real. A real own course that isn't
 * `draft` (submitted/published/archived) shows a status message instead
 * of the form — editing is `draft`-only
 * (docs/roles-and-permissions.md §2); `CourseService.updateOwn` enforces
 * this same rule server-side regardless.
 */
export default async function InstructorEditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id, locale } = await params;
  const { created } = await searchParams;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const course = await CourseService.getOwnById(user, id);

  if (!course) {
    const tEmpty = await getTranslations("Admin.emptyState");
    return <EmptyState title={tEmpty("defaultTitle")} description={tEmpty("defaultDescription")} />;
  }

  const t = await getTranslations("Instructor.courseEditor");

  if (course.status !== "draft") {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-12 lg:px-8">
        <PageTitle title={t("editTitle")} description={t("editDescription")} />
        <CourseWorkspaceHeader courseId={course.id} courseTitle={resolveLocalizedText(course.title, locale as Locale)} />
        <EmptyState
          icon={Clock3}
          title={t("notEditableTitle")}
          description={t(`notEditableDescription.${course.status}`)}
        />
      </div>
    );
  }

  const [specialties, categories, resolvedOwnInstructor] = await Promise.all([
    SpecialtyService.listResolved(locale as Locale),
    CategoryService.listResolved(locale as Locale),
    CourseInstructorService.getResolvedById(course.instructorId, locale as Locale),
  ]);
  const instructors: ResolvedInstructor[] = resolvedOwnInstructor ? [resolvedOwnInstructor] : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("editTitle")} description={t("editDescription")} />
      <CourseWorkspaceHeader courseId={course.id} courseTitle={resolveLocalizedText(course.title, locale as Locale)} />
      {created === "1" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-start">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PartyPopper aria-hidden="true" className="size-4.5" />
          </span>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{t("createdNextSteps.title")}</p>
            <p className="text-sm text-muted-foreground">{t("createdNextSteps.description")}</p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-1.5">
                <Link
                  href={`/instructor/courses/${course.id}/curriculum`}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <ListTree aria-hidden="true" className="size-3.5" />
                  {t("createdNextSteps.addCurriculum")}
                </Link>
                <span className="text-muted-foreground">— {t("createdNextSteps.addCurriculumHint")}</span>
              </li>
              <li className="text-muted-foreground">{t("createdNextSteps.submitHint")}</li>
            </ul>
          </div>
        </div>
      )}
      <CourseEditorForm
        mode="edit"
        course={course}
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
