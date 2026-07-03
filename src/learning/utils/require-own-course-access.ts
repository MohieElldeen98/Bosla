import { CourseService } from "@/courses/services/course.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";
import type { Course } from "@/courses/types/course";

export type OwnCourseAccessResult =
  | { ok: true; course: Course }
  | { ok: false; code: "forbidden"; message: string };

/**
 * The one authorization check every Instructor-owned curriculum mutation
 * (Module/Lesson/Quiz, Phase 6 Step 6.4) calls first — reuses
 * `CourseService.getOwnById` as the single source of truth for "does
 * this course belong to this signed-in Instructor," the exact check
 * Step 6.3 already established for the course itself. Curriculum
 * content has no ownership of its own — it inherits the course's, so
 * this is the one place that check lives, not duplicated per
 * Module/Lesson/Quiz service.
 *
 * `requireDraft: true` additionally enforces
 * docs/roles-and-permissions.md §2's "Author/edit own courses
 * (**draft**)" — the same rule Step 6.3 applied to the course's own
 * fields now applies to its curriculum too: once submitted for review,
 * an Instructor can still *view* their curriculum (reads don't pass this
 * option) but can no longer change it until it's back in `draft`.
 *
 * Deliberately collapses "course doesn't exist" and "course exists but
 * isn't yours" into the same `forbidden` — matching `getOwnById`'s own
 * "can't tell those apart and shouldn't" reasoning, so an Instructor
 * probing another course's id learns nothing from the response.
 */
export async function requireOwnCourseAccess(
  actingUser: AuthUser,
  courseId: string,
  options?: { requireDraft?: boolean },
): Promise<OwnCourseAccessResult> {
  if (!isRoleAllowed(actingUser.role, ["instructor"])) {
    return { ok: false, code: "forbidden", message: "You can only manage your own course's curriculum." };
  }
  const course = await CourseService.getOwnById(actingUser, courseId);
  if (!course) {
    return { ok: false, code: "forbidden", message: "You can only manage your own course's curriculum." };
  }
  if (options?.requireDraft && course.status !== "draft") {
    return {
      ok: false,
      code: "forbidden",
      message: "Curriculum can only be edited while the course is a draft.",
    };
  }
  return { ok: true, course };
}
