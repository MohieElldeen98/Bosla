import { LessonRepository } from "@/learning/repositories/lesson.repository";
import { ModuleRepository } from "@/learning/repositories/module.repository";
import { QuizRepository } from "@/learning/repositories/quiz.repository";
import { QuizQuestionRepository } from "@/learning/repositories/quiz-question.repository";

/** Resolves a lesson's owning course by walking `lesson -> module ->
 *  course` — the same "compose via extra reads, no cross-domain SQL
 *  join" pattern used throughout this codebase. Returns `null` if either
 *  hop is missing (shouldn't happen under normal FK integrity, but a
 *  degraded no-op is safer than a crash for callers like audit logging).
 *  Shared by `QuizService` (audit-log anchoring) and `QuizAttemptService`
 *  (enrollment check on submit) — extracted here once both needed it,
 *  rather than each keeping its own copy. */
export async function resolveLessonCourse(lessonId: string): Promise<{ courseId: string; moduleId: string } | null> {
  const lesson = await LessonRepository.findById(lessonId);
  if (!lesson) return null;
  const courseModule = await ModuleRepository.findById(lesson.moduleId);
  if (!courseModule) return null;
  return { courseId: courseModule.courseId, moduleId: courseModule.id };
}

/** Same "compose via extra reads" pattern as `resolveLessonCourse`, one
 *  hop further up: `quiz -> lesson -> module -> course`. Shared by
 *  `QuizService.updateOwn` and `QuizQuestionService`'s `*Own` methods
 *  (Phase 6, Step 6.5) to reach the owning course for
 *  `requireOwnCourseAccess`, and for audit-log anchoring. */
export async function resolveQuizCourse(
  quizId: string,
): Promise<{ courseId: string; moduleId: string; lessonId: string } | null> {
  const quiz = await QuizRepository.findById(quizId);
  if (!quiz) return null;
  const owner = await resolveLessonCourse(quiz.lessonId);
  if (!owner) return null;
  return { ...owner, lessonId: quiz.lessonId };
}

/** One hop further still: `question -> quiz -> lesson -> module ->
 *  course`. Shared by `QuizQuestionService`'s `updateOwn`/`deleteOwn`
 *  (which only have the question id to start from). */
export async function resolveQuizQuestionCourse(
  questionId: string,
): Promise<{ courseId: string; moduleId: string; lessonId: string; quizId: string } | null> {
  const question = await QuizQuestionRepository.findById(questionId);
  if (!question) return null;
  const owner = await resolveQuizCourse(question.quizId);
  if (!owner) return null;
  return { ...owner, quizId: question.quizId };
}
