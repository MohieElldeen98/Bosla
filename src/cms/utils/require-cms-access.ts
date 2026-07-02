import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

const CMS_EDITOR_ROLES = ["admin", "super_admin"] as const;

/**
 * The one authorization check every CMS **mutation** calls first — reads
 * (`getSections`, `getPage`, ...) are intentionally unrestricted, since a
 * future public page-rendering pipeline needs to read published content
 * without being an admin, exactly like `HomepageService.getSections` today
 * has no auth check. Reuses `SessionService`/`role.utils` — no separate
 * CMS-specific auth logic exists.
 */
export async function requireCmsAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, [...CMS_EDITOR_ROLES])) {
    return null;
  }
  return user;
}
