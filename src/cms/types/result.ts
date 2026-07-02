/**
 * The CMS-domain counterpart of `auth/types/result.ts`'s `AuthActionResult`
 * / `auth/types/profile-result.ts`'s `ProfileActionResult` — same shape,
 * its own error vocabulary.
 */
export type CmsErrorCode =
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "unknown";

export type CmsActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: CmsErrorCode; message: string };
