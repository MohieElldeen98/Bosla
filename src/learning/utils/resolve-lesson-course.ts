import { LessonRepository } from "@/learning/repositories/lesson.repository";
import { ModuleRepository } from "@/learning/repositories/module.repository";

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
