/**
 * The Audit domain's own counterpart to `cms/types/result.ts`'s
 * `CmsActionResult` — same shape, its own narrower error vocabulary
 * (read-only: no `validation_failed`/`conflict` case applies), per this
 * codebase's convention of one result type per domain.
 */
export type AuditErrorCode = "forbidden" | "unknown";

export type AuditActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: AuditErrorCode; message: string };
