/**
 * The Course Domain's own counterpart to `cms/types/result.ts`'s
 * `CmsActionResult` / `auth/types/result.ts`'s `AuthActionResult` — same
 * shape, its own error vocabulary, per this codebase's convention of one
 * result type per domain rather than a shared cross-domain type.
 */
export type CourseErrorCode = "forbidden" | "not_found" | "validation_failed" | "conflict" | "unknown";

export type CourseActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: CourseErrorCode; message: string };
