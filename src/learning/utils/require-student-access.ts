import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

/**
 * The single authorization check for every student-owned activity record
 * (Enrollments, Lesson Progress, Quiz Attempts) — mirrors
 * `auth/utils/can-modify-profile.ts`'s `canModifyProfile` exactly, same
 * reasoning: a student can always read/write their own activity; only
 * `admin`/`super_admin` can act on someone else's (e.g. an Admin
 * reviewing a student's progress). A future Student Dashboard and a
 * future Admin Panel screen call the exact same service methods, just
 * with a different `actingUser`, never a separate code path.
 *
 * Deliberately distinct from `courses/utils/require-course-access.ts`'s
 * `requireCourseManagementAccess` (admin-only, no self-access concept) —
 * that one gates *course content authoring* (Modules/Lessons/Quizzes,
 * reused as-is by this domain's content-side services); this one gates
 * *a specific student's own data*.
 */
export function canAccessStudentData(actingUser: AuthUser, targetStudentId: string): boolean {
  if (actingUser.id === targetStudentId) return true;
  return isRoleAllowed(actingUser.role, ["admin", "super_admin"]);
}
