/**
 * The Commerce Domain's own counterpart to `courses/types/result.ts`'s
 * `CourseActionResult` / `learning/types/result.ts`'s
 * `LearningActionResult` — same shape, its own error vocabulary, per
 * this codebase's one-result-type-per-domain convention.
 */
export type CommerceErrorCode =
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "unavailable"
  | "unknown";

export type CommerceActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: CommerceErrorCode; message: string };
