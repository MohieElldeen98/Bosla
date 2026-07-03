import { logger } from "@/lib/logger";

export interface UserIdentity {
  /** e.g. `"email"`, `"google"` — `auth.users.app_metadata.provider`,
   *  the provider the account originally signed up with. `null` if the
   *  Admin API is unreachable or the field isn't set. */
  provider: string | null;
}

/**
 * Read-only Admin-API-backed identity lookups for the admin User Details
 * page (Phase 7) — "authentication provider," specifically, since that
 * lives only in Supabase Auth's `auth.users`, not `profiles` (which
 * already has everything else the User Management module needs,
 * including `lastLoginAt`, kept in sync by `ProfileService.recordLogin`
 * on every sign-in, password or OAuth). A sibling of
 * `UserRoleAdminRepository` (same `createAdminClient()` dependency, same
 * thin pass-through convention — no business logic here), not a method
 * on it: unrelated concern (identity display vs. role sync), kept in its
 * own repository per this codebase's one-repository-per-concern norm.
 *
 * `createAdminClient` is imported *inside* the method, not at module
 * top-level, deliberately: `ProfileService` imports this repository, and
 * `EnrollmentService`/`CoursePlayerService`/`QuizAttemptService` (Step
 * 4.4/4.5) all import `ProfileService` transitively. A top-level import
 * of `@/lib/supabase/admin` (which starts with `import "server-only"`)
 * would make merely *importing* any of those services throw outside a
 * real Next.js server context — including in `tsx`-run verification
 * scripts, which don't go through Next's bundler (the thing that
 * special-cases `server-only` into a no-op server-side). A dynamic
 * import defers that evaluation to when this method actually runs,
 * which is always still a real server context in production.
 */
export const AuthAdminRepository = {
  /** `null` means the user doesn't exist, or the Admin client couldn't
   *  be constructed (e.g. `SUPABASE_SERVICE_ROLE_KEY` unset in this
   *  environment) — callers treat this as "provider unknown," not an
   *  error, since it's a "nice to have" field the User Details page
   *  shows only "if available." */
  async getUserIdentity(userId: string): Promise<UserIdentity | null> {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    if (!admin) return null;

    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) {
      logger.error("[AuthAdminRepository.getUserIdentity]", error);
      return null;
    }

    const provider = data.user.app_metadata?.provider;
    return { provider: typeof provider === "string" ? provider : null };
  },
};
