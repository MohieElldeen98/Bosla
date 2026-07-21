import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { SessionService } from "@/auth/services/session.service";
import { CourseAuthoringHeader } from "@/components/courses/authoring/CourseAuthoringHeader";
import { CurriculumTreeEditor } from "@/components/instructor/curriculum/CurriculumTreeEditor";
import { CourseService } from "@/courses/services/course.service";
import { CurriculumService } from "@/learning/services/curriculum.service";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";

/** Session-gated, so never statically prerendered. */
export const dynamic = "force-dynamic";

/**
 * `/courses/[slug]/curriculum` — the on-site Curriculum Builder (public
 * chrome). This is where a course's videos live: modules, lessons (video/
 * reading/quiz), and their media. One surface everyone with authority
 * shares — the course's own instructor (draft-editable) or any manager
 * (any status). `requireOwnCourseAccess` gates it; the tree renders
 * read-only when the caller may view but not edit.
 */
export default async function CourseCurriculumPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) {
    redirect({ href: "/sign-in", locale });
  }

  const bySlug = await CourseService.getBySlug(slug);
  if (!bySlug) notFound();

  const access = await requireOwnCourseAccess(user!, bySlug.id);
  if (!access.ok) {
    redirect({ href: `/courses/${slug}`, locale });
    return null;
  }
  const course = access.course;
  const isManager = isRoleAllowed(user!.role, ["admin", "super_admin"]);
  const editable = isManager || course.status === "draft";

  const [t, modules] = await Promise.all([
    getTranslations({ locale, namespace: "Instructor.curriculum" }),
    CurriculumService.getForInstructor(user!, course.id),
  ]);

  return (
    <div>
      <CourseAuthoringHeader
        slug={slug}
        courseTitle={resolveLocalizedText(course.title, locale as Locale)}
        locale={locale}
      />
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-10 lg:px-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {!editable && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t("readOnlyNotice")}</p>
        )}
        <CurriculumTreeEditor
          courseId={course.id}
          initialModules={modules}
          editable={editable}
          quizHrefBase={`/courses/${slug}/curriculum/quiz`}
        />
      </div>
    </div>
  );
}
