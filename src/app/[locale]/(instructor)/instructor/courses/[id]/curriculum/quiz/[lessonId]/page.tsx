import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/admin/EmptyState";
import { QuizEditor } from "@/components/instructor/quiz/QuizEditor";
import { CourseWorkspaceNav } from "@/components/instructor/course-workspace/CourseWorkspaceNav";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { SessionService } from "@/auth/services/session.service";
import { CourseService } from "@/courses/services/course.service";
import { LessonService } from "@/learning/services/lesson.service";
import { QuizService } from "@/learning/services/quiz.service";
import { QuizQuestionService } from "@/learning/services/quiz-question.service";
import { resolveLessonCourse } from "@/learning/utils/resolve-lesson-course";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";

/**
 * `/instructor/courses/[id]/curriculum/quiz/[lessonId]` — the Quiz
 * Editor (Phase 6, Step 6.5), reached from a `"quiz"`-typed lesson row
 * in the Curriculum Builder (Step 6.4). Same access shape as the
 * Curriculum page: `CourseService.getOwnById` gates the course, and the
 * page stays reachable (read-only) once the course is no longer
 * `draft` — only `QuizService`/`QuizQuestionService`'s `*Own` mutation
 * methods enforce the `draft`-only rule server-side.
 *
 * `resolveLessonCourse` additionally confirms this specific lesson
 * actually belongs to `course.id` — without it, an Instructor could
 * pass any other lesson's id in the URL and, since `getOwnById` only
 * checks the *course* in the URL, potentially read another course's
 * quiz content. Every "not this Instructor's" / "doesn't exist" /
 * "wrong course" case collapses to the same generic `EmptyState`, same
 * "don't reveal which reason" pattern `requireOwnCourseAccess` uses.
 */
export default async function InstructorLessonQuizPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string; locale: string }>;
}) {
  const { id, lessonId, locale } = await params;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const tEmpty = await getTranslations("Admin.emptyState");
  const notFound = <EmptyState title={tEmpty("defaultTitle")} description={tEmpty("defaultDescription")} />;

  const course = await CourseService.getOwnById(user, id);
  if (!course) return notFound;

  const lesson = await LessonService.getById(lessonId);
  if (!lesson || lesson.type !== "quiz") return notFound;

  const owner = await resolveLessonCourse(lessonId);
  if (!owner || owner.courseId !== course.id) return notFound;

  const quiz = await QuizService.getByLessonId(lessonId);
  if (!quiz) return notFound;

  const [questions, tWorkspace] = await Promise.all([
    QuizQuestionService.listByQuizId(quiz.id),
    getTranslations("Instructor.workspace"),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12 lg:px-8">
      <BreadcrumbTrail
        segments={[
          { label: resolveLocalizedText(course.title, locale as Locale), href: `/instructor/courses/${course.id}/edit` },
          { label: tWorkspace("curriculum"), href: `/instructor/courses/${course.id}/curriculum` },
          { label: resolveLocalizedText(lesson.title, locale as Locale) },
        ]}
      />
      <CourseWorkspaceNav courseId={course.id} />
      <QuizEditor
        courseId={course.id}
        editable={course.status === "draft"}
        lesson={lesson}
        quiz={quiz}
        initialQuestions={questions}
      />
    </div>
  );
}
