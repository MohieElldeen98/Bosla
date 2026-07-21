import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { SessionService } from "@/auth/services/session.service";
import { CourseAuthoringHeader } from "@/components/courses/authoring/CourseAuthoringHeader";
import { QuizEditor } from "@/components/instructor/quiz/QuizEditor";
import { CourseService } from "@/courses/services/course.service";
import { LessonService } from "@/learning/services/lesson.service";
import { QuizService } from "@/learning/services/quiz.service";
import { QuizQuestionService } from "@/learning/services/quiz-question.service";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { resolveLessonCourse } from "@/learning/utils/resolve-lesson-course";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";

/** Session-gated, so never statically prerendered. */
export const dynamic = "force-dynamic";

/**
 * `/courses/[slug]/curriculum/quiz/[lessonId]` — the on-site Quiz Editor
 * (public chrome), reached from a `"quiz"` lesson row in the curriculum
 * builder. Same access as the curriculum page (`requireOwnCourseAccess`),
 * plus `resolveLessonCourse` confirms this lesson actually belongs to this
 * course so a lesson id from another course can't be smuggled in.
 */
export default async function CourseLessonQuizPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string; locale: string }>;
}) {
  const { slug, lessonId, locale } = await params;
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

  const lesson = await LessonService.getById(lessonId);
  if (!lesson || lesson.type !== "quiz") notFound();

  const owner = await resolveLessonCourse(lessonId);
  if (!owner || owner.courseId !== course.id) notFound();

  const quiz = await QuizService.getByLessonId(lessonId);
  if (!quiz) notFound();

  const questions = await QuizQuestionService.listByQuizId(quiz.id);

  return (
    <div>
      <CourseAuthoringHeader
        slug={slug}
        courseTitle={resolveLocalizedText(course.title, locale as Locale)}
        locale={locale}
      />
      <div className="mx-auto max-w-4xl px-6 py-10 lg:px-8">
        <QuizEditor
          editable={editable}
          lesson={lesson}
          quiz={quiz}
          initialQuestions={questions}
          curriculumHref={`/courses/${slug}/curriculum`}
        />
      </div>
    </div>
  );
}
