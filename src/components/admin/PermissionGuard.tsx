import type { ReactNode } from "react";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { Role } from "@/auth/types/role";

/**
 * Gates a piece of UI (not a route — that's `requireRole`/
 * `requireRoleOrForbidden` in `src/auth/guards/`) by role, e.g. hiding a
 * super-admin-only sidebar item from a plain Admin. Reuses `isRoleAllowed`
 * — no separate permission logic. This is presentation only; the actual
 * security boundary is always the page-level guard, per
 * docs/architecture.md §7 ("route groups enforce access, not conditional
 * UI").
 */
export function PermissionGuard({
  userRole,
  allowedRoles,
  children,
  fallback = null,
}: {
  userRole: Role;
  allowedRoles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return isRoleAllowed(userRole, allowedRoles) ? children : fallback;
}
