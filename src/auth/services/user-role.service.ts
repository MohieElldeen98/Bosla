import { ProfileRepository } from "@/auth/repositories/profile.repository";
import { UserRoleAdminRepository } from "@/auth/repositories/user-role-admin.repository";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { logger } from "@/lib/logger";
import type { Role } from "@/auth/types/role";
import type { AuthUser } from "@/auth/types/session";
import type { UserRoleActionResult } from "@/auth/types/user-role-result";

/**
 * Every `UserRoleAdminRepository`/`ProfileRepository` call here can throw
 * (Admin API unreachable, `DATABASE_URL` missing) — one wrapper instead of
 * a try/catch repeated per branch, mirroring `ProfileService`'s
 * `safeMutation`.
 */
async function safeMutation<T>(
  operation: () => Promise<UserRoleActionResult<T>>,
): Promise<UserRoleActionResult<T>> {
  try {
    return await operation();
  } catch (error) {
    logger.error("[UserRoleService]", error);
    return {
      success: false,
      code: "unknown",
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

/**
 * The **only** place either `auth.users.app_metadata.role` or
 * `profiles.role` should be written for an existing user — bootstrap's
 * initial `student` default (`ProfileRepository.create`) is a separate,
 * unrelated concern, not a role *change*. Keeps the two representations in
 * sync: `app_metadata.role` is the JWT/route-guard source of truth
 * (`lib/auth/get-role-from-user.ts`), `profiles.role` is the queryable
 * database mirror (search, display, joins) — see
 * docs/authentication-architecture.md §16.
 *
 * Server-only (transitively imports the Supabase service-role client via
 * `UserRoleAdminRepository`) — never call this from a Client Component;
 * a future Admin UI calls it through a `"use server"` action, same as
 * every other CMS/Profile mutation in this codebase.
 *
 * "Atomic" here means best-effort-with-compensation, not a single
 * database transaction — `app_metadata` (Supabase Auth) and `profiles`
 * (Postgres via Drizzle) are two independent systems with no shared
 * transaction coordinator. The order is deliberate: `app_metadata` (the
 * guard-authoritative value) is written first; if the `profiles` write
 * then fails, `app_metadata` is rolled back to its previous value so the
 * two never observably diverge once this function returns. If the
 * rollback itself fails (rare — the same Admin API call that just
 * succeeded), that's reported as a distinct `sync_failed` case that needs
 * a human to reconcile, not silently swallowed.
 */
export const UserRoleService = {
  async updateUserRole(
    actingUser: AuthUser | "system",
    targetUserId: string,
    role: Role,
  ): Promise<UserRoleActionResult<{ userId: string; role: Role }>> {
    return safeMutation(async () => {
      if (actingUser !== "system" && !isRoleAllowed(actingUser.role, ["super_admin"])) {
        return { success: false, code: "forbidden", message: "Only a Super Admin can change user roles." };
      }

      const previousRole = await UserRoleAdminRepository.getAppMetadataRole(targetUserId);
      if (previousRole === null) {
        return { success: false, code: "not_found", message: "User not found." };
      }

      if (previousRole === role) {
        // Already in sync — still worth writing profiles.role in case it
        // had drifted (exactly the failure mode this service exists to
        // prevent), but no rollback bookkeeping is needed either way.
        const alreadySynced = await ProfileRepository.update(targetUserId, { role });
        if (!alreadySynced) {
          return { success: false, code: "not_found", message: "User profile not found." };
        }
        return { success: true, data: { userId: targetUserId, role } };
      }

      const appMetadataUpdated = await UserRoleAdminRepository.setAppMetadataRole(targetUserId, role);
      if (!appMetadataUpdated) {
        return {
          success: false,
          code: "unknown",
          message: "Could not update the user's authentication role.",
        };
      }

      const profile = await ProfileRepository.update(targetUserId, { role }).catch((error) => {
        logger.error("[UserRoleService.updateUserRole] profiles.role update threw", error);
        return null;
      });

      if (!profile) {
        const rolledBack = await UserRoleAdminRepository.setAppMetadataRole(targetUserId, previousRole);
        if (!rolledBack) {
          logger.error(
            `[UserRoleService.updateUserRole] CRITICAL: user ${targetUserId} now has ` +
              `app_metadata.role="${role}" but profiles.role was not updated and the rollback to ` +
              `"${previousRole}" also failed — the two are now out of sync and need manual reconciliation.`,
          );
          return {
            success: false,
            code: "sync_failed",
            message:
              "Role update failed and could not be rolled back automatically. The account may be in an inconsistent state — contact an engineer.",
          };
        }
        return {
          success: false,
          code: "sync_failed",
          message: "Could not update the stored profile role; the change was rolled back.",
        };
      }

      return { success: true, data: { userId: targetUserId, role } };
    });
  },
};
