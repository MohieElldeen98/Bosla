import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

/** The Certificates domain's own copy of `canAccessStudentData`
 *  (`learning/utils/require-student-access.ts`, `commerce/utils/
 *  require-student-access.ts`) — a learner can always read their own
 *  certificates; only admin/super_admin can read someone else's. */
export function canAccessStudentData(actingUser: AuthUser, targetStudentId: string): boolean {
  if (actingUser.id === targetStudentId) return true;
  return isRoleAllowed(actingUser.role, ["admin", "super_admin"]);
}
