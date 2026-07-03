import { ModuleRepository } from "@/learning/repositories/module.repository";
import { LessonRepository } from "@/learning/repositories/lesson.repository";
import { requireOwnCourseAccess } from "@/learning/utils/require-own-course-access";
import { safeRead } from "@/learning/utils/safe-operation";
import type { AuthUser } from "@/auth/types/session";
import type { CurriculumModule } from "@/learning/types/curriculum";

/**
 * Composes the Curriculum Builder's (`/instructor/courses/[id]/curriculum`,
 * Phase 6, Step 6.4) nested tree — every module for a course, each with
 * its own lessons, both already `position`-ordered. Batches the lesson
 * lookup across every module in one query
 * (`LessonRepository.findByModuleIds`) rather than one query per module,
 * the same "no N+1 across a course's modules" precedent
 * `StudentDashboardService` already established for its own module/
 * lesson composition. Raw (bilingual), not locale-resolved — see
 * `curriculum.ts`'s `CurriculumModule` doc comment for why.
 */
export const CurriculumService = {
  async getForInstructor(actingUser: AuthUser, courseId: string): Promise<CurriculumModule[]> {
    const access = await requireOwnCourseAccess(actingUser, courseId);
    if (!access.ok) return [];

    const modules = await safeRead(() => ModuleRepository.findByCourseId(courseId), []);
    const lessons = await safeRead(() => LessonRepository.findByModuleIds(modules.map((m) => m.id)), []);

    const lessonsByModuleId = new Map<string, typeof lessons>();
    for (const lesson of lessons) {
      const list = lessonsByModuleId.get(lesson.moduleId) ?? [];
      list.push(lesson);
      lessonsByModuleId.set(lesson.moduleId, list);
    }

    return modules.map((module) => ({
      ...module,
      lessons: (lessonsByModuleId.get(module.id) ?? []).sort((a, b) => a.position - b.position),
    }));
  },
};
