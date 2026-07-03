import { SessionService } from "@/auth/services/session.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

const COMMERCE_MANAGEMENT_ROLES = ["admin", "super_admin"] as const;

/**
 * The one authorization check every Commerce Domain **management**
 * mutation calls first (viewing/refunding/cancelling any order, creating/
 * editing/deactivating a coupon) — mirrors `courses/utils/
 * require-course-access.ts`'s `requireCourseManagementAccess` exactly,
 * its own domain-named function per that file's own precedent (meant to
 * evolve independently — Phase 6 adds Instructor-scoped coupon creation,
 * which doesn't belong on this gate, matching
 * docs/roles-and-permissions.md §2: "Create coupons scoped to own
 * courses" is a 🔶 Instructor capability, not Admin/Super Admin's ✅ any-
 * scope one this gate covers). Checkout/order-history reads for a
 * student's *own* purchases are a different, student-owned-data concern
 * — see `learning/utils/require-student-access.ts`'s `canAccessStudentData`,
 * reused as-is for those, not this gate.
 */
export async function requireCommerceManagementAccess(): Promise<AuthUser | null> {
  const user = await SessionService.getCurrentUser();
  if (!user || !isRoleAllowed(user.role, [...COMMERCE_MANAGEMENT_ROLES])) {
    return null;
  }
  return user;
}
