/**
 * The Blog domain's own counterpart to `courses/types/result.ts`'s
 * `CourseActionResult` — same shape, its own copy, per this codebase's
 * convention of one result type per domain rather than a shared
 * cross-domain type.
 */
export type BlogErrorCode = "forbidden" | "not_found" | "validation_failed" | "conflict" | "unknown";

export type BlogActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: BlogErrorCode; message: string };
