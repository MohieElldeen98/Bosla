import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

const CONTACT_MANAGEMENT_ROLES = ["admin", "super_admin"] as const;

/** The one authorization check every Contact domain **mutation** except
 *  the public submit calls first — mirrors `requireCmsAccess` exactly
 *  (same roles, same "reads unrestricted, mutations gated" split isn't
 *  applicable here since there's exactly one public write, `submit`,
 *  which intentionally has no auth check at all — anyone, signed in or
 *  not, can reach the contact form). */
export async function requireContactAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, [...CONTACT_MANAGEMENT_ROLES])) {
    return null;
  }
  return user;
}
