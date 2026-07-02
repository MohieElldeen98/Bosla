import { isRoleAllowed } from "@/auth/utils/role.utils";
import type { AuthUser } from "@/auth/types/session";

/**
 * The single authorization check for every profile mutation
 * (`ProfileService.updateProfile`/`softDeleteProfile`/`restoreProfile`) —
 * one place, reused everywhere, so "no duplicated checks" holds even as
 * more mutation methods are added. A user can always modify their own
 * profile; only `admin`/`super_admin` can override and modify someone
 * else's — the future Admin Panel calls the exact same `ProfileService`
 * methods as a user editing their own profile, just with a different
 * `actingUser`, never a separate code path.
 */
export function canModifyProfile(actingUser: AuthUser, targetUserId: string): boolean {
  if (actingUser.id === targetUserId) return true;
  return isRoleAllowed(actingUser.role, ["admin", "super_admin"]);
}
