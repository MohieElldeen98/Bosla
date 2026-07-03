import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

/**
 * The Commerce Domain's own copy of `learning/utils/require-student-access.ts`'s
 * `canAccessStudentData` — same shape, same reasoning, kept separate per
 * this codebase's one-copy-per-domain convention (mirrors `auth`'s
 * `canModifyProfile` too). A student can always read/act on their own
 * orders/checkout; only `admin`/`super_admin` can act on someone else's
 * — which is exactly how a student's own "simulate successful payment"
 * click and an admin's "Mark as Paid" click end up calling the same
 * `OrderService.markPaid` through the same authorization check, never a
 * separate code path.
 */
export function canAccessStudentData(actingUser: AuthUser, targetStudentId: string): boolean {
  if (actingUser.id === targetStudentId) return true;
  return isRoleAllowed(actingUser.role, ["admin", "super_admin"]);
}
