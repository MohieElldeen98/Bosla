/** Derived, not stored — computed from `completedLessons`/`totalLessons`
 *  (Student Dashboard, Step 4.3). A course with zero lessons (no
 *  curriculum authored yet — true for every course today, since the
 *  Curriculum Editor admin UI doesn't exist) is `"not_started"`, same as
 *  a course with lessons the student hasn't touched — there's nothing
 *  inconsistent about that: 0 of 0 complete and 0 of N complete both
 *  mean "nothing to show as done yet." */
export const COURSE_COMPLETION_STATUSES = ["not_started", "in_progress", "completed"] as const;
export type CourseCompletionStatus = (typeof COURSE_COMPLETION_STATUSES)[number];

export function getCourseCompletionStatus(completedLessons: number, totalLessons: number): CourseCompletionStatus {
  if (totalLessons === 0 || completedLessons === 0) return "not_started";
  if (completedLessons >= totalLessons) return "completed";
  return "in_progress";
}

/** Shared by the Student Dashboard (Step 4.3) and the Course Player
 *  (Step 4.4) so both derive the same percentage from
 *  `lesson_progress` the same way. */
export function computeProgressPercentage(completedLessons: number, totalLessons: number): number {
  return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
}
