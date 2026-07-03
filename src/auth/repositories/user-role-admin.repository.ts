import { logger } from "@/lib/logger";
import { DEFAULT_ROLE, isRole, type Role } from "@/auth/types/role";

/**
 * The only place `auth.users.app_metadata.role` is ever read or written —
 * via the Supabase Admin API, the sole supported way to touch
 * `app_metadata` (never writable by the signed-in user themselves, even
 * via their own session — see `lib/auth/get-role-from-user.ts`). Thin
 * pass-through, same convention as `auth.repository.ts`: no business logic
 * here, that's `UserRoleService`'s job.
 *
 * `createAdminClient` is imported *inside* each method, not at module
 * top-level — same reasoning as `AuthAdminRepository`'s identical
 * comment: `UserRoleService` imports this repository, and Phase 6's
 * `InstructorApplicationService.approve` imports `UserRoleService`
 * transitively. A top-level import of `@/lib/supabase/admin` (which
 * starts with `import "server-only"`) would make merely *importing*
 * `InstructorApplicationService` throw outside a real Next.js server
 * context — including in `tsx`-run verification scripts.
 */
export const UserRoleAdminRepository = {
  /** `null` means the user doesn't exist (or the Admin client couldn't be
   *  constructed) — distinct from "exists but has no role set yet", which
   *  resolves to `DEFAULT_ROLE`, matching `getRoleFromUser`'s own fallback. */
  async getAppMetadataRole(userId: string): Promise<Role | null> {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    if (!admin) return null;

    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      logger.error("[UserRoleAdminRepository.getAppMetadataRole]", error);
      return null;
    }

    const role = data.user.app_metadata?.role;
    return isRole(role) ? role : DEFAULT_ROLE;
  },

  async setAppMetadataRole(userId: string, role: Role): Promise<boolean> {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    if (!admin) return false;

    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    });
    if (error) {
      logger.error("[UserRoleAdminRepository.setAppMetadataRole]", error);
      return false;
    }
    return true;
  },
};
