import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { CurriculumTreeEditor } from "@/components/instructor/curriculum/CurriculumTreeEditor";
import { CourseWorkspaceHeader } from "@/components/instructor/course-workspace/CourseWorkspaceHeader";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import { CurriculumService } from "@/learning/services/curriculum.service";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";

/**
 * `/instructor/courses/[id]/curriculum` — the Curriculum Builder (Phase
 * 6, Step 6.4). `CourseService.getOwnById` gates access the same way
 * `/instructor/courses/[id]/edit` (Step 6.3) does — `null` for a course
 * that doesn't exist *and* for one that exists but isn't the caller's
 * own, indistinguishably. Unlike the Edit Course page, this page is
 * still reachable for a non-`draft` course — an Instructor can review
 * the curriculum they built even after submitting it for review; the
 * tree itself just renders read-only (`editable={course.status ===
 * "draft"}`), matching what `ModuleService`/`LessonService`'s
 * `*Own` methods enforce server-side regardless.
 */
export default async function InstructorCourseCurriculumPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const course = await CourseService.getOwnById(user, id);
  if (!course) {
    const tEmpty = await getTranslations("Admin.emptyState");
    return <EmptyState title={tEmpty("defaultTitle")} description={tEmpty("defaultDescription")} />;
  }

  const [t, tWorkspace, modules] = await Promise.all([
    getTranslations("Instructor.curriculum"),
    getTranslations("Instructor.workspace"),
    CurriculumService.getForInstructor(user, id),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={t("description")} />
      <CourseWorkspaceHeader
        courseId={course.id}
        courseTitle={resolveLocalizedText(course.title, locale as Locale)}
        tabLabel={tWorkspace("curriculum")}
      />
      {course.status !== "draft" && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t("readOnlyNotice")}</p>
      )}
      <CurriculumTreeEditor courseId={course.id} initialModules={modules} editable={course.status === "draft"} />
    </div>
  );
}
