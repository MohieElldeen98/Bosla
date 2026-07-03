/**
 * The Student Learning Domain's own counterpart to `courses/types/result.ts`'s
 * `CourseActionResult` / `cms/types/result.ts`'s `CmsActionResult` — same
 * shape, its own error vocabulary, per this codebase's convention of one
 * result type per domain rather than a shared cross-domain type.
 */
export type LearningErrorCode = "forbidden" | "not_found" | "validation_failed" | "conflict" | "unknown";

export type LearningActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: LearningErrorCode; message: string };
