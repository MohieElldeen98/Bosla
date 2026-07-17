import type { PlayerModuleSummary } from "@/learning/types/course-player";
import type {
  CurriculumLessonKind,
  CurriculumLessonState,
  CurriculumTree,
} from "@/learning/types/curriculum-tree";
import type { LessonType } from "@/learning/types/lesson-type";

const LESSON_KIND_BY_TYPE: Record<LessonType, CurriculumLessonKind> = {
  video: "video",
  reading: "text",
  quiz: "quiz",
};

/**
 * Adapts the player's own module summaries onto the frozen CurriculumTree
 * contract (src/learning/types/curriculum-tree.ts) so the sidebar renders
 * the ONE tree component in learning mode instead of a parallel tree.
 * Lesson state is per-viewer: the lesson being watched is "current",
 * finished ones "completed", everything else "available" — never
 * "locked", which exists only for the details page's not-enrolled rows.
 */
export function toLearningCurriculumTree(
  modules: PlayerModuleSummary[],
  currentLessonId: string,
): CurriculumTree {
  const treeModules = modules.map((courseModule) => {
    const lessons = courseModule.lessons.map((lesson) => {
      const state: CurriculumLessonState =
        lesson.id === currentLessonId ? "current" : lesson.completed ? "completed" : "available";
      return {
        id: lesson.id,
        title: lesson.title,
        position: lesson.position,
        durationSeconds: lesson.durationSeconds,
        kind: LESSON_KIND_BY_TYPE[lesson.type],
        isPreview: lesson.isPreview,
        state,
      };
    });
    return {
      id: courseModule.id,
      title: courseModule.title,
      position: courseModule.position,
      lessons,
      lessonCount: lessons.length,
      totalDurationSeconds: lessons.reduce((total, lesson) => total + (lesson.durationSeconds ?? 0), 0),
    };
  });

  return {
    modules: treeModules,
    moduleCount: treeModules.length,
    lessonCount: treeModules.reduce((total, courseModule) => total + courseModule.lessonCount, 0),
    totalDurationSeconds: treeModules.reduce(
      (total, courseModule) => total + courseModule.totalDurationSeconds,
      0,
    ),
  };
}
