/** The Certificates domain's own `ActionResult`, per this codebase's
 *  one-result-type-per-domain convention (`payments/types/result.ts`,
 *  `commerce/types/result.ts`, …). */
export type CertificateErrorCode = "forbidden" | "not_found" | "validation_failed" | "unknown";

export type CertificateActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: CertificateErrorCode; message: string };
