import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

const PAYMENT_MANAGEMENT_ROLES = ["admin", "super_admin"] as const;

/**
 * The Payment Platform's management gate — every money-moving admin
 * mutation (refund/capture/void) and the payments dashboard's reads
 * call this first. Own domain-named copy per the same precedent
 * `requireCommerceManagementAccess` cites; the role set matches
 * docs/roles-and-permissions.md §2's "process refunds" row.
 */
export async function requirePaymentManagementAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, [...PAYMENT_MANAGEMENT_ROLES])) {
    return null;
  }
  return user;
}
