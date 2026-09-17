/** The Newsletter domain's action-result vocabulary — same shape as every
 *  other domain's own copy (`ContactActionResult`, `CmsActionResult`, …),
 *  never shared across domains. */
export type NewsletterErrorCode =
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "rate_limited"
  | "unknown";

export type NewsletterActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: NewsletterErrorCode; message: string };
