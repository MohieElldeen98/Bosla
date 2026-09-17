import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

const NEWSLETTER_MANAGEMENT_ROLES = ["admin", "super_admin"] as const;

/** Gate for everything in this domain except the public `subscribe` —
 *  mirrors `requireContactAccess` exactly (same roles, same shape). The
 *  subscriber list is personal data: unlike most domains here, its READS
 *  are gated too, not just its mutations. */
export async function requireNewsletterAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, [...NEWSLETTER_MANAGEMENT_ROLES])) {
    return null;
  }
  return user;
}
