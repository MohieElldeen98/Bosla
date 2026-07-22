import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

/**
 * The one authorization check every `/admin/jobs` **mutation** (retry,
 * delete) calls first. Super-Admin-only, not the usual admin/super_admin
 * pair `requireCmsAccess`-style checks use elsewhere — this page exposes
 * raw internal system state (payload ids, stack-trace-shaped error
 * messages) for operational debugging, the same sensitivity bracket as
 * `/admin/users`/`/admin/settings` (see `admin-nav.ts`'s `superAdminOnly`
 * items). The page itself is *also* guarded this way via `requireRole`
 * in its own `page.tsx` — this second check is what stops the Server
 * Actions from being reachable by a plain Admin who calls them directly,
 * bypassing the page-level guard entirely.
 */
export async function requireJobsAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, ["super_admin"])) {
    return null;
  }
  return user;
}
