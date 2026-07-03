"use server";

import { UserRoleService } from "@/auth/services/user-role.service";
import { ProfileService } from "@/auth/services/profile.service";
import { SessionService } from "@/auth/services/session.service";
import { isRole, type Role } from "@/auth/types/role";
import { isProfileStatus } from "@/auth/types/profile-status";
import type { Profile } from "@/auth/types/profile";
import type { ProfileActionResult } from "@/auth/types/profile-result";
import type { UserRoleActionResult } from "@/auth/types/user-role-result";

/** The admin User Details page's (Phase 7) role-change control. Resolves
 *  the session itself (a Server Action is the trust boundary) and hands
 *  off entirely to `UserRoleService.updateUserRole` — that service is
 *  the *only* place either `app_metadata.role` or `profiles.role` is
 *  ever written, so this action does no role logic of its own. */
export async function updateUserRoleAction(
  targetUserId: string,
  role: string,
): Promise<UserRoleActionResult<{ userId: string; role: Role }>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  if (!isRole(role)) {
    return { success: false, code: "unknown", message: "Invalid role." };
  }
  return UserRoleService.updateUserRole(actingUser, targetUserId, role);
}

/** The admin User Details page's Activate/Suspend control — delegates to
 *  `ProfileService.setAccountStatus`, which enforces the `super_admin`
 *  check; this action only resolves the session and validates the raw
 *  status string. */
export async function setAccountStatusAction(
  targetUserId: string,
  status: string,
): Promise<ProfileActionResult<Profile>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  if (!isProfileStatus(status) || (status !== "active" && status !== "suspended")) {
    return { success: false, code: "validation_failed", message: "Invalid status." };
  }
  return ProfileService.setAccountStatus(actingUser, targetUserId, status);
}
