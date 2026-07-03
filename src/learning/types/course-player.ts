import type { LessonType } from "@/learning/types/lesson-type";

/** One lesson row inside the Course Player's (Step 4.4) modules sidebar —
 *  just enough to render the tree, highlight the current lesson, and show
 *  a completion checkmark. Full content (`body`/`videoAssetId`/
 *  `durationSeconds`) only travels in `PlayerLessonDetail`, for the one
 *  lesson actually being viewed. */
export interface PlayerLessonSummary {
  id: string;
  title: string;
  position: number;
  type: LessonType;
  isPreview: boolean;
  completed: boolean;
}

export interface PlayerModuleSummary {
  id: string;
  title: string;
  position: number;
  lessons: PlayerLessonSummary[];
}

/** A neighboring lesson reference for Previous/Next navigation — `null`
 *  at either end of the course's flattened lesson sequence. */
export interface PlayerLessonNeighbor {
  id: string;
  title: string;
}

/** The full data the Course Player page needs for one specific lesson:
 *  the sidebar tree (every module/lesson in the course, so the student can
 *  jump anywhere), the lesson actually being viewed (with real content),
 *  its neighbors, and the course's overall progress. Composed by
 *  `CoursePlayerService.getLessonPlayerData` from parallel repository
 *  reads, the same "no cross-domain SQL join" pattern
 *  `StudentDashboardService` already established. */
export interface CoursePlayerData {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  modules: PlayerModuleSummary[];
  currentLesson: {
    id: string;
    moduleId: string;
    title: string;
    type: LessonType;
    body: string | null;
    videoAssetId: string | null;
    durationSeconds: number | null;
    isPreview: boolean;
    completed: boolean;
  };
  previousLesson: PlayerLessonNeighbor | null;
  nextLesson: PlayerLessonNeighbor | null;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}
