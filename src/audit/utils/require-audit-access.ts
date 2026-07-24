import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

/**
 * The one authorization check `AuditFeedService.search` calls first —
 * Super-Admin-only, matching `/admin/users`/`/admin/settings`/
 * `/admin/jobs`'s own bracket (docs/roles-and-permissions.md §3): a
 * merged cross-domain audit feed surfaces revenue movements, refund
 * reasons, and every other admin's actions, which is at least as
 * sensitive as anything else already restricted to Super Admin. Mirrors
 * `requireCmsAccess`'s exact shape (reuses `SessionService`/
 * `role.utils`, no separate audit-specific auth logic), just with the
 * narrower role set.
 */
export async function requireAuditAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, ["super_admin"])) {
    return null;
  }
  return user;
}
