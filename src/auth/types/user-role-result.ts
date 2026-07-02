/**
 * The User Role-domain counterpart of `auth/types/result.ts`'s
 * `AuthActionResult` / `auth/types/profile-result.ts`'s
 * `ProfileActionResult` — same shape, its own error vocabulary.
 * `sync_failed` is specific to this domain: `UserRoleService.
 * updateUserRole` writes two independent systems (Supabase Auth
 * `app_metadata` and the `profiles` table) with no shared transaction, so
 * a failure partway through is a distinct, reportable case — not just
 * "unknown".
 */
export type UserRoleErrorCode = "forbidden" | "not_found" | "sync_failed" | "unknown";

export type UserRoleActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: UserRoleErrorCode; message: string };
