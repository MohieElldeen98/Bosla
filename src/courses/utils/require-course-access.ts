import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

const COURSE_MANAGEMENT_ROLES = ["admin", "super_admin"] as const;

/**
 * The one authorization check every Course Domain **mutation** calls
 * first — reads are intentionally unrestricted (a future public catalog
 * needs to read published courses without being an admin). Mirrors
 * `cms/utils/require-cms-access.ts`'s exact shape/precedent — its own
 * domain-named function rather than reusing `requireCmsAccess` directly,
 * since courses aren't CMS content and this gate is meant to evolve
 * independently (Phase 6 adds Instructor-scoped access to their own
 * courses; that doesn't belong on the CMS gate).
 *
 * Admin-only for now, matching docs/roadmap.md's Phase 3 scope note: the
 * catalog is curated by an Admin via direct data seeding, not yet through
 * an Instructor Panel (which doesn't exist until Phase 6).
 */
export async function requireCourseManagementAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, [...COURSE_MANAGEMENT_ROLES])) {
    return null;
  }
  return user;
}
