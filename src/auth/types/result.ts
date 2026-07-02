/**
 * Stable error codes for auth flows, so callers (and eventually UI copy)
 * branch on a fixed value instead of matching Supabase's free-text error
 * messages. See `auth/utils/map-supabase-error.ts` for how a raw Supabase
 * `AuthError` becomes one of these.
 */
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_verified"
  | "email_already_registered"
  | "weak_password"
  | "expired_token"
  | "rate_limited"
  | "unknown";

/**
 * The uniform return shape for every auth operation (`AuthService` methods,
 * called by `auth/actions/*`). Never throws — see `AuthService`'s
 * `runAuthOperation`, which converts any thrown error into a `success:
 * false` result instead. `ProfileActionResult` (`auth/types/profile-
 * result.ts`) is the equivalent shape for the Profile domain.
 */
export type AuthActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: AuthErrorCode; message: string };
