import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

const BLOG_MANAGEMENT_ROLES = ["admin", "super_admin"] as const;

/**
 * The one authorization check every Blog domain **mutation** calls first —
 * reads are intentionally unrestricted (the public blog needs to read
 * published articles without being an admin). Mirrors
 * `courses/utils/require-course-access.ts`'s exact shape/precedent — its
 * own domain-named gate rather than reusing `requireCourseManagementAccess`
 * directly, since articles aren't catalog content and this gate can evolve
 * independently (e.g. a future "guest author" role).
 */
export async function requireBlogManagementAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, [...BLOG_MANAGEMENT_ROLES])) {
    return null;
  }
  return user;
}

const BLOG_AUTHOR_ROLES = ["instructor", "admin", "super_admin"] as const;

/**
 * The wider gate for *authoring* (create/edit/publish own articles from
 * the public blog, no Admin Panel needed): Instructors are authors too,
 * but only over their own articles — `ArticleService` pairs this gate
 * with an ownership check on every non-admin mutation, the same
 * "owner-scoped methods next to admin-management ones" convention
 * `CourseService.updateOwn` established.
 */
export async function requireBlogAuthorAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, [...BLOG_AUTHOR_ROLES])) {
    return null;
  }
  return user;
}

/** Whether this user manages the whole blog (any article, curation flags)
 *  rather than only their own posts. */
export function isBlogManager(user: AuthUser): boolean {
  return isRoleAllowed(user.role, [...BLOG_MANAGEMENT_ROLES]);
}
