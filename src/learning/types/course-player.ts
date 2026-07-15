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

/** A quiz question as the Quiz Player (Step 4.5) may see it —
 *  deliberately missing `correctChoiceIndex`. This is the type that
 *  reaches a Client Component's props (and therefore the page's
 *  serialized RSC payload), so leaving the answer key off it isn't just
 *  a UI nicety, it's the only thing standing between "hidden until you
 *  submit" and "visible via view-source." Grading itself happens
 *  server-side in `QuizAttemptService.submit`, against the real
 *  `QuizQuestion` rows, which never leave the server. */
export interface PlayerQuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
}

/** The result of the student's most recent attempt at this quiz, if
 *  any — lets the player show "you already passed/failed this, here's
 *  your score" instead of a blank form on revisit, and drives the
 *  Retake affordance (retakes are allowed by the existing `quiz_attempts`
 *  schema design — no unique `(quiz, student)` constraint). */
export interface PlayerQuizAttemptResult {
  id: string;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
}

export interface PlayerQuizData {
  id: string;
  passThresholdPercent: number;
  questions: PlayerQuizQuestion[];
  latestAttempt: PlayerQuizAttemptResult | null;
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
    videoUrl: string | null;
    durationSeconds: number | null;
    isPreview: boolean;
    completed: boolean;
    positionSeconds: number;
    /** Only populated for `type: "quiz"` lessons that already have a
     *  `Quiz` row with at least one question authored — `null` otherwise
     *  (no Curriculum Editor exists yet to author quiz content, so this
     *  is the common case today; the player falls back to the existing
     *  "quiz coming soon" placeholder). */
    quiz: PlayerQuizData | null;
  };
  previousLesson: PlayerLessonNeighbor | null;
  nextLesson: PlayerLessonNeighbor | null;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}
