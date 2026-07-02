/**
 * The Profile-domain counterpart of `auth/types/result.ts`'s
 * `AuthActionResult` — same shape, its own error vocabulary, since
 * "forbidden"/"not_found"/"validation_failed" are profile-specific
 * concerns that don't belong in `AuthErrorCode`.
 */
export type ProfileErrorCode = "forbidden" | "not_found" | "validation_failed" | "unknown";

export type ProfileActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: ProfileErrorCode; message: string };
