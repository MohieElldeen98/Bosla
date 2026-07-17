import type { CourseCardData } from "@/courses/types/course-card";
import type { CourseCompletionStatus } from "@/learning/types/course-completion-status";

/**
 * One enrolled-and-active course, resolved for the Student Dashboard
 * (Step 4.3) — an `Enrollment` plus the course/instructor names, cover
 * image, and computed progress, composed at the Service layer from
 * parallel repository reads (the same "no cross-domain SQL joins,
 * compose in the service" pattern `CourseService.searchResolved`/
 * `EnrollmentService.searchResolved` already established).
 */
export interface DashboardCourseItem {
  enrollmentId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  courseSubtitle: string | null;
  instructorName: string;
  coverImageUrl: string | null;
  totalLessons: number;
  completedLessons: number;
  /** 0–100, rounded to the nearest whole percent. */
  progressPercentage: number;
  completionStatus: CourseCompletionStatus;
  /** ISO timestamp of the student's most recent `lesson_progress` row
   *  for this course, or `null` if they haven't started any lesson yet. */
  lastActivityAt: string | null;
  /** The enrollment's `createdAt` — when access was granted. */
  enrolledAt: string;
  /** The next unfinished lesson in curriculum order (module position,
   *  then lesson position): the first lesson without a completed
   *  progress row — which is simply the first lesson for a course the
   *  student hasn't started. Both `null` once every lesson is complete;
   *  computed per request, never stored. */
  resumeLessonId: string | null;
  resumeLessonTitle: string | null;
  /** Display contract for the shared `CourseCard` — the dashboard renders
   *  the same card family as the catalog (one card, progress variant),
   *  so the service composes the card's own data shape here rather than
   *  the UI re-deriving it from enrollment fields. */
  card: CourseCardData;
}

export interface StudentDashboardData {
  /** Every active enrollment, newest-enrolled first. */
  courses: DashboardCourseItem[];
  /** A subset of `courses` — in-progress only, most-recently-active
   *  first, for the "Continue Learning" section. */
  continueLearning: DashboardCourseItem[];
}
