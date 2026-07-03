import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

const INSTRUCTOR_MANAGEMENT_ROLES = ["admin", "super_admin"] as const;

/**
 * The one authorization check every Instructor Application **management**
 * mutation calls first (listing/approving/rejecting applications) —
 * mirrors `commerce/utils/require-commerce-access.ts`'s
 * `requireCommerceManagementAccess` exactly, its own domain-named
 * function per that file's own precedent. Reviewing/deciding an
 * application is Admin/Super-Admin-only (docs/roles-and-permissions.md
 * §2: "Approve/reject Instructor applications" is a ✅ Admin/Super Admin
 * capability, nobody else's).
 */
export async function requireInstructorManagementAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, [...INSTRUCTOR_MANAGEMENT_ROLES])) {
    return null;
  }
  return user;
}
