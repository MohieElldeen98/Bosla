import type { EnrollmentStatus } from "@/learning/types/enrollment-status";

/** The Instructor Students page's (`/instructor/students`, Phase 6,
 *  Step 6.6) own read-model — one row per enrollment in one of the
 *  signed-in Instructor's own courses, composed from `Enrollment` +
 *  `Profile` + `Course` + a computed `lesson_progress` percentage. Never
 *  includes another Instructor's students — see
 *  `EnrollmentService.listForInstructor`'s doc comment for how that's
 *  enforced. */
export interface InstructorStudentListItem {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  status: EnrollmentStatus;
  progressPercentage: number;
  enrolledAt: string;
}
