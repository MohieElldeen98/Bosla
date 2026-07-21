/** The Contact domain's action-result vocabulary — same shape as every
 *  other domain's own copy (`CmsActionResult`, `PaymentActionResult`, …),
 *  never shared across domains. */
export type ContactErrorCode = "forbidden" | "not_found" | "validation_failed" | "rate_limited" | "unknown";

export type ContactActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: ContactErrorCode; message: string };
