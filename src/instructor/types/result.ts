/**
 * The Instructor Domain's own counterpart to `commerce/types/result.ts`'s
 * `CommerceActionResult` — same shape, its own error vocabulary, per
 * this codebase's one-result-type-per-domain convention.
 */
export type InstructorErrorCode =
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "unknown";

export type InstructorActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: InstructorErrorCode; message: string };
