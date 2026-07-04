/**
 * The Notifications domain's own counterpart to `courses/types/result.ts`'s
 * `CourseActionResult` / `cms/types/result.ts`'s `CmsActionResult` — same
 * shape, its own error vocabulary, per this codebase's one-result-type-
 * per-domain convention.
 */
export type NotificationErrorCode = "forbidden" | "not_found" | "validation_failed" | "conflict" | "unknown";

export type NotificationActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: NotificationErrorCode; message: string };
