import { redirect } from "@/i18n/navigation";
import { requireAuth } from "@/auth/guards/require-auth";
import { isRoleAllowed, getDefaultRedirectPath } from "@/auth/utils/role.utils";
import type { Locale } from "@/i18n/routing";
import type { Role } from "@/auth/types/role";
import type { AuthUser } from "@/auth/types/session";

/**
 * Guards a role-scoped route group ((student)/(instructor)/(admin)/
 * (super-admin)). Ensures auth first, then redirects to the user's own
 * default surface if their role isn't in `allowedRoles` — a Student hitting
 * `/admin` lands on `/dashboard`, not an error page.
 */
export async function requireRole(locale: Locale, allowedRoles: Role[]): Promise<AuthUser> {
  const user = await requireAuth(locale);
  if (!isRoleAllowed(user.role, allowedRoles)) {
    redirect({ href: getDefaultRedirectPath(user.role), locale });
  }
  return user;
}

export type RoleGuardResult = { allowed: true; user: AuthUser } | { allowed: false };

/**
 * Same authentication/role check as `requireRole` (reuses `requireAuth` and
 * `isRoleAllowed` — no duplicated logic), but for route groups where a
 * signed-in user with the wrong role should see an explicit Forbidden state
 * instead of being silently redirected to their own surface — the Admin
 * Panel (`(admin)/layout.tsx`), since a Student/Instructor reaching `/admin`
 * is a meaningfully different case from "wrong dashboard for my role."
 * Unauthenticated visitors still redirect to sign-in via `requireAuth`.
 */
export async function requireRoleOrForbidden(
  locale: Locale,
  allowedRoles: Role[],
): Promise<RoleGuardResult> {
  const user = await requireAuth(locale);
  if (!isRoleAllowed(user.role, allowedRoles)) {
    return { allowed: false };
  }
  return { allowed: true, user };
}
